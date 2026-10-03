import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedPosterDetails {
  business_name: string | null;
  business_type: string | null;
  offer_title: string | null;
  discount: string | null;
  products_or_services: string | null;
  occasion: string | null;
  valid_from: string | null;
  valid_till: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  social_handle: string | null;
  other_key_text: string | null;
  poster_language: string | null; // "English" | "Telugu" | "Hindi" | "Other"
}

export interface GeneratedOfferTextOptions {
  short: string;
  standard: string;
  detailed: string;
  festive: string;
}

export interface PosterAnalysisResponse {
  success: boolean;
  extractedDetails: ExtractedPosterDetails;
  generatedOptions: GeneratedOfferTextOptions;
  error?: string;
}

export function sanitizeOfferText(text: string, bookingLink?: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/[\r\n\t]/g, " ")
    .replace(/ {5,}/g, "    ")
    .replace(/\s+/g, " ")
    .trim();

  const bLink = bookingLink?.trim();
  if (bLink && !cleaned.includes(bLink)) {
    cleaned = `${cleaned} 👉 ${bLink}`;
  }

  return cleaned.substring(0, 300);
}

export const sanitizeMetaVariableText = sanitizeOfferText;

function buildBalancedOffer(
  startEmoji: string,
  title: string,
  whatCustomerGets: string,
  callToAction: string,
  bookingLink?: string
): string {
  const cleanTitle = title.replace(/\*/g, "").substring(0, 35).trim();
  const cleanSentence = whatCustomerGets.replace(/\.$/, "").substring(0, 100).trim();
  const cleanCta = callToAction.replace(/\.$/, "").trim();
  const bLink = bookingLink?.trim();

  const linkPart = bLink ? ` 👉 ${bLink}` : "";
  const full = `${startEmoji} *${cleanTitle}* – ${cleanSentence}. ${cleanCta}${linkPart}`;
  return sanitizeOfferText(full);
}

