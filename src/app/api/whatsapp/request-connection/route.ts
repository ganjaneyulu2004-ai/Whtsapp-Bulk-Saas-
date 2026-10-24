import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { brandName, phoneNumber } = body;

    if (!brandName || !brandName.trim()) {
      return NextResponse.json({ error: "Please enter your business or shop brand name" }, { status: 400 });
    }

    const cleanPhone = String(phoneNumber || "").replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Please enter a valid 10-digit mobile number" }, { status: 400 });
    }

    const formattedPhone = cleanPhone.length === 10 ? `+91 ${cleanPhone}` : `+${cleanPhone}`;
    const business = await getCurrentBusiness();

    // Update Business Name and Phone
    await prisma.business.update({
      where: { id: business.id },
      data: {
        name: brandName.trim(),
        phone: formattedPhone,
      },
    });

    // Update WhatsAppConfig to PENDING_ACTIVATION
    const config = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        displayPhoneNumber: formattedPhone,
        verifiedName: brandName.trim(),
        connectionMethod: "PENDING_ACTIVATION",
        isConnected: false,
      },
      create: {
        businessId: business.id,
        displayPhoneNumber: formattedPhone,
        verifiedName: brandName.trim(),
        connectionMethod: "PENDING_ACTIVATION",
        isConnected: false,
        messagingLimitTier: "TIER_250",
        qualityRating: "High (Green)",
        waApiVersion: "v20.0",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Connection request submitted! Admin will verify and activate your number via Meta OTP.",
      config: {
        displayPhoneNumber: config.displayPhoneNumber,
        verifiedName: config.verifiedName,
        connectionMethod: config.connectionMethod,
        isConnected: config.isConnected,
      },
    });
  } catch (err: any) {
    console.error("Error requesting WhatsApp connection:", err);
    return NextResponse.json({ error: err.message || "Failed to submit connection request" }, { status: 500 });
  }
}
