import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encryptToken, maskToken } from "@/lib/encryption";
import { getMetaGraphVersion } from "@/lib/meta-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access only." },
        { status: 403 }
      );
    }

    const businesses = await prisma.business.findMany({
      include: {
        user: {
          select: { username: true, role: true },
        },
        whatsappConfig: {
          select: {
            waPhoneNumberId: true,
            waBusinessAccountId: true,
            waToken: true,
            isConnected: true,
            displayPhoneNumber: true,
            verifiedName: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const items = businesses.map((b) => {
      const masked = maskToken(b.whatsappConfig?.waToken);
      const last4 = masked && masked.length >= 4 ? masked.slice(-4) : "";
      return {
        id: b.id,
        name: b.name,
        username: b.user.username,
        role: b.user.role,
        waPhoneNumberId: b.whatsappConfig?.waPhoneNumberId || "",
        waBusinessAccountId: b.whatsappConfig?.waBusinessAccountId || "",
        isConnected: Boolean(b.whatsappConfig?.isConnected),
        displayPhoneNumber: b.whatsappConfig?.displayPhoneNumber || "",
        hasToken: Boolean(b.whatsappConfig?.waToken),
        tokenLast4: last4,
      };
    });

    return NextResponse.json({ success: true, businesses: items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load businesses." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only platform administrators can set System User tokens." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const targetBusinessId = String(body?.businessId || "").trim();
    const rawToken = String(body?.waToken || "").trim();
    const targetPhoneId = String(body?.phoneNumberId || "").trim();
    const targetWabaId = String(body?.wabaId || "").trim();

    if (!targetBusinessId) {
      return NextResponse.json(
        { success: false, error: "Please select a Business." },
        { status: 400 }
      );
    }
    if (!targetPhoneId) {
      return NextResponse.json(
        { success: false, error: "Phone Number ID is required." },
        { status: 400 }
      );
    }
    if (!targetWabaId) {
      return NextResponse.json(
        { success: false, error: "WABA ID is required." },
        { status: 400 }
      );
    }
    if (!rawToken || rawToken.includes("...")) {
      return NextResponse.json(
        { success: false, error: "Please paste a valid Meta System User Access Token." },
        { status: 400 }
      );
    }

    const targetBusiness = await prisma.business.findUnique({
      where: { id: targetBusinessId },
      include: { whatsappConfig: true },
    });

    if (!targetBusiness) {
      return NextResponse.json(
        { success: false, error: "Selected business was not found." },
        { status: 404 }
      );
    }

    // 1. Ensure this phone_number_id is not already assigned to a different business
    const duplicateOwner = await prisma.whatsAppConfig.findFirst({
      where: {
        waPhoneNumberId: targetPhoneId,
        businessId: { not: targetBusiness.id },
      },
      include: {
        business: { select: { id: true, name: true } },
      },
    });

    if (duplicateOwner) {
      return NextResponse.json(
        {
          success: false,
          error: `Phone Number ID ${targetPhoneId} is already saved on another business ("${duplicateOwner.business.name}"). Remove or change it there first before reassigning.`,
        },
        { status: 409 }
      );
    }

    const existingConfig = targetBusiness.whatsappConfig;
    const version = getMetaGraphVersion(existingConfig?.waApiVersion);

    // 2. Verify token + phone_number_id directly via GET /{phone_number_id}
    const phoneUrl = `https://graph.facebook.com/${version}/${targetPhoneId}?fields=id,display_phone_number,verified_name,quality_rating,messaging_limit_tier`;
    const phoneRes = await fetch(phoneUrl, {
      headers: { Authorization: `Bearer ${rawToken}` },
    });
    const phoneData = await phoneRes.json();

    if (!phoneRes.ok || phoneData?.error) {
      const errMsg =
        phoneData?.error?.message ||
        phoneData?.error?.error_user_msg ||
        `Meta verification failed with HTTP ${phoneRes.status}`;
      return NextResponse.json(
        {
          success: false,
          error: `Token verification failed for Phone Number ID ${targetPhoneId}: ${errMsg}`,
        },
        { status: 400 }
      );
    }

    // 3. Verify that the returned phone_number_id actually belongs to the specified WABA ID
    const wabaPhonesUrl = `https://graph.facebook.com/${version}/${targetWabaId}/phone_numbers?fields=id,display_phone_number,verified_name&limit=100`;
    const wabaRes = await fetch(wabaPhonesUrl, {
      headers: { Authorization: `Bearer ${rawToken}` },
    });
    const wabaData = await wabaRes.json();

    if (!wabaRes.ok || wabaData?.error) {
      const errMsg =
        wabaData?.error?.message ||
        wabaData?.error?.error_user_msg ||
        `HTTP ${wabaRes.status}`;
      return NextResponse.json(
        {
          success: false,
          error: `Failed to verify WABA ${targetWabaId} with this token: ${errMsg}`,
        },
        { status: 400 }
      );
    }

    const phoneList: any[] = Array.isArray(wabaData?.data) ? wabaData.data : [];
    const matchedPhoneInWaba = phoneList.find((p) => String(p.id) === String(targetPhoneId));

    if (!matchedPhoneInWaba) {
      return NextResponse.json(
        {
          success: false,
          error: `Verification mismatch: Phone Number ID ${targetPhoneId} does not belong to WABA ${targetWabaId}.`,
        },
        { status: 400 }
      );
    }

    // 4. Encrypt using existing ENCRYPTION_KEY (never regenerates key)
    const encryptedToken = encryptToken(rawToken);
    if (!encryptedToken) {
      return NextResponse.json(
        { success: false, error: "Failed to encrypt token with ENCRYPTION_KEY." },
        { status: 500 }
      );
    }

    const resolvedDisplayPhone =
      phoneData.display_phone_number ||
      matchedPhoneInWaba.display_phone_number ||
      existingConfig?.displayPhoneNumber ||
      undefined;
    const resolvedVerifiedName =
      phoneData.verified_name ||
      matchedPhoneInWaba.verified_name ||
      existingConfig?.verifiedName ||
      targetBusiness.name;

    const updated = await prisma.whatsAppConfig.upsert({
      where: { businessId: targetBusiness.id },
      update: {
        waToken: encryptedToken,
        waPhoneNumberId: targetPhoneId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: version,
        displayPhoneNumber: resolvedDisplayPhone,
        verifiedName: resolvedVerifiedName,
        qualityRating: phoneData.quality_rating || existingConfig?.qualityRating || "GREEN",
        messagingLimitTier:
          phoneData.messaging_limit_tier || existingConfig?.messagingLimitTier || "TIER_250",
        isConnected: true,
        status: "CONNECTED",
      },
      create: {
        businessId: targetBusiness.id,
        waToken: encryptedToken,
        waPhoneNumberId: targetPhoneId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: version,
        displayPhoneNumber: resolvedDisplayPhone,
        verifiedName: resolvedVerifiedName,
        qualityRating: phoneData.quality_rating || "GREEN",
        messagingLimitTier: phoneData.messaging_limit_tier || "TIER_250",
        isConnected: true,
        status: "CONNECTED",
        connectionMethod: "MANUAL",
      },
    });

    const last4 = rawToken.slice(-4);

    return NextResponse.json({
      success: true,
      message: `Verified against WABA ${targetWabaId} (${resolvedDisplayPhone || targetPhoneId}) and saved AES-256 encrypted token for "${targetBusiness.name}".`,
      config: {
        businessId: targetBusiness.id,
        businessName: targetBusiness.name,
        waPhoneNumberId: updated.waPhoneNumberId,
        waBusinessAccountId: updated.waBusinessAccountId,
        displayPhoneNumber: updated.displayPhoneNumber,
        verifiedName: updated.verifiedName,
        isConnected: updated.isConnected,
        tokenLast4: last4,
      },
    });
  } catch (err: any) {
    console.error("[Admin System Token Error]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save System User token." },
      { status: 500 }
    );
  }
}
