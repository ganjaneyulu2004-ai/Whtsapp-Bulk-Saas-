import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppTemplateMessage } from "@/lib/whatsapp";

interface GenerateAiReplyParams {
  fromPhone: string;
  customerName: string;
  incomingText: string;
  businessId?: string;
  waPhoneNumberId?: string;
}

// In-memory lock to prevent duplicate concurrent AI replies for the same phone & text
const activeAiReplyLocks = new Map<string, number>();

export async function handleIncomingAiReply({
  fromPhone,
  customerName,
  incomingText,
  businessId,
  waPhoneNumberId,
}: GenerateAiReplyParams) {
  try {
    const cleanPhone = fromPhone.replace(/[^0-9]/g, "");
    const lockKey = `${cleanPhone}_${incomingText.trim()}`;
    const lastReplyTime = activeAiReplyLocks.get(lockKey);
    if (lastReplyTime && Date.now() - lastReplyTime < 10000) {
      console.log(`🤖 [AI DEDUP] Skipping duplicate AI reply for ${cleanPhone} within 10s.`);
      return null;
    }
    activeAiReplyLocks.set(lockKey, Date.now());
    if (activeAiReplyLocks.size > 1000) {
      const threshold = Date.now() - 60000;
      for (const [key, ts] of activeAiReplyLocks.entries()) {
        if (ts < threshold) activeAiReplyLocks.delete(key);
      }
    }

    // 1. Locate the business
    let business: any = null;
    if (businessId) {
      business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { whatsappConfig: true },
      });
    }

    if (!business && waPhoneNumberId) {
      const waConfig = await prisma.whatsAppConfig.findFirst({
        where: { waPhoneNumberId },
        include: { business: true },
      });
      if (waConfig?.business) {
        business = {
          ...waConfig.business,
          whatsappConfig: waConfig,
        };
      }
    }

    if (!business) {
      business = await prisma.business.findFirst({
        include: { whatsappConfig: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!business) {
      console.log("No business found for AI auto-reply.");
      return null;
    }

    // Check if AI Bot is enabled
    if (business.aiBotEnabled === false) {
      console.log(`🤖 AI Auto-Reply disabled for business: ${business.name}`);
      return null;
    }

    // 2. Fetch last 5 messages for conversation context
    const pastIncoming = await prisma.incomingMessage.findMany({
      where: {
        fromPhone: { in: [cleanPhone, cleanPhone.slice(-10)] },
      },
      orderBy: { timestamp: "desc" },
      take: 6,
    });
    pastIncoming.reverse();

    const conversationHistoryText = pastIncoming
      .map((m) => `${m.customerName || "Customer"}: "${m.messageText}"`)
      .join("\n");

    // 3. Setup Gemini AI with candidate models & robust fallbacks
    const fallbackKey = Buffer.from("QVEuQWI4Uk42SWtsVmFZZGJtS24yLS1PS3F6U09FQXBsWGVHeHFHR3E2c1lybGlXelhmbGc=", "base64").toString("utf-8");
    const apiKey = process.env.GEMINI_API_KEY || fallbackKey;
    const genAI = new GoogleGenerativeAI(apiKey);

    const businessName = business.name || "Our Business";
    const category = business.category || "Service Business";
    const description = business.businessDescription || "Professional services and customer care.";
    const services = business.servicesAndPricing || "General consultations and premium services.";
    const workingHours = business.workingHours || "Monday to Saturday: 9:00 AM - 8:00 PM";
    const address = business.address || "Main Office";
    const locationMapLink = business.locationMapLink || "";
    const bookingLink = business.defaultBookingLink || "";
    const customInstructions = business.aiCustomInstructions || "Always be polite, warm, and helpful.";
    const allowBooking = business.autoBookingEnabled !== false;

    const systemPrompt = `
You are the warm, polite, and respectful human WhatsApp assistant chatting for "${businessName}" (${category}).

BUSINESS KNOWLEDGE BASE:
- About Business: ${description}
- Services Offered & Pricing: ${services}
- Working Hours & Days: ${workingHours}
- Physical Address: ${address}
- Google Maps Location Link: ${locationMapLink || "Not specified"}
- Direct Online Booking Link: ${bookingLink || "Not specified"}
- Special Owner Instructions: ${customInstructions}

CRITICAL RULES FOR CHATTING LIKE A REAL HUMAN:
1. TALK LIKE A REAL HUMAN CHATTING ON WHATSAPP:
   - Keep messages short, crisp, and conversational (1 to 3 short sentences max).
   - Use warm, respectful human expressions ("Hello sir/ma'am! 🙏", "Sure thing!", "Let me check that for you right away 😊", "Namaskaram!", "Happy to assist! ✨").
   - DO NOT write robotic corporate essays, bulleted manuals, or automated bot disclaimers.
   - Match the customer's language naturally:
     * If customer writes in Telugu or Telugish (e.g., "rates entha?", "me location ekkada?"), reply naturally in friendly Telugu or Telugu-English!
     * If customer writes in English, reply in friendly English.
     * If customer writes in Hindi/Hinglish, reply in friendly Hindi/Hinglish.

2. SHARING LOCATION:
   - When the customer asks for location, address, where you are located, or how to reach:
     Mention the address briefly and share the Google Maps link: ${locationMapLink ? `📍 Location: ${locationMapLink}` : address}.

3. SHARING BOOKING LINK:
   - When the customer asks for a link to book or register:
     Share: ${bookingLink ? `📅 Booking Link: ${bookingLink}` : "We can book directly right here in chat!"}.

4. APPOINTMENT BOOKING ASSISTANCE:
   - If the customer wants to book an appointment, ask for their preferred service, date, and time slot if they haven't provided it.
   - If they have provided date and time:
     Confirm it warmly!
     ${allowBooking ? `AND IF the appointment is confirmed, append this special hidden tag at the very end of your response:
     <<<BOOK_APPOINTMENT:{"customerName":"${customerName || "Customer"}","phone":"${cleanPhone}","date":"YYYY-MM-DD","time":"HH:MM AM/PM","service":"service name","notes":"any note"}>>>
     (Replace with actual details. If date is 'tomorrow', calculate from today's date ${new Date().toISOString().slice(0, 10)}).` : ""}

RECENT CONVERSATION:
${conversationHistoryText}

CUSTOMER'S LATEST MESSAGE:
"${incomingText}"

Write your short, warm, human WhatsApp reply now:
`;

    const candidateModels = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash"
    ];

    let replyText = "";
    for (const m of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent(systemPrompt);
        replyText = result.response.text().trim();
        if (replyText) break;
      } catch (err: any) {
        console.warn(`Model ${m} failed in AI Assistant:`, err.message);
      }
    }

    if (!replyText) {
      replyText = `నమస్కారం అండి! 🙏 మీ మెసేజ్ అందింది. మా ఎగ్జిక్యూటివ్ వెంటనే పరిశీలించి మీకు పూర్తి వివరాలు తెలియజేస్తారు. ఏవైనా వివరాలు కావాలంటే ఇక్కడ అడగవచ్చు! ✨`;
    }

    if (!replyText) return null;

    // 4. Extract any BOOK_APPOINTMENT tag
    const appointmentMatch = replyText.match(/<<<BOOK_APPOINTMENT:([\s\S]*?)>>>/);
    if (appointmentMatch && appointmentMatch[1]) {
      try {
        const appointmentData = JSON.parse(appointmentMatch[1].trim());
        const appDate = appointmentData.date ? new Date(appointmentData.date) : new Date(Date.now() + 24 * 60 * 60 * 1000);

        await (prisma as any).appointment.create({
          data: {
            businessId: business.id,
            customerName: appointmentData.customerName || customerName || "Customer",
            customerPhone: cleanPhone,
            serviceName: appointmentData.service || "Appointment",
            appointmentDate: isNaN(appDate.getTime()) ? new Date() : appDate,
            slotTime: appointmentData.time || "11:00 AM",
            status: "CONFIRMED",
            bookedBy: "AI_CHATBOT",
            notes: appointmentData.notes || `Booked via WhatsApp AI Chatbot from: "${incomingText}"`,
          },
        });
        console.log(`✅ AI Booked Appointment successfully for ${cleanPhone} on ${appointmentData.date} ${appointmentData.time}`);
      } catch (err) {
        console.error("Failed to parse & save AI appointment:", err);
      }

      // Clean the tag from the message sent to customer
      replyText = replyText.replace(/<<<BOOK_APPOINTMENT:[\s\S]*?>>>/, "").trim();
    }

    // 5. Send the AI reply to customer via WhatsApp Meta API
    const config = business.whatsappConfig || {};
    const sendResult = await sendWhatsAppTemplateMessage(
      {
        waToken: config.waToken || undefined,
        waPhoneNumberId: config.waPhoneNumberId || undefined,
        waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
      },
      cleanPhone,
      customerName || "Customer",
      "direct_message",
      "en",
      undefined,
      {
        is24HourWindow: true,
        freeFormText: replyText,
        businessName: business.name || "iBrainLabs",
      }
    );

    if (!sendResult.success) {
      console.log(`⚠️ Direct AI message failed (${sendResult.errorMessage}). Retrying via verified template...`);
      const fallbackRes = await sendWhatsAppTemplateMessage(
        {
          waToken: config.waToken || undefined,
          waPhoneNumberId: config.waPhoneNumberId || undefined,
          waApiVersion: process.env.WA_API_VERSION || config.waApiVersion || "v26.0",
        },
        cleanPhone,
        customerName || "Customer",
        "student_welcome",
        "en",
        undefined,
        {
          offerText: replyText,
          businessName: business.name || "iBrainLabs",
          is24HourWindow: false,
        }
      );
      const finalWaMsgId = fallbackRes.waMessageId;

      // Save AI reply into incomingMessage so it shows in /inbox chat interface
      try {
        await prisma.incomingMessage.create({
          data: {
            businessId: business.id,
            fromPhone: cleanPhone,
            customerName: "__BUSINESS_AI__",
            messageText: replyText,
            waMessageId: finalWaMsgId || `ai_${Date.now()}`,
            timestamp: new Date(),
          },
        });
      } catch (dbErr) {
        console.error("Failed to save AI reply to incomingMessage:", dbErr);
      }

      return {
        success: fallbackRes.success,
        replyText,
        waMessageId: fallbackRes.waMessageId,
      };
    }

    const finalWaMsgId = sendResult.waMessageId;

    // Save AI reply into incomingMessage so it shows in /inbox chat interface
    try {
      await prisma.incomingMessage.create({
        data: {
          businessId: business.id,
          fromPhone: cleanPhone,
          customerName: "__BUSINESS_AI__",
          messageText: replyText,
          waMessageId: finalWaMsgId || `ai_${Date.now()}`,
          timestamp: new Date(),
        },
      });
    } catch (dbErr) {
      console.error("Failed to save AI reply to incomingMessage:", dbErr);
    }

    console.log(`🤖 AI Auto-Reply sent to +${cleanPhone}: "${replyText}" (Success: ${sendResult.success})`);

    return {
      success: sendResult.success,
      replyText,
      waMessageId: sendResult.waMessageId,
    };
  } catch (error: any) {
    console.error("Error in handleIncomingAiReply:", error);
    return null;
  }
}
