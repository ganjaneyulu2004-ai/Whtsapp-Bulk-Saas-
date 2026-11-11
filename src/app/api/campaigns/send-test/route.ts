import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { decryptToken } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { 
      recipientPhone, 
      phone,
      recipientName, 
      offerText, 
      businessName,
      templateName,
      languageCode,
    } = body;

    let rawPhone = String(recipientPhone || phone || business.phone || "919390487233").replace(/[^0-9]/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }
    const targetPhone = rawPhone;

    const config: any = business.whatsappConfig || {};
    const token = decryptToken(config.waToken) || process.env.WA_TOKEN;
    const phoneId = config.waPhoneNumberId || process.env.WA_PHONE_NUMBER_ID;
    const apiVersion = process.env.WA_API_VERSION || config.waApiVersion || "v21.0";

    if (!token || !phoneId) {
      return NextResponse.json(
        {
          success: false,
          error: "No WhatsApp number connected for your account. Please connect your number via Embedded Signup first.",
        },
        { status: 400 }
      );
    }

    const bName = (businessName || business.name || "OneAmple").trim();
    const messageContent = (
      offerText ||
      `Live Test Message from OneAmple (${bName})! 🚀 Your WhatsApp Cloud API channel is active, verified, and transmitting successfully.`
    ).trim();

    let metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    let payload: any;

    if (templateName) {
      // Send selected template directly
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: targetPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode || "en_US" },
        },
      };
    } else {
      // Direct text attempt (24h window)
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: targetPhone,
        type: "text",
        text: {
          preview_url: false,
          body: messageContent,
        },
      };
    }

    console.log(`[Send Test] Transmitting to +${targetPhone} via Phone ID ${phoneId}...`);
    let res = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = await res.json();

    // If direct text failed because 24-hr customer service window is closed (Error 131047), fallback to verified template "hello_world"
    if (!res.ok && data?.error?.code === 131047 && !templateName) {
      console.log("[Send Test] 24-hr window closed. Falling back to default approved template 'hello_world'...");
      const fallbackPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: targetPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" },
        },
      };

      res = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(fallbackPayload),
      });

      data = await res.json();
    }

    if (res.ok && data?.messages?.[0]?.id) {
      const realWamid = data.messages[0].id;
      return NextResponse.json({
        success: true,
        message: `Real Meta test message sent successfully to +${targetPhone}!`,
        waMessageId: realWamid,
        metaStatus: data.messages[0].message_status || "sent",
        recipient: targetPhone,
      });
    } else {
      const errorDetail = data?.error?.message || data?.error?.error_user_msg || "Meta API error";
      const errorCode = data?.error?.code || res.status;
      console.error("[Send Test Meta Error]", data);
      return NextResponse.json(
        {
          success: false,
          error: `Meta Error (${errorCode}): ${errorDetail}`,
          metaError: data?.error,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error("[Send Test Error]", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error while sending test",
      },
      { status: 500 }
    );
  }
}
