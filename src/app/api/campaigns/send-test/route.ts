import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

const FALLBACK_TOKEN = "EAAOe4PppfZCIBSyhPLLzoYmzWUB35U5XgC3RezCojrqvjqdJzRYHoaFSWxoN4PDZBMTlsL2g8zEZCHkqrZAWnirvjSccc6ZAjFlzJjV7JtCdVwoWRPYEoFaQ6yQW3psyxIj7gA69buLULa1X3zYZBv0PkFiFqbvWYMaWrDDUzYK2sledzyJjl0RXJCN7Ou7YuADAZDZD";
const FALLBACK_PHONE_ID = "1443849605471143";

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
    } = body;

    let rawPhone = String(recipientPhone || phone || business.phone || "919390487233").replace(/[^0-9]/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }
    const targetPhone = rawPhone;

    const config: any = business.whatsappConfig || {};
    const token = config.waToken || process.env.WA_TOKEN || FALLBACK_TOKEN;
    const phoneId = config.waPhoneNumberId || process.env.WA_PHONE_NUMBER_ID || FALLBACK_PHONE_ID;
    const apiVersion = process.env.WA_API_VERSION || config.waApiVersion || "v20.0";

    const bName = (businessName || business.name || "iBrainLabs").trim();
    const messageContent = (offerText || `Live Test Message from OneAmple by ${bName}! 🚀 Your WhatsApp Cloud API campaign setup is active, verified, and transmitting successfully.`).trim();

    // 1. First attempt: Send live text message (works instantly in active 24-hour service window)
    const directPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: targetPhone,
      type: "text",
      text: {
        preview_url: false,
        body: messageContent,
      },
    };

    let metaUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
    let res = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(directPayload),
    });

    let data = await res.json();

    // 2. If 24-hr window is closed (Error 131047), fall back to official approved template "hello_world"
    if (!res.ok && data?.error?.code === 131047) {
      const templatePayload = {
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
        body: JSON.stringify(templatePayload),
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
      return NextResponse.json({
        success: false,
        error: `Meta Error (${errorCode}): ${errorDetail}`,
        metaError: data?.error,
      }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Internal server error while sending test",
    }, { status: 500 });
  }
}
