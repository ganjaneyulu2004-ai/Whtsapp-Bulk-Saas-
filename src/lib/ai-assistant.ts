import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";
import { decryptToken } from "./encryption";
import { getMetaGraphVersion } from "./meta-config";

interface GenerateAiReplyParams {
  fromPhone: string;
  customerName: string;
  incomingText: string;
  businessId?: string;
  waPhoneNumberId?: string;
  incomingWaMessageId?: string;
}

// Tracks processed incoming waMessageIds so repeated/retried webhook events never send multiple AI replies
const processedIncomingWaMessageIds = new Map<string, number>();

// Per-(businessId, customerPhone) lock so only ONE AI reply runs at a time per conversation
const activeConversationLocks = new Set<string>();

// Short per-(businessId, customerPhone, normalizedText) cooldown against rapid duplicate deliveries
const recentAiContentReplies = new Map<string, number>();

/**
 * Safety guard that catches square-bracket placeholders such as
 * "[Insert Phone Number]", "[Address]", "[Link]", "[Your ...]", etc.
 */
export function containsPlaceholderBrackets(text: string): boolean {
  if (!text) return false;
  return (
    /\[\s*(?:insert|add|enter|put|your|my|our|business|company|phone|contact|mobile|number|address|location|link|url|website|booking|email|service|price|name|date|time|city|map|details?|info|placeholder|xxx|tbd)\b[^\]]*\]/i.test(
      text
    ) || /\[[^\]]*(?:\.\.\.|placeholder|insert)[^\]]*\]/i.test(text)
  );
}

function pruneMapByTtl(map: Map<string, number>, maxSize: number, ttlMs: number) {
  if (map.size <= maxSize) return;
  const cutoff = Date.now() - ttlMs;
  for (const [key, ts] of map.entries()) {
    if (ts < cutoff) map.delete(key);
  }
}

