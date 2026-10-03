import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { sendWhatsAppTemplateMessage, uploadMediaToMeta } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { 
      recipientPhone, 
      recipientName, 
      offerText, 
      posterImage, 
      templateName,
      businessName,
      bookingLink,
      forceTemplate,
    } = body;

    const targetPhone = (recipientPhone || business.phone || "919390487233").replace(/[^0-9]/g, "");
    const config: any = business.whatsappConfig || {};

    // Auto-detect or resolve recipient name
    let finalRecipientName = recipientName?.trim();
    if (!finalRecipientName) {
      const existingContact = await prisma.contact.findFirst({
        where: { businessId: business.id, phone: targetPhone },
      });
      if (existingContact?.name && existingContact.name !== "Customer") {
        finalRecipientName = existingContact.name.trim();
      } else {
        finalRecipientName = "Customer";
      }
    }

    const bName = (businessName || business.name || "iBrainLabs").trim();
    const bLink = (bookingLink || business.defaultBookingLink || "").trim();
    const targetTemplate = posterImage || templateName === "offer_poster_v1" ? "offer_poster_v1" : "offer_update_v1";

    let mediaId: string | undefined = body.mediaId || undefined;
    let posterMediaUrl: string | undefined = posterImage;

    if (!posterMediaUrl && targetTemplate === "offer_poster_v1") {
      const existingTpl = await prisma.template.findFirst({
        where: { businessId: business.id, name: "offer_poster_v1", headerMediaUrl: { not: null } },
        orderBy: { createdAt: "desc" },
      });
      if (existingTpl?.headerMediaUrl) {
        posterMediaUrl = existingTpl.headerMediaUrl;
      }
    }

    if (posterMediaUrl && targetTemplate === "offer_poster_v1" && !mediaId) {
      const uploadRes = await uploadMediaToMeta(
        {
          waToken: config.waToken || undefined,
          waPhoneNumberId: config.waPhoneNumberId || undefined,
          waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
        },
        posterMediaUrl
      );
      if (uploadRes.success && uploadRes.mediaId) {
        mediaId = uploadRes.mediaId;
      }
    }

    const baseOffer = (offerText || "Special Offer for you today!").trim();
    const offerWithBooking = bLink && !baseOffer.includes(bLink) ? `${baseOffer} 👉 ${bLink}` : baseOffer;

    const cleanOffer = offerWithBooking
      .replace(/[\r\n\t]/g, " ")
      .replace(/ {5,}/g, "    ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 300);

    const exactTextSent = `Dear ${finalRecipientName},\n\nWe have an offer for you: ${cleanOffer}\n\nThank you for shopping with ${bName}. Have a great day!`;

    const parametersSent = {
      templateName: targetTemplate,
      language: "en_US",
      recipientPhone: `+${targetPhone}`,
      recipientName: finalRecipientName,
      header: targetTemplate === "offer_poster_v1" 
        ? { type: "image", mediaId: mediaId || "uploaded_media_id" }
        : { type: "text", text: finalRecipientName },
      bodyParameters: [
        { variable: "{{1}}", value: finalRecipientName },
        { variable: "{{2}}", value: cleanOffer },
        { variable: "{{3}}", value: bName },
      ],
      bookingLink: bLink || null,
      exactTextSent,
    };

    const res = await sendWhatsAppTemplateMessage(
      {
        waToken: config.waToken || undefined,
        waPhoneNumberId: config.waPhoneNumberId || undefined,
        waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
      },
      targetPhone,
      finalRecipientName,
      targetTemplate,
      "en_US",
      posterMediaUrl || undefined,
      {
        offerText: baseOffer,
        businessName: bName,
        bookingLink: bLink || undefined,
        is24HourWindow: forceTemplate === false ? undefined : false, // Forced template mode
        mediaId,
      }
    );

    if (res.success) {
      return NextResponse.json({
        success: true,
        message: `Test message sent via ${targetTemplate} to +${targetPhone}! (waMessageId: ${res.waMessageId})`,
        waMessageId: res.waMessageId,
        parametersSent,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: res.errorMessage || "Failed to send test message",
        errorCode: res.errorCode,
        parametersSent,
      }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
