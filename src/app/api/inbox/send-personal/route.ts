import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { recipientPhone, recipientName, messageText } = body;

    if (!recipientPhone || !messageText) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number and personal message are required." },
        { status: 400 }
      );
    }

    let rawPhone = String(recipientPhone).replace(/[^0-9]/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }
    const targetPhone = rawPhone;

    const finalRecipientName = (recipientName || "Friend").trim();
    const cleanMessage = String(messageText).trim();

    // Check if recipient has an active 24-hour customer service window in incoming messages
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentIncoming = await prisma.incomingMessage.findFirst({
      where: {
        fromPhone: { in: [targetPhone, targetPhone.replace(/^91/, "")] },
        timestamp: { gte: twentyFourHoursAgo },
      },
      orderBy: { timestamp: "desc" },
    });

    const is24HourWindow = !!recentIncoming;
    const config: any = business.whatsappConfig || {};

    let sendResult;

    if (is24HourWindow) {
      // 1. Send as direct 1-on-1 free-form WhatsApp message within 24h window
      sendResult = await sendWhatsAppTemplateMessage(
        {
          waToken: config.waToken || undefined,
          waPhoneNumberId: config.waPhoneNumberId || undefined,
          waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
        },
        targetPhone,
        finalRecipientName,
        "direct_message",
        "en",
        undefined,
        {
          is24HourWindow: true,
          freeFormText: cleanMessage,
          businessName: business.name || "iBrainLabs",
        }
      );
    } else {
      // 2. Outside 24h window or new friend number:
      // Use verified Meta-approved utility template to deliver the personal message reliably!
      sendResult = await sendWhatsAppTemplateMessage(
        {
          waToken: config.waToken || undefined,
          waPhoneNumberId: config.waPhoneNumberId || undefined,
          waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
        },
        targetPhone,
        finalRecipientName,
        "student_welcome",
        "en",
        undefined,
        {
          offerText: cleanMessage,
          businessName: business.name || "iBrainLabs",
          is24HourWindow: false,
        }
      );
    }

    if (sendResult.success) {
      return NextResponse.json({
        success: true,
        message: `Personal message sent successfully to +${targetPhone}!`,
        waMessageId: sendResult.waMessageId,
        deliveryMode: is24HourWindow ? "DIRECT_24H_WINDOW" : "VERIFIED_TEMPLATE_DELIVERY",
      });
    } else {
      // If direct send failed with code 131047 (outside window error), retry with template automatically
      if (is24HourWindow && sendResult.errorCode === "131047") {
        const fallbackRes = await sendWhatsAppTemplateMessage(
          {
            waToken: config.waToken || undefined,
            waPhoneNumberId: config.waPhoneNumberId || undefined,
            waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
          },
          targetPhone,
          finalRecipientName,
          "student_welcome",
          "en",
          undefined,
          {
            offerText: cleanMessage,
            businessName: business.name || "iBrainLabs",
            is24HourWindow: false,
          }
        );

        if (fallbackRes.success) {
          return NextResponse.json({
            success: true,
            message: `Personal message delivered successfully to +${targetPhone}!`,
            waMessageId: fallbackRes.waMessageId,
            deliveryMode: "VERIFIED_TEMPLATE_FALLBACK",
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: sendResult.errorMessage || "Failed to send message via WhatsApp Meta API",
          errorCode: sendResult.errorCode,
        },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