export async function analyzePosterWithGemini(
  base64Image: string,
  mimeType: string,
  targetLang: string = "auto",
  userNote?: string,
  apiKey?: string,
  bookingLink?: string
): Promise<PosterAnalysisResponse> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.trim() === "" || geminiKey === "your-gemini-api-key") {
    console.error("❌ GEMINI_API_KEY is missing or invalid in environment.");
    return {
      success: false,
      extractedDetails: emptyExtractedDetails(),
      generatedOptions: { short: "", standard: "", detailed: "", festive: "" },
      error: "Gemini API key is not configured. Please set GEMINI_API_KEY in .env.",
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let responseText = "";

    const bookingRule = bookingLink && bookingLink.trim()
      ? `Append " 👉 ${bookingLink.trim()}" at the end of each option.`
      : `If no booking link is provided, end each option immediately after the call to action.`;

    const prompt = `You are a precise vision OCR & WhatsApp Marketing AI assistant.
Analyze this promotional poster image carefully.

CRITICAL INSTRUCTIONS:
- Extract ONLY what is actually visible on the poster image.
- NEVER invent, guess, assume, or hallucinate details.
- If a field is not explicitly visible in the poster image, return null for that field.
- The poster can be for any type of business (e.g. Studio, Jungle Safari / Resort, Restaurant, Store, Clinic, Event, etc.).
- If there is NO specific discount or percentage (only a promotion/invitation), set "discount" to null and extract the promotional offer title and services.

OFFER TEXT (VARIABLE {{2}}) FORMAT RULES:
Generate 3 distinct options (short, standard, festive) that strictly adhere to this exact balanced format:
"<1 emoji> *<title>* – <one short sentence about what the customer gets>. <short call to action>${bookingLink && bookingLink.trim() ? " 👉 " + bookingLink.trim() : ""}"

Example:
"🎙️ *Studio Booking @ ₹1,999/hour* – Podcast, video shoot & green screen studio with editing support. Book your slot today 👉 https://vaivastudios.com/online-booking/"

STRICT RULES:
1. Title: max 35 characters, in *bold* (WhatsApp bold using asterisks), from the poster.
2. One sentence only: max 100 characters, only facts visible on the poster (what the customer gets).
3. Call to action: short (e.g. "Book your slot today", "Visit us this weekend", "Limited slots").
4. Exactly 2 emojis: one relevant emoji at the start, and 👉 right before the booking link. (If no booking link, exactly 1 emoji at the start).
5. Strictly NO "|" pipe separators.
6. Never output empty segments. Trim extra spaces. Single line only (no new lines, no tabs).
7. ${bookingRule}
8. Max 300 characters total. Do NOT include the customer name or business name (the template already has them in greeting and footer).
9. Language: ${targetLang === "auto" ? "Same language as poster_language" : targetLang}.

Return ONLY a valid JSON object matching this EXACT structure:
{
  "extractedDetails": {
    "business_name": string or null,
    "business_type": string or null,
    "offer_title": string or null,
    "discount": string or null (e.g. "30% OFF", "Buy 1 Get 1", or null if not visible),
    "products_or_services": string or null,
    "occasion": string or null,
    "valid_from": string or null,
    "valid_till": string or null,
    "location": string or null,
    "phone": string or null,
    "website": string or null,
    "social_handle": string or null,
    "other_key_text": string or null,
    "poster_language": "English" or "Telugu" or "Hindi" or "Other"
  },
  "generatedOptions": {
    "short": "Short, concise option in the exact balanced format (max 300 chars, NO newlines)",
    "standard": "Standard professional option in the exact balanced format (max 300 chars, NO newlines)",
    "festive": "Festive/celebratory option in the exact balanced format (max 300 chars, NO newlines)"
  }
}`;

    const imagePart = {
      inlineData: {
        data: base64Image.replace(/^data:image\/\w+;base64,/, ""),
        mimeType: mimeType || "image/jpeg",
      },
    };

    let lastError: any = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([prompt, imagePart]);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        console.warn(`⚠️ Model ${modelName} failed, trying fallback. Reason:`, err.message);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("All Gemini vision model candidates failed.");
    }

    console.log("=== Raw Gemini Vision Response ===");
    console.log(responseText);

    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedText);

    const extractedDetails: ExtractedPosterDetails = {
      business_name: parsed.extractedDetails?.business_name || null,
      business_type: parsed.extractedDetails?.business_type || null,
      offer_title: parsed.extractedDetails?.offer_title || null,
      discount: parsed.extractedDetails?.discount || null,
      products_or_services: parsed.extractedDetails?.products_or_services || null,
      occasion: parsed.extractedDetails?.occasion || null,
      valid_from: parsed.extractedDetails?.valid_from || null,
      valid_till: parsed.extractedDetails?.valid_till || null,
      location: parsed.extractedDetails?.location || null,
      phone: parsed.extractedDetails?.phone || null,
      website: parsed.extractedDetails?.website || null,
      social_handle: parsed.extractedDetails?.social_handle || null,
      other_key_text: parsed.extractedDetails?.other_key_text || null,
      poster_language: parsed.extractedDetails?.poster_language || "English",
    };

    const shortOpt = sanitizeOfferText(parsed.generatedOptions?.short || "", bookingLink);
    const standardOpt = sanitizeOfferText(parsed.generatedOptions?.standard || parsed.generatedOptions?.detailed || "", bookingLink);
    const festiveOpt = sanitizeOfferText(parsed.generatedOptions?.festive || "", bookingLink);

    return {
      success: true,
      extractedDetails,
      generatedOptions: {
        short: shortOpt,
        standard: standardOpt,
        detailed: standardOpt,
        festive: festiveOpt,
      },
    };
  } catch (err: any) {
    console.error("❌ Gemini Vision API Error:", err.message || err);
    return {
      success: false,
      extractedDetails: emptyExtractedDetails(),
      generatedOptions: { short: "", standard: "", detailed: "", festive: "" },
      error: `Could not read poster image with Gemini Vision AI (${err.message || "Invalid image file"}). Please try uploading a clearer image or retry.`,
    };
  }
}

