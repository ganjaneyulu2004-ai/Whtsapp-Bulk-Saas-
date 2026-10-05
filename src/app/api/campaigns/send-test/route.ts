import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";
import { sendWhatsAppTemplateMessage, uploadMediaToMeta } from "@/lib/whatsapp";

// Rate limiter: Max 2 test messages per recipient phone number
const globalForTestLimit = globalThis as unknown as {
  testNumberCountMap: Map<string, number> | undefined;
};
const testNumberCountMap =
  globalForTestLimit.testNumberCountMap ?? new Map<string, number>();
if (process.env.NODE_ENV !== "production") {
  globalForTestLimit.testNumberCountMap = testNumberCountMap;
}

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

    let rawPhone = (recipientPhone || business.phone || "919390487233").replace(/[^0-9]/g, "");
    if (rawPhone.length === 10) {
      rawPhone = "91" + rawPhone;
    } else if (rawPhone.length === 11 && rawPhone.startsWith("0")) {
      rawPhone = "91" + rawPhone.slice(1);
    }
    const targetPhone = rawPhone;

    // Enforce 2 test messages limit (allow owner phone for testing)
    const currentTestsUsed = targetPhone === "919390487233" ? 0 : (testNumberCountMap.get(targetPhone) || 0);
    if (currentTestsUsed >= 2) {
      return NextResponse.json({
        success: false,
        error: `Free test limit reached for +${targetPhone} (2 of 2 messages used). Please log in or register to send unlimited bulk campaigns!`,
        testLimitReached: true,
      }, { status: 429 });
    }

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

    // Use approved UTILITY template 'student_welcome' for live demo test offers
    // UTILITY bypasses Indian Telecom DND/Marketing restrictions and delivers 100% instantly to EVERY phone number!
    const targetTemplate = (forceTemplate && templateName) ? templateName : (posterImage ? "offer_poster_v1" : "student_welcome");
    const targetLanguage = targetTemplate === "student_welcome" ? "en" : "en_US";

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
    // In live test mode, send the clean offer text EXACTLY as chosen by the user without force-appending any unwanted URLs
    const cleanOffer = baseOffer
      .replace(/[\r\n\t]/g, " ")
      .replace(/ {5,}/g, "    ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 300);

    const exactTextSent = targetTemplate === "student_welcome"
      ? `Hi ${finalRecipientName}! Welcome to our Tutor Marketplace. We've received your request for ${cleanOffer} in ${bName} and we're now finding the best tutor match for you. We'll message you here as soon as we have a match!`
      : `Dear ${finalRecipientName},\n\nWe have an offer for you: ${cleanOffer}\n\nThank you for shopping with ${bName}. Have a great day!`;

    const parametersSent = {
      templateName: targetTemplate,
      language: targetLanguage,
      recipientPhone: `+${targetPhone}`,
      recipientName: finalRecipientName,
      header: targetTemplate === "student_welcome"
        ? null
        : (targetTemplate === "offer_poster_v1" 
            ? { type: "image", mediaId: mediaId || "uploaded_media_id" }
            : { type: "text", text: finalRecipientName }),
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
      targetLanguage,
      posterMediaUrl || undefined,
      {
        offerText: baseOffer,
        businessName: bName,
        bookingLink: bLink || undefined,
        is24HourWindow: forceTemplate === false ? undefined : false, // Forced template mode
        mediaId,
      }
    );

    console.log("📢 SEND-TEST REQUEST: to=" + targetPhone + " template=" + targetTemplate + " res=", JSON.stringify(res));

    if (res.success) {
      testNumberCountMap.set(targetPhone, currentTestsUsed + 1);
      const remainingTests = Math.max(0, 2 - (currentTestsUsed + 1));
      return NextResponse.json({
        success: true,
        message: `Test message sent via ${targetTemplate} to +${targetPhone}! (waMessageId: ${res.waMessageId})`,
        waMessageId: res.waMessageId,
        remainingTests,
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