export async function handleIncomingAiReply({
  fromPhone,
  customerName,
  incomingText,
  businessId,
  waPhoneNumberId,
  incomingWaMessageId,
}: GenerateAiReplyParams) {
  const cleanPhone = String(fromPhone || "").replace(/[^0-9]/g, "");
  const cleanIncomingText = String(incomingText || "").trim();
  const normalizedPhoneKey = cleanPhone.slice(-10) || cleanPhone;
  const cleanWaMsgId = incomingWaMessageId ? String(incomingWaMessageId).trim() : "";

  if (!cleanPhone || !cleanIncomingText) {
    return null;
  }

  // 1a. Strict dedupe by incoming waMessageId BEFORE any async work
  if (cleanWaMsgId) {
    const seenAt = processedIncomingWaMessageIds.get(cleanWaMsgId);
    if (seenAt && Date.now() - seenAt < 600000) {
      console.log(`🤖 [AI DEDUP] Skipping duplicate waMessageId ${cleanWaMsgId}.`);
      return null;
    }
    processedIncomingWaMessageIds.set(cleanWaMsgId, Date.now());
    pruneMapByTtl(processedIncomingWaMessageIds, 2000, 600000);
  }

  // 1b. Resolve strictly the business owning the receiving phone_number_id (NO cross-business fallback)
  let business: any = null;
  if (waPhoneNumberId) {
    const waConfig = await prisma.whatsAppConfig.findFirst({
      where: { waPhoneNumberId: String(waPhoneNumberId).trim() },
      orderBy: [{ isConnected: "desc" }, { updatedAt: "desc" }],
      include: { business: true },
    });
    if (waConfig?.business) {
      if (businessId && waConfig.business.id !== businessId) {
        console.warn(
          `[AI Isolation] Rejecting reply: phone_number_id ${waPhoneNumberId} belongs to business ${waConfig.business.id}, not ${businessId}.`
        );
        return null;
      }
      business = {
        ...waConfig.business,
        whatsappConfig: waConfig,
      };
    }
  } else if (businessId) {
    business = await prisma.business.findUnique({
      where: { id: businessId },
      include: { whatsappConfig: true },
    });
  }

  if (!business) {
    console.warn("[AI Assistant] Skipping reply: no business matched receiving phone_number_id/businessId.");
    return null;
  }

  // Never auto-reply if AI is disabled on this business
  if (business.aiBotEnabled !== true) {
    console.log(`🤖 AI Auto-Reply disabled for business: ${business.name} (${business.id})`);
    return null;
  }

  // Never reply to our own business phone number (echo guard)
  const ownPhoneDigits = String(business.whatsappConfig?.displayPhoneNumber || "").replace(/[^0-9]/g, "");
  if (
    ownPhoneDigits &&
    ownPhoneDigits.length >= 10 &&
    cleanPhone.slice(-10) === ownPhoneDigits.slice(-10)
  ) {
    console.log(`🤖 [AI Guard] Skipping own business phone echo +${cleanPhone}.`);
    return null;
  }

  // Per-(businessId, customerPhone) concurrency lock
  const conversationLockKey = `${business.id}:${normalizedPhoneKey}`;
  if (activeConversationLocks.has(conversationLockKey)) {
    console.log(`🔒 [AI LOCK] Concurrent AI reply already in progress for ${conversationLockKey}. Skipping duplicate.`);
    return null;
  }

  const contentDedupKey = `${conversationLockKey}:${cleanIncomingText.toLowerCase()}`;
  const lastContentAt = recentAiContentReplies.get(contentDedupKey);
  if (lastContentAt && Date.now() - lastContentAt < 12000) {
    console.log(`🤖 [AI DEDUP] Skipping duplicate identical prompt within 12s for ${conversationLockKey}.`);
    return null;
  }

  activeConversationLocks.add(conversationLockKey);
  recentAiContentReplies.set(contentDedupKey, Date.now());
  pruneMapByTtl(recentAiContentReplies, 2000, 120000);

  try {
    // Verify we don't duplicate an incoming DB record reply if DB already recorded a subsequent AI reply for same waMessageId
    if (cleanWaMsgId) {
      const incomingRecord = await prisma.incomingMessage.findFirst({
        where: { waMessageId: cleanWaMsgId, businessId: business.id },
        select: { timestamp: true },
      });
      if (incomingRecord) {
        const existingAiAfter = await prisma.incomingMessage.findFirst({
          where: {
            businessId: business.id,
            fromPhone: { in: [cleanPhone, normalizedPhoneKey] },
            customerName: "__BUSINESS_AI__",
            timestamp: { gte: incomingRecord.timestamp },
          },
          select: { id: true, timestamp: true },
        });
        if (existingAiAfter && Math.abs(Date.now() - existingAiAfter.timestamp.getTime()) < 60000) {
          console.log(`🤖 [AI DEDUP] Recent AI reply already exists for ${conversationLockKey}. Skipping.`);
          return null;
        }
      }
    }

    // 2. Fetch recent conversation context strictly scoped to this businessId
    const pastIncoming = await prisma.incomingMessage.findMany({
      where: {
        businessId: business.id,
        fromPhone: { in: [cleanPhone, normalizedPhoneKey] },
      },
      orderBy: { timestamp: "desc" },
      take: 6,
    });
    pastIncoming.reverse();

    const conversationHistoryText = pastIncoming
      .map((m) => {
        const speaker =
          m.customerName === "__BUSINESS_AI__" || m.customerName === "__BUSINESS_REPLY__"
            ? "Assistant"
            : m.customerName || "Customer";
        return `${speaker}: "${m.messageText}"`;
      })
      .join("\n");

    // 3. Setup Gemini AI (strictly from environment)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      console.warn("⚠️ GEMINI_API_KEY is missing in environment. Skipping AI auto-reply.");
      return null;
    }
    const genAI = new GoogleGenerativeAI(apiKey.trim());

    const businessName = business.name?.trim() || "Our Business";
    const category = business.category?.trim() || "";
    const description = business.businessDescription?.trim() || "";
    const services = business.servicesAndPricing?.trim() || "";
    const workingHours = business.workingHours?.trim() || "";
    const address = business.address?.trim() || "";
    const contactPhone = business.phone?.trim() || "";
    const locationMapLink = business.locationMapLink?.trim() || "";
    const bookingLink = business.defaultBookingLink?.trim() || "";
    const website = business.website?.trim() || "";
    const customInstructions = business.aiCustomInstructions?.trim() || "";
    const allowBooking = business.autoBookingEnabled !== false;

    // Build knowledge lines ONLY for populated profile fields (never invent defaults/placeholders)
    const knowledgeLines: string[] = [`- Business Name: ${businessName}`];
    if (category) knowledgeLines.push(`- Category: ${category}`);
    if (description) knowledgeLines.push(`- About Business: ${description}`);
    if (services) knowledgeLines.push(`- Services Offered & Pricing: ${services}`);
    if (workingHours) knowledgeLines.push(`- Working Hours: ${workingHours}`);
    if (address) knowledgeLines.push(`- Physical Address: ${address}`);
    if (contactPhone) knowledgeLines.push(`- Contact Phone: ${contactPhone}`);
    if (locationMapLink) knowledgeLines.push(`- Google Maps Link: ${locationMapLink}`);
    if (bookingLink) knowledgeLines.push(`- Direct Online Booking Link: ${bookingLink}`);
    if (website) knowledgeLines.push(`- Website: ${website}`);
    if (customInstructions) knowledgeLines.push(`- Special Owner Instructions: ${customInstructions}`);

    const systemPrompt = `
You are the warm, polite, respectful human WhatsApp assistant chatting for "${businessName}".

BUSINESS KNOWLEDGE BASE (ONLY SHARE DETAILS EXPLICITLY LISTED HERE):
${knowledgeLines.join("\n")}

STRICT SAFETY & HUMAN CHAT RULES:
1. TALK LIKE A REAL HUMAN ON WHATSAPP:
   - Keep replies crisp and natural (1 to 3 short sentences max).
   - Match the customer's language naturally (English, Telugu/Telugish, or Hindi/Hinglish).
   - No robotic bot disclaimers or long bulleted manuals.

2. NEVER OUTPUT PLACEHOLDERS OR MISSING FIELDS:
   - NEVER write bracketed placeholders like "[Insert Phone Number]", "[Address]", "[Link]", "[Booking Link]", "[Business Name]", "[Insert ...]", or "[Your ...]".
   - If Phone, Address, Maps Link, Website, Pricing, or Booking Link is NOT listed in the BUSINESS KNOWLEDGE BASE above, simply DO NOT mention that field or link at all — invite the customer to ask right here in chat instead.

3. APPOINTMENT BOOKING ASSISTANCE:
   - If the customer wants to book an appointment and hasn't shared service/date/time, politely ask for those details.
   - ${
     allowBooking
       ? `If date and time are confirmed, confirm warmly and append this hidden tag at the very end:
     <<<BOOK_APPOINTMENT:{"customerName":"${customerName || "Customer"}","phone":"${cleanPhone}","date":"YYYY-MM-DD","time":"HH:MM AM/PM","service":"service name","notes":"any note"}>>>
     (Calculate relative dates from today ${new Date().toISOString().slice(0, 10)}.)`
       : "Help answer their inquiry politely right here in chat."
   }

${conversationHistoryText ? `RECENT CONVERSATION:\n${conversationHistoryText}\n` : ""}
CUSTOMER'S LATEST MESSAGE:
"${cleanIncomingText}"

Write your short, warm WhatsApp reply now (NO square-bracket placeholders):
`;

    const candidateModels = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-flash-latest",
    ];

    let replyText = "";
    for (const m of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent(systemPrompt);
        replyText = result.response.text().trim();
        if (replyText) break;
      } catch (err: any) {
        console.warn(`Model ${m} failed in AI Assistant:`, err?.message || err);
      }
    }

    if (!replyText) {
      return null;
    }

    // 4. Extract any BOOK_APPOINTMENT tag before placeholder safety guard
    const appointmentMatch = replyText.match(/<<<BOOK_APPOINTMENT:([\s\S]*?)>>>/);
    if (appointmentMatch && appointmentMatch[1]) {
      try {
        const appointmentData = JSON.parse(appointmentMatch[1].trim());
        const appDate = appointmentData.date
          ? new Date(appointmentData.date)
          : new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.appointment.create({
          data: {
            businessId: business.id,
            customerName: appointmentData.customerName || customerName || "Customer",
            customerPhone: cleanPhone,
            serviceName: appointmentData.service || "Appointment",
            appointmentDate: isNaN(appDate.getTime()) ? new Date() : appDate,
            slotTime: appointmentData.time || "11:00 AM",
            status: "CONFIRMED",
            bookedBy: "AI_CHATBOT",
            notes: appointmentData.notes || `Booked via WhatsApp AI from: "${cleanIncomingText}"`,
          },
        });
        console.log(`✅ AI Booked Appointment successfully for ${cleanPhone} (Business: ${business.id})`);
      } catch (err) {
        console.error("Failed to parse & save AI appointment:", err);
      }

      replyText = replyText.replace(/<<<BOOK_APPOINTMENT:[\s\S]*?>>>/, "").trim();
    }

    // Final placeholder safety check: block sending any reply with bracketed placeholders like [Insert ...]
    if (!replyText || containsPlaceholderBrackets(replyText)) {
      console.warn(
        `🛡️ [AI Safety Guard] Blocked AI reply containing unresolved placeholder for business ${business.id}: "${replyText}"`
      );
      return null;
    }

    // 5. Send reply strictly using the connected business's own WhatsAppConfig
    const config = business.whatsappConfig || {};
    const clientToken = decryptToken(config.waToken);
    if (!clientToken || !config.waPhoneNumberId) {
      console.warn(`[AI Assistant] Business ${business.id} has no connected waToken/waPhoneNumberId.`);
      return null;
    }

    const sendResult = await sendWhatsAppTemplateMessage(
      {
        waToken: clientToken,
        waPhoneNumberId: config.waPhoneNumberId,
        waApiVersion: getMetaGraphVersion(config.waApiVersion),
      },
      cleanPhone,
      customerName || "Customer",
      "direct_message",
      "en",
      undefined,
      {
        is24HourWindow: true,
        freeFormText: replyText,
        businessName,
      }
    );

    if (!sendResult.success) {
      console.warn(
        `⚠️ Direct AI reply failed for business ${business.id} (${sendResult.errorMessage}). Not sending unapproved fallback.`
      );
      return null;
    }

    try {
      await prisma.incomingMessage.create({
        data: {
          businessId: business.id,
          fromPhone: cleanPhone,
          customerName: "__BUSINESS_AI__",
          messageText: replyText,
          waMessageId: sendResult.waMessageId || `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("Failed to save AI reply to incomingMessage:", dbErr);
    }

    console.log(`🤖 AI Auto-Reply sent to +${cleanPhone} (Business: ${business.id}): "${replyText}"`);

    return {
      success: sendResult.success,
      replyText,
      waMessageId: sendResult.waMessageId,
    };
  } catch (error: any) {
    console.error("Error in handleIncomingAiReply:", error);
    return null;
  } finally {
    activeConversationLocks.delete(conversationLockKey);
  }
}
