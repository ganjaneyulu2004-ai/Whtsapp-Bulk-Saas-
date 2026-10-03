import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    const body = await req.json();
    const { code, wabaId, phoneNumberId, directToken, displayPhoneNumber, verifiedName } = body;

    const metaAppId = process.env.META_APP_ID || "1083272431077581";
    const metaAppSecret = process.env.META_APP_SECRET || "d477617005728986436f6e65384f9ca5";
    const apiVersion = process.env.WA_API_VERSION || "v20.0";

    let finalToken = directToken;
    let finalPhoneNumber = displayPhoneNumber;
    let finalVerifiedName = verifiedName;
    let qualityRating = "GREEN";
    let messagingLimitTier = "TIER_250";

    // If OAuth code is provided, exchange it for access token with Meta Graph API
    if (code && !finalToken) {
      try {
        const tokenUrl = `https://graph.facebook.com/${apiVersion}/oauth/access_token?client_id=${metaAppId}&client_secret=${metaAppSecret}&code=${code}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();

        if (tokenData.access_token) {
          finalToken = tokenData.access_token;
        } else {
          console.warn("Could not exchange code with Meta:", tokenData);
        }
      } catch (tokenErr) {
        console.error("Token exchange error:", tokenErr);
      }
    }

    // Fallback to environment WA_TOKEN if needed during initial developer setup
    if (!finalToken && process.env.WA_TOKEN) {
      finalToken = process.env.WA_TOKEN;
    }

    const targetPhoneNumberId = phoneNumberId || process.env.WA_PHONE_NUMBER_ID;
    const targetWabaId = wabaId || process.env.WA_BUSINESS_ACCOUNT_ID;

    // Fetch phone number details from Meta Graph API if token & phone id are present
    if (finalToken && targetPhoneNumberId) {
      try {
        const phoneUrl = `https://graph.facebook.com/${apiVersion}/${targetPhoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`;
        const phoneRes = await fetch(phoneUrl, {
          headers: { Authorization: `Bearer ${finalToken}` },
        });
        const phoneData = await phoneRes.json();

        if (phoneData.display_phone_number) {
          finalPhoneNumber = phoneData.display_phone_number;
        }
        if (phoneData.verified_name) {
          finalVerifiedName = phoneData.verified_name;
        }
        if (phoneData.quality_rating) {
          qualityRating = phoneData.quality_rating;
        }
        if (phoneData.messaging_limit_tier) {
          messagingLimitTier = phoneData.messaging_limit_tier;
        }
      } catch (metaErr) {
        console.error("Error querying phone details from Meta:", metaErr);
      }
    }

    // Subscribe WABA to webhook notifications automatically
    if (finalToken && targetWabaId) {
      try {
        await fetch(`https://graph.facebook.com/${apiVersion}/${targetWabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${finalToken}` },
        });
      } catch (subErr) {
        console.error("Error subscribing WABA to app webhook:", subErr);
      }
    }

    // Update WhatsAppConfig for this user's business
    const config = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waToken: finalToken || undefined,
        waPhoneNumberId: targetPhoneNumberId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: apiVersion,
        metaAppId: metaAppId,
        isConnected: true,
        connectionMethod: "EMBEDDED_SIGNUP",
        displayPhoneNumber: finalPhoneNumber || "Connected Phone",
        verifiedName: finalVerifiedName || business.name,
        qualityRating: qualityRating,
        messagingLimitTier: messagingLimitTier,
        embeddedSignupAt: new Date(),
      },
      create: {
        businessId: business.id,
        waToken: finalToken,
        waPhoneNumberId: targetPhoneNumberId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: apiVersion,
        metaAppId: metaAppId,
        isConnected: true,
        connectionMethod: "EMBEDDED_SIGNUP",
        displayPhoneNumber: finalPhoneNumber || "Connected Phone",
        verifiedName: finalVerifiedName || business.name,
        qualityRating: qualityRating,
        messagingLimitTier: messagingLimitTier,
        embeddedSignupAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp Business Account connected successfully via Embedded Signup!",
      config: {
        isConnected: config.isConnected,
        displayPhoneNumber: config.displayPhoneNumber,
        verifiedName: config.verifiedName,
        qualityRating: config.qualityRating,
        messagingLimitTier: config.messagingLimitTier,
        connectionMethod: config.connectionMethod,
      },
    });
  } catch (err: any) {
    console.error("Embedded signup error:", err);
    return NextResponse.json({ error: err.message || "Failed to process embedded signup" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();

    await prisma.whatsAppConfig.update({
      where: { businessId: business.id },
      data: {
        isConnected: false,
        connectionMethod: "MANUAL",
        displayPhoneNumber: null,
        verifiedName: null,
      },
    });

    return NextResponse.json({ success: true, message: "WhatsApp Account disconnected." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