export function generateOfferOptionsFromDetails(
  details: ExtractedPosterDetails,
  lang: string = "English",
  bookingLink?: string
): GeneratedOfferTextOptions {
  const title = (details.offer_title || details.occasion || "Exclusive Offer").trim();
  const discount = details.discount?.trim() || "";
  const services = (details.products_or_services || "Special Packages").trim();
  const validTill = details.valid_till ? `Valid till ${details.valid_till}` : "";

  const isTelugu = lang === "Telugu" || details.poster_language === "Telugu";
  const isHindi = lang === "Hindi" || details.poster_language === "Hindi";

  if (isTelugu) {
    if (discount) {
      const shortOpt = buildBalancedOffer("🎉", `${title} – ${discount}`, `${services} పై ఆకర్షణీయమైన తగ్గింపు పొందండి`, "ఈ రోజే సంప్రదించండి", bookingLink);
      const standardOpt = buildBalancedOffer("✨", `${title} – ${discount}`, `మా వద్ద ${services} పై ప్రత్యేక ఆఫర్లు ప్రారంభమయ్యాయి`, "మీ స్లాట్ బుక్ చేసుకోండి", bookingLink);
      const festiveOpt = buildBalancedOffer("🌸", `పండుగ ఆఫర్ – ${discount}`, `${services} పై విశేష ప్రయోజనాలు మరియు డిస్కౌంట్ పొందండి`, "త్వరపడండి", bookingLink);
      return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
    } else {
      const shortOpt = buildBalancedOffer("🌿", title, `${services} బుకింగ్స్ అందుబాటులో ఉన్నాయి`, "ఈ రోజే సంప్రదించండి", bookingLink);
      const standardOpt = buildBalancedOffer("✨", title, `మా వద్ద ${services} ఉత్తమ అనుభూతిని పొందండి`, "మీ స్లాట్ బుక్ చేసుకోండి", bookingLink);
      const festiveOpt = buildBalancedOffer("🌸", `ప్రత్యేక అవకాశం – ${title}`, `${services} కోసం ఇప్పుడే రిజర్వ్ చేసుకోండి`, "ఈ రోజే సందర్శించండి", bookingLink);
      return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
    }
  }

  if (isHindi) {
    if (discount) {
      const shortOpt = buildBalancedOffer("🎉", `${title} – ${discount}`, `${services} पर शानदार छूट और ऑफर उपलब्ध है`, "आज ही संपर्क करें", bookingLink);
      const standardOpt = buildBalancedOffer("✨", `${title} – ${discount}`, `${services} पर विशेष पैकेज का लाभ उठाएं`, "अपना स्लॉट बुक करें", bookingLink);
      const festiveOpt = buildBalancedOffer("🌸", `त्योहार ऑफर – ${discount}`, `${services} पर पाएं आकर्षक छूट और बेहतरीन सुविधाएं`, "जल्दी करें", bookingLink);
      return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
    } else {
      const shortOpt = buildBalancedOffer("🌿", title, `${services} के लिए बुकिंग शुरू हो चुकी है`, "आज ही संपर्क करें", bookingLink);
      const standardOpt = buildBalancedOffer("✨", title, `${services} का शानदार और प्रीमियम अनुभव प्राप्त करें`, "अपना स्लॉट बुक करें", bookingLink);
      const festiveOpt = buildBalancedOffer("🌸", `विशेष आमंत्रण – ${title}`, `${services} का आनंद लेने के लिए आज ही जुड़ें`, "आज ही पधारें", bookingLink);
      return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
    }
  }

  // Default English
  if (discount) {
    const fullTitle = `${title} – ${discount}`;
    const shortOpt = buildBalancedOffer("🎉", fullTitle, services, "Limited slots available", bookingLink);
    const standardOpt = buildBalancedOffer("✨", fullTitle, `${services}${validTill ? ` with validity ${validTill}` : ""}`, "Book your slot today", bookingLink);
    const festiveOpt = buildBalancedOffer("🌟", `Festive Deal – ${discount}`, `Enjoy ${services} at exclusive celebration rates`, "Reserve your offer now", bookingLink);
    return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
  } else {
    const shortOpt = buildBalancedOffer("🌿", title, services, "Book your slot today", bookingLink);
    const standardOpt = buildBalancedOffer("✨", title, `Experience ${services} with premium facilities`, "Visit us this weekend", bookingLink);
    const festiveOpt = buildBalancedOffer("🌟", `Special – ${title}`, `Discover ${services} and enjoy memorable moments`, "Reserve your spot today", bookingLink);
    return { short: shortOpt, standard: standardOpt, detailed: standardOpt, festive: festiveOpt };
  }
}

export function emptyExtractedDetails(): ExtractedPosterDetails {
  return {
    business_name: null,
    business_type: null,
    offer_title: null,
    discount: null,
    products_or_services: null,
    occasion: null,
    valid_from: null,
    valid_till: null,
    location: null,
    phone: null,
    website: null,
    social_handle: null,
    other_key_text: null,
    poster_language: "English",
  };
}
