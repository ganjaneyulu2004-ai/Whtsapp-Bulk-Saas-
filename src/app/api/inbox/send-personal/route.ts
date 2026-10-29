import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

// 3.5-second deduplication cache to prevent accidental double-submits from client
const recentPersonalSends = new Map<string, { timestamp: number; response: any }>();

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { recipientPhone, recipientName, messageText, mediaUrl, mediaType, mediaList, fileName, buttons } = body;

    const items: Array<{ url: string; type: "image" | "video" | "document"; name?: string }> =
      Array.isArray(mediaList) && mediaList.length > 0
        ? mediaList
        : mediaUrl
        ? [{ url: mediaUrl, type: mediaType || "image", name: fileName }]
        : [];

    const cleanMessage = String(messageText || "").trim();

    if (!recipientPhone || (!cleanMessage && items.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number and message or media attachments are required." },
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

    // Check duplicate send within 6.0 seconds
    const dedupKey = `${targetPhone}_${cleanMessage}_${items.map((i) => i.name || i.url).join("|")}`;
    const cachedSend = recentPersonalSends.get(dedupKey);
    if (cachedSend && Date.now() - cachedSend.timestamp < 6000) {
      console.log(`⏩ [SERVER DEDUP] Blocked duplicate message to ${targetPhone} within 6s.`);
      return NextResponse.json(cachedSend.response);
    }

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

    const waConfig = {
      waToken: config.waToken || undefined,
      waPhoneNumberId: config.waPhoneNumberId || undefined,
      waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
    };

    // If multiple items are attached, send each sequentially
    if (items.length > 0) {
      const results: any[] = [];
      let anyError: string | null = null;
      let anyErrorCode: string | null = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Only attach caption to the first media item
        const caption = i === 0 ? cleanMessage : "";
        const detectedType: "image" | "video" | "document" = 
          item.type || 
          (item.url?.match(/\.(pdf|docx?|xlsx?|csv|txt)/i) ? "document" : item.url?.match(/\.(mp4|mov|webm|3gp)/i) ? "video" : "image");

        // Try direct 24-hour window message first
        let res = await sendWhatsAppTemplateMessage(
          waConfig,
          targetPhone,
          finalRecipientName,
          "direct_message",
          "en",
          item.url,
          {
            is24HourWindow: true,
            freeFormText: caption,
            businessName: business.name || "iBrainLabs",
            mediaType: detectedType,
            fileName: item.name || (detectedType === "document" ? "document.pdf" : undefined),
          }
        );

        // If outside 24-hour window (Meta error 131047), fallback to template if image
        if (!res.success && res.errorCode === "131047") {
          res = await sendWhatsAppTemplateMessage(
            waConfig,
            targetPhone,
            finalRecipientName,
            "offer_poster_v1",
            "en",
            item.url,
            {
              offerText: caption || "Here are the documents & updates for you!",
              businessName: business.name || "iBrainLabs",
              is24HourWindow: false,
              mediaType: detectedType,
              fileName: item.name,
            }
          );
        }

        if (res.success) {
          results.push(res);
          try {
            await prisma.incomingMessage.create({
              data: {
                businessId: business.id,
                fromPhone: targetPhone,
                customerName: "__BUSINESS_REPLY__",
                messageText: (i === 0 && cleanMessage) ? cleanMessage : (item.name ? `[${item.name}]` : `[${detectedType}]`),
                waMessageId: res.waMessageId || `media_${Date.now()}_${i}`,
                timestamp: new Date(),
              },
            });
          } catch {}
        } else {
          anyError = res.errorMessage || "Failed to send media";
          anyErrorCode = res.errorCode || null;
        }
      }

      if (results.length > 0) {
        const responseData = {
          success: true,
          message: `${results.length} of ${items.length} media file(s) sent successfully!`,
          waMessageIds: results.map((r) => r.waMessageId).filter(Boolean),
          partialFailure: anyError ? true : false,
          warning: anyError,
        };
        recentPersonalSends.set(dedupKey, { timestamp: Date.now(), response: responseData });
        return NextResponse.json(responseData);
      } else {
        return NextResponse.json(
          {
            success: false,
            error: anyError || "Failed to send media via WhatsApp Meta API",
            errorCode: anyErrorCode,
          },
          { status: 400 }
        );
      }
    }

    // Text-only message
    let sendResult = await sendWhatsAppTemplateMessage(
      waConfig,
      targetPhone,
      finalRecipientName,
      "direct_message",
      "en",
      undefined,
      {
        is24HourWindow: true,
        freeFormText: cleanMessage,
        businessName: business.name || "iBrainLabs",
        buttons: Array.isArray(buttons) && buttons.length > 0 ? buttons : undefined,
      }
    );

    // If outside 24h window (code 131047), fallback automatically to template
    if (!sendResult.success && sendResult.errorCode === "131047") {
      sendResult = await sendWhatsAppTemplateMessage(
        waConfig,
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
      try {
        const buttonDisplay = Array.isArray(buttons) && buttons.length > 0
          ? "\n\n🔘 Buttons: " + buttons.map((b: any) => `[ ${b.title || b.text} ]`).join("  ")
          : "";

        await prisma.incomingMessage.create({
          data: {
            businessId: business.id,
            fromPhone: targetPhone,
            customerName: "__BUSINESS_REPLY__",
            messageText: cleanMessage + buttonDisplay,
            waMessageId: sendResult.waMessageId || `manual_${Date.now()}`,
            timestamp: new Date(),
          },
        });
      } catch {}

      const responseData = {
        success: true,
        message: `Message sent successfully to +${targetPhone}!`,
        waMessageId: sendResult.waMessageId,
        deliveryMode: is24HourWindow ? "DIRECT_24H_WINDOW" : "TEMPLATE_DELIVERY",
      };
      recentPersonalSends.set(dedupKey, { timestamp: Date.now(), response: responseData });

      return NextResponse.json(responseData);
    } else {
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
