import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { decryptToken } from "@/lib/encryption";
import { countTemplateBodyVariables, getClientTemplates } from "@/lib/template-service";

// 6-second deduplication cache scoped by business + phone + message to prevent double-submits
const recentPersonalSends = new Map<string, { timestamp: number; response: any }>();

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ success: false, error: "Business account not found" }, { status: 403 });
    }

    const body = await req.json();
    const {
      recipientPhone,
      recipientName,
      messageText,
      mediaUrl,
      mediaType,
      mediaList,
      fileName,
      buttons,
      templateName,
      templateLanguage,
    } = body;

    const items: Array<{ url: string; type: "image" | "video" | "document"; name?: string }> =
      Array.isArray(mediaList) && mediaList.length > 0
        ? mediaList
        : mediaUrl
        ? [{ url: mediaUrl, type: mediaType || "image", name: fileName }]
        : [];

    const cleanMessage = String(messageText || "").trim();

    if (!recipientPhone || (!cleanMessage && items.length === 0 && !templateName)) {
      return NextResponse.json(
        { success: false, error: "Recipient phone number and message or template selection are required." },
        { status: 400 }
      );
    }

    const config: any = business.whatsappConfig || {};
    const clientToken = decryptToken(config.waToken);
    if (!clientToken || !config.waPhoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          errorCode: "NOT_CONNECTED",
          error: "Your WhatsApp Business number is not connected. Connect WhatsApp first.",
        },
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

    // Check duplicate send within 6.0 seconds (scoped to business.id)
    const dedupKey = `${business.id}_${targetPhone}_${templateName || ""}_${cleanMessage}_${items.map((i) => i.name || i.url).join("|")}`;
    const cachedSend = recentPersonalSends.get(dedupKey);
    if (cachedSend && Date.now() - cachedSend.timestamp < 6000) {
      return NextResponse.json(cachedSend.response);
    }

    // Check if recipient has an active 24-hour customer service window strictly for THIS businessId
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentIncoming = await prisma.incomingMessage.findFirst({
      where: {
        businessId: business.id,
        fromPhone: { in: [targetPhone, targetPhone.replace(/^91/, "")] },
        timestamp: { gte: twentyFourHoursAgo },
      },
      orderBy: { timestamp: "desc" },
    });

    const is24HourWindow = !!recentIncoming;

    const waConfig = {
      waToken: clientToken,
      waPhoneNumberId: config.waPhoneNumberId,
      waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
    };

    // Helper: send via client's own APPROVED WABA template when outside 24h window or explicitly selected
    const sendWithClientApprovedTemplate = async (attachedMediaUrl?: string) => {
      const approvedTemplates = await getClientTemplates(business.id, {
        syncFromMeta: true,
        approvedOnly: true,
      });

      if (approvedTemplates.length === 0) {
        return {
          success: false,
          errorCode: "NO_APPROVED_TEMPLATE",
          errorMessage:
            "The 24-hour reply window has expired and your connected WhatsApp Business Account has no APPROVED templates yet. Please create and get a template approved in Templates before messaging outside 24 hours.",
        };
      }

      let chosenTpl = templateName
        ? approvedTemplates.find(
            (t) =>
              t.name === templateName &&
              (!templateLanguage || t.language === templateLanguage)
          ) || approvedTemplates.find((t) => t.name === templateName)
        : approvedTemplates[0];

      if (templateName && !chosenTpl) {
        return {
          success: false,
          errorCode: "TEMPLATE_NOT_APPROVED",
          errorMessage: `Template "${templateName}" is not APPROVED in your connected WhatsApp Business Account.`,
        };
      }

      if (!chosenTpl) {
        chosenTpl = approvedTemplates[0];
      }

      const headerImage =
        attachedMediaUrl ||
        (chosenTpl.headerType === "IMAGE"
          ? chosenTpl.headerImageUrl || chosenTpl.headerMediaUrl || undefined
          : undefined);

      const bodyVarCount = countTemplateBodyVariables(chosenTpl.bodyText);
      return sendWhatsAppTemplateMessage(
        waConfig,
        targetPhone,
        finalRecipientName,
        chosenTpl.name,
        chosenTpl.language,
        headerImage,
        {
          offerText: cleanMessage || chosenTpl.bodyText,
          businessName: business.name || "OneAmple",
          is24HourWindow: false,
          bodyVarCount,
          headerType: chosenTpl.headerType,
        }
      );
    };

    // If outside 24h window and user chose one of their own approved templates, send template directly
    if (templateName && !is24HourWindow && items.length === 0) {
      const tplResult = await sendWithClientApprovedTemplate();
      if (tplResult.success) {
        const displayMsg = cleanMessage || `[Template: ${templateName}]`;
        try {
          await prisma.incomingMessage.create({
            data: {
              businessId: business.id,
              fromPhone: targetPhone,
              customerName: "__BUSINESS_REPLY__",
              messageText: displayMsg,
              waMessageId: tplResult.waMessageId || `tpl_${Date.now()}`,
              timestamp: new Date(),
            },
          });
        } catch {}

        const responseData = {
          success: true,
          message: `Template "${templateName}" sent successfully to +${targetPhone}!`,
          waMessageId: tplResult.waMessageId,
          deliveryMode: "TEMPLATE_DELIVERY",
        };
        recentPersonalSends.set(dedupKey, { timestamp: Date.now(), response: responseData });
        return NextResponse.json(responseData);
      }

      return NextResponse.json(
        {
          success: false,
          error: tplResult.errorMessage || "Failed to send template message via Meta API",
          errorCode: tplResult.errorCode,
        },
        { status: 400 }
      );
    }

    // Multi-media path (tries 24h free-form first, falls back only to client's own approved template)
    if (items.length > 0) {
      const results: any[] = [];
      let anyError: string | null = null;
      let anyErrorCode: string | null = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const caption = i === 0 ? cleanMessage : "";
        const detectedType: "image" | "video" | "document" =
          item.type ||
          (item.url?.match(/\.(pdf|docx?|xlsx?|csv|txt)/i)
            ? "document"
            : item.url?.match(/\.(mp4|mov|webm|3gp)/i)
            ? "video"
            : "image");

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
            businessName: business.name || "OneAmple",
            mediaType: detectedType,
            fileName: item.name || (detectedType === "document" ? "document.pdf" : undefined),
          }
        );

        if (!res.success && res.errorCode === "131047") {
          res = await sendWithClientApprovedTemplate(item.url);
        }

        if (res.success) {
          results.push(res);
          try {
            await prisma.incomingMessage.create({
              data: {
                businessId: business.id,
                fromPhone: targetPhone,
                customerName: "__BUSINESS_REPLY__",
                messageText:
                  i === 0 && cleanMessage
                    ? cleanMessage
                    : item.name
                    ? `[${item.name}]`
                    : `[${detectedType}]`,
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
      }

      return NextResponse.json(
        {
          success: false,
          error: anyError || "Failed to send media via WhatsApp Meta API",
          errorCode: anyErrorCode,
        },
        { status: 400 }
      );
    }

    // Text-only message: if outside 24h window, send strictly with client's approved template; otherwise try direct first
    let sendResult = is24HourWindow
      ? await sendWhatsAppTemplateMessage(
          waConfig,
          targetPhone,
          finalRecipientName,
          "direct_message",
          "en",
          undefined,
          {
            is24HourWindow: true,
            freeFormText: cleanMessage,
            businessName: business.name || "OneAmple",
            buttons: Array.isArray(buttons) && buttons.length > 0 ? buttons : undefined,
          }
        )
      : await sendWithClientApprovedTemplate();

    if (is24HourWindow && !sendResult.success && sendResult.errorCode === "131047") {
      sendResult = await sendWithClientApprovedTemplate();
    }

    if (sendResult.success) {
      try {
        const buttonDisplay =
          Array.isArray(buttons) && buttons.length > 0
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
    }

    return NextResponse.json(
      {
        success: false,
        error: sendResult.errorMessage || "Failed to send message via WhatsApp Meta API",
        errorCode: sendResult.errorCode,
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
