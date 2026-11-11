import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { encryptToken, decryptToken, maskToken } from "@/lib/encryption";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
    });

    if (!config) {
      return NextResponse.json({
        config: {
          isConnected: false,
          connectionMethod: "NONE",
        },
      });
    }

    return NextResponse.json({
      config: {
        isConnected: !!config.isConnected,
        status: config.status || (config.isConnected ? "CONNECTED" : "DISCONNECTED"),
        displayPhoneNumber: config.displayPhoneNumber,
        verifiedName: config.verifiedName,
        qualityRating: config.qualityRating,
        messagingLimitTier: config.messagingLimitTier,
        connectionMethod: config.connectionMethod,
        waPhoneNumberId: config.waPhoneNumberId,
        waBusinessAccountId: config.waBusinessAccountId,
        maskedToken: maskToken(config.waToken),
        embeddedSignupAt: config.embeddedSignupAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    const body = await req.json();
    const { code, wabaId, phoneNumberId } = body;

    const metaAppId =
      process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID || "2068663130431385";
    const metaAppSecret = process.env.META_APP_SECRET;
    const apiVersion = process.env.WA_API_VERSION || "v21.0";

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required for Embedded Signup." },
        { status: 400 }
      );
    }

    if (!metaAppSecret || metaAppSecret === "from_meta_app_settings_basic") {
      console.error("[Embedded Signup Error] META_APP_SECRET is not configured in server environment.");
      return NextResponse.json(
        {
          error:
            "Meta App Secret is not configured on the server. Please set META_APP_SECRET in .env.",
        },
        { status: 500 }
      );
    }

    // 1. Exchange the temporary code for a long-lived Business Access Token
    console.log(`[Embedded Signup] Exchanging authorization code for Meta App ID ${metaAppId}...`);
    const tokenUrl = `https://graph.facebook.com/${apiVersion}/oauth/access_token?client_id=${metaAppId}&client_secret=${encodeURIComponent(
      metaAppSecret
    )}&code=${encodeURIComponent(code)}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Embedded Signup] Code exchange failed:", tokenData);
      const errCode = tokenData?.error?.code || tokenRes.status;
      const errMsg =
        tokenData?.error?.message ||
        tokenData?.error?.error_user_msg ||
        "Failed to exchange authorization code with Meta.";
      return NextResponse.json(
        { error: `Meta Authorization Error (${errCode}): ${errMsg}` },
        { status: 400 }
      );
    }

    const clientAccessToken = tokenData.access_token;
    console.log("[Embedded Signup] ✅ Business Access Token received successfully.");

    let targetWabaId = wabaId;
    let targetPhoneNumberId = phoneNumberId;

    // Fallback: If wabaId or phoneNumberId were not received via window postMessage
    if (!targetWabaId || !targetPhoneNumberId) {
      try {
        console.log("[Embedded Signup] Inspecting token debug info for missing assets...");
        const debugUrl = `https://graph.facebook.com/${apiVersion}/debug_token?input_token=${clientAccessToken}&access_token=${metaAppId}|${metaAppSecret}`;
        const debugRes = await fetch(debugUrl);
        const debugData = await debugRes.json();

        if (debugData?.data?.granular_scopes) {
          for (const s of debugData.data.granular_scopes) {
            if (s.target_ids && s.target_ids.length > 0 && !targetWabaId) {
              targetWabaId = s.target_ids[0];
            }
          }
        }
      } catch (debugErr) {
        console.warn("[Embedded Signup] Token inspection warning:", debugErr);
      }
    }

    // If targetWabaId is known but targetPhoneNumberId is missing, query phone numbers
    if (targetWabaId && !targetPhoneNumberId) {
      try {
        console.log(`[Embedded Signup] Fetching phone numbers for WABA ${targetWabaId}...`);
        const phoneListUrl = `https://graph.facebook.com/${apiVersion}/${targetWabaId}/phone_numbers`;
        const phoneListRes = await fetch(phoneListUrl, {
          headers: { Authorization: `Bearer ${clientAccessToken}` },
        });
        const phoneListData = await phoneListRes.json();
        if (phoneListData?.data?.[0]?.id) {
          targetPhoneNumberId = phoneListData.data[0].id;
        }
      } catch (phoneErr) {
        console.warn("[Embedded Signup] Phone lookup warning:", phoneErr);
      }
    }

    if (!targetWabaId || !targetPhoneNumberId) {
      return NextResponse.json(
        {
          error:
            "Could not determine WhatsApp Business Account ID or Phone Number ID. Please ensure permissions were granted in the Meta popup and try again.",
        },
        { status: 400 }
      );
    }

    // 2. Subscribe our app to the client's WABA (POST /{waba_id}/subscribed_apps)
    console.log(`[Embedded Signup] Subscribing app to WABA ${targetWabaId}...`);
    try {
      const subUrl = `https://graph.facebook.com/${apiVersion}/${targetWabaId}/subscribed_apps`;
      const subRes = await fetch(subUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientAccessToken}`,
        },
      });
      const subData = await subRes.json();
      console.log("[Embedded Signup] Subscribed apps response:", subData);
    } catch (subErr) {
      console.error("[Embedded Signup] Error subscribing WABA to app webhook:", subErr);
    }

    // 3. Fetch phone number details (display_phone_number, verified_name, quality_rating, tier)
    let displayPhoneNumber: string | null = null;
    let verifiedName: string | null = null;
    let qualityRating = "GREEN";
    let messagingLimitTier = "TIER_250";

    try {
      console.log(`[Embedded Signup] Fetching phone metadata for ID ${targetPhoneNumberId}...`);
      const phoneUrl = `https://graph.facebook.com/${apiVersion}/${targetPhoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,status`;
      const phoneRes = await fetch(phoneUrl, {
        headers: { Authorization: `Bearer ${clientAccessToken}` },
      });
      const phoneData = await phoneRes.json();
      console.log("[Embedded Signup] Phone details retrieved:", phoneData);

      if (phoneData.display_phone_number) {
        displayPhoneNumber = phoneData.display_phone_number;
      }
      if (phoneData.verified_name) {
        verifiedName = phoneData.verified_name;
      }
      if (phoneData.quality_rating) {
        qualityRating = phoneData.quality_rating;
      }
      if (phoneData.messaging_limit_tier) {
        messagingLimitTier = phoneData.messaging_limit_tier;
      }
    } catch (metaErr) {
      console.error("[Embedded Signup] Error querying phone details from Meta:", metaErr);
    }

    // 4. Register the phone number for Cloud API (POST /{phone_number_id}/register) with 6-digit PIN
    const existingConfig = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
      select: { pin: true },
    });
    const pin =
      existingConfig?.pin ||
      Math.floor(100000 + crypto.randomInt(0, 900000)).toString();

    console.log(`[Embedded Signup] Registering phone number ${targetPhoneNumberId} with PIN...`);
    try {
      const regUrl = `https://graph.facebook.com/${apiVersion}/${targetPhoneNumberId}/register`;
      const regRes = await fetch(regUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin: pin,
        }),
      });
      const regData = await regRes.json();
      console.log("[Embedded Signup] Phone registration result:", regData);
      if (!regRes.ok) {
        console.warn("[Embedded Signup] Non-fatal notice during phone registration:", regData);
      }
    } catch (regErr) {
      console.warn("[Embedded Signup] Registration exception (continuing connection):", regErr);
    }

    // 5. Save per client in the database with encrypted access token
    const config = await prisma.whatsAppConfig.upsert({
      where: { businessId: business.id },
      update: {
        waToken: encryptToken(clientAccessToken),
        waPhoneNumberId: targetPhoneNumberId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: apiVersion,
        metaAppId: metaAppId,
        isConnected: true,
        status: "CONNECTED",
        connectionMethod: "EMBEDDED_SIGNUP",
        displayPhoneNumber: displayPhoneNumber || "Connected Phone",
        verifiedName: verifiedName || business.name,
        qualityRating: qualityRating,
        messagingLimitTier: messagingLimitTier,
        embeddedSignupAt: new Date(),
        pin: pin,
      },
      create: {
        businessId: business.id,
        waToken: encryptToken(clientAccessToken),
        waPhoneNumberId: targetPhoneNumberId,
        waBusinessAccountId: targetWabaId,
        waApiVersion: apiVersion,
        metaAppId: metaAppId,
        isConnected: true,
        status: "CONNECTED",
        connectionMethod: "EMBEDDED_SIGNUP",
        displayPhoneNumber: displayPhoneNumber || "Connected Phone",
        verifiedName: verifiedName || business.name,
        qualityRating: qualityRating,
        messagingLimitTier: messagingLimitTier,
        embeddedSignupAt: new Date(),
        pin: pin,
      },
    });

    return NextResponse.json({
      success: true,
      message: `WhatsApp Business connected successfully! Number: ${config.displayPhoneNumber || targetPhoneNumberId}`,
      config: {
        isConnected: config.isConnected,
        status: config.status,
        displayPhoneNumber: config.displayPhoneNumber,
        verifiedName: config.verifiedName,
        qualityRating: config.qualityRating,
        messagingLimitTier: config.messagingLimitTier,
        connectionMethod: config.connectionMethod,
        waPhoneNumberId: config.waPhoneNumberId,
        waBusinessAccountId: config.waBusinessAccountId,
        maskedToken: maskToken(clientAccessToken),
      },
    });
  } catch (err: any) {
    console.error("[Embedded Signup Error]", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete Embedded Signup" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    const config = await prisma.whatsAppConfig.findUnique({
      where: { businessId: business.id },
    });

    if (config?.waToken && config.waBusinessAccountId) {
      const apiVersion = config.waApiVersion || process.env.WA_API_VERSION || "v21.0";
      const token = decryptToken(config.waToken);
      if (token) {
        try {
          console.log(`[Embedded Signup] Unsubscribing WABA ${config.waBusinessAccountId}...`);
          await fetch(
            `https://graph.facebook.com/${apiVersion}/${config.waBusinessAccountId}/subscribed_apps`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch (unsubErr) {
          console.warn("[Embedded Signup] Unsubscribe notice:", unsubErr);
        }
      }
    }

    await prisma.whatsAppConfig.update({
      where: { businessId: business.id },
      data: {
        isConnected: false,
        status: "DISCONNECTED",
        connectionMethod: "MANUAL",
        displayPhoneNumber: null,
        verifiedName: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp Business Account disconnected successfully.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
