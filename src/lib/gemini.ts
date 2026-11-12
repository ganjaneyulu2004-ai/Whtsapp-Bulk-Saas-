import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedPosterDetails {
  business_name: string | null;
  business_type: string | null;
  offer_title: string | null;
  discount: string | null;
  price: string | null;
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
  suggestedVariables?: Record<string, string | null>;
  error?: string;
}

export function limitEmojis(text: string, maxEmojis = 2): string {
  if (!text) return "";
  try {
    const emojiRegex = new RegExp("\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic})*", "gu");
    let seen = 0;
    return text.replace(emojiRegex, (match) => {
      seen += 1;
      return seen <= maxEmojis ? match : "";
    });
  } catch {
    return text;
  }
}

export function sanitizeVariableValue(val: string | null | undefined, maxEmojis = 2): string | null {
  if (!val) return null;
  const singleLine = String(val)
    .replace(/[\r\n\t]/g, " ")
    .replace(/ {5,}/g, "    ")
    .replace(/\s+/g, " ")
    .trim();
  if (!singleLine) return null;
  const cleaned = limitEmojis(singleLine, maxEmojis).replace(/\s+/g, " ").trim().substring(0, 300).trim();
  return cleaned || null;
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

export function mapExtractedDetailsToTemplateVariables(
  details: ExtractedPosterDetails,
  templateBodyText?: string | null,
  options?: { bookingLink?: string; targetVariable?: number }
): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  if (!templateBodyText) return result;

  let maxIdx = 0;
  const varPositions: Array<{ idx: number; start: number; end: number }> = [];
  const regex = /\{\{(\d+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(templateBodyText)) !== null) {
    const idx = parseInt(m[1], 10);
    if (!Number.isNaN(idx) && idx > 0) {
      if (idx > maxIdx) maxIdx = idx;
      varPositions.push({ idx, start: m.index, end: m.index + m[0].length });
    }
  }

  for (let varNum = 1; varNum <= maxIdx; varNum++) {
    // Keep {{1}} as Contact Name unless user specifically regenerates {{1}}
    if (varNum === 1 && options?.targetVariable !== 1) continue;
    if (options?.targetVariable && options.targetVariable !== varNum) continue;

    const pos = varPositions.find((p) => p.idx === varNum);
    const before = pos
      ? templateBodyText.slice(Math.max(0, pos.start - 65), pos.start).toLowerCase()
      : "";
    const after = pos
      ? templateBodyText.slice(pos.end, Math.min(templateBodyText.length, pos.end + 45)).toLowerCase()
      : "";
    const context = `${before} ${after}`;

    let value: string | null = null;

    if (/\b(valid|till|until|expir|last date|ends on|end date|validity|date)\b/.test(context)) {
      value = details.valid_till
        ? details.valid_from
          ? `${details.valid_from} to ${details.valid_till}`
          : details.valid_till
        : null;
    } else if (/\b(link|url|website|book here|order here|visit us at|click)\b/.test(context)) {
      value = details.website || options?.bookingLink || null;
    } else if (/\b(phone|call|mobile|whatsapp|helpline|contact us at|dial)\b/.test(context)) {
      value = details.phone || null;
    } else if (/\b(price|cost|fee|rate|mrp|rs\.?|inr|₹|starting at|only at)\b/.test(context)) {
      value = details.price || null;
    } else if (/\b(discount|off|save|cashback)\b/.test(context) && !/\boffer\b/.test(context)) {
      value = details.discount || null;
    } else if (/\b(product|service|package|item|course|treatment|plan)\b/.test(context) && !/\boffer\b/.test(context)) {
      value = details.products_or_services || details.offer_title || null;
    } else if (/\b(shopping with|welcome to|team|brand|shop name|store name|company)\b/.test(context)) {
      value = details.business_name || null;
    } else if (/\b(location|address|venue|branch|city|visit)\b/.test(context) && !details.offer_title) {
      value = details.location || null;
    } else {
      // Offer / headline / general announcement slot (e.g. "special offer for you: {{2}}")
      const headline = [details.offer_title, details.discount].filter(Boolean).join(" – ");
      const tailParts = [details.products_or_services, details.price].filter(Boolean);
      const linkSuffix = details.website ? ` 👉 ${details.website}` : "";
      const phoneSuffix = !details.website && details.phone ? ` Call ${details.phone}` : "";
      const combined = [headline, tailParts.join(" · ")].filter(Boolean).join(": ");
      value = combined
        ? `${combined}${linkSuffix}${phoneSuffix}`
        : details.other_key_text || null;
    }

    result[String(varNum)] = sanitizeVariableValue(value, 2);
  }

  return result;
}

export async function analyzePosterWithGemini(
  base64Image: string,
  mimeType: string,
  targetLang: string = "auto",
  userNote?: string,
  apiKey?: string,
  bookingLink?: string,
  templateOptions?: {
    templateBodyText?: string;
    templateExamples?: string[];
    targetVariable?: number;
  }
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
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-2.5-flash"];
    let responseText = "";

    const bookingRule = bookingLink && bookingLink.trim()
      ? `Append " 👉 ${bookingLink.trim()}" at the end of each option.`
      : `If no booking link is provided, end each option immediately after the call to action.`;

    const templateMappingInstructions = templateOptions?.templateBodyText
      ? `
TEMPLATE VARIABLE MAPPING:
Selected WhatsApp template body text:
"""
${templateOptions.templateBodyText}
"""
${templateOptions.templateExamples?.length ? `Template variable examples (in order {{1}}..{{n}}): ${JSON.stringify(templateOptions.templateExamples)}` : ""}
${templateOptions.targetVariable ? `Focus especially on variable {{${templateOptions.targetVariable}}}.` : "Leave {{1}} empty/omitted (it defaults to Contact Name dynamically per recipient)."}
Rules for "suggestedVariables" object (keys "2", "3", etc.${templateOptions.targetVariable === 1 ? ' and "1"' : ""}):
- Inspect the surrounding words before/after each {{n}} in the template body text to decide what value fits naturally there (e.g., after "offer for you:" -> concise offer text with visible discount/product/price; after "valid till" -> visible expiry date; after "at" / "price" -> visible price; after "book" -> visible link/phone).
- Keep each variable concise, single-line, max 300 characters, NO newlines or tabs, and max 2 emojis.
- CRITICAL: NEVER invent a discount, percentage, price, or date! If the image has NO info for that variable (for example, template asks "valid till {{3}}" but the poster shows no date), return null for that key ("3": null).`
      : "";

    const prompt = `You are a precise vision OCR & WhatsApp Marketing AI assistant.
Analyze this promotional poster image carefully.

CRITICAL INSTRUCTIONS:
- Extract ONLY what is actually visible on the poster image.
- NEVER invent, guess, assume, or hallucinate details.
- If a field is not explicitly visible in the poster image, return null for that field.
- The poster can be for any type of business (e.g. Studio, Jungle Safari / Resort, Restaurant, Store, Clinic, Event, etc.).
- If there is NO specific discount or percentage (only a promotion/invitation), set "discount" to null and extract the promotional offer title, price (if visible), and products/services.
${templateMappingInstructions}

OFFER TEXT FORMAT RULES:
Generate 3 distinct options (short, standard, festive) that strictly adhere to this exact balanced format:
"<1 emoji> *<title>* – <one short sentence about what the customer gets>. <short call to action>${bookingLink && bookingLink.trim() ? " 👉 " + bookingLink.trim() : ""}"

Example:
"🎙️ *Studio Booking @ ₹1,999/hour* – Podcast, video shoot & green screen studio with editing support. Book your slot today 👉 https://vaivastudios.com/online-booking/"

STRICT RULES:
1. Title: max 35 characters, in *bold* (WhatsApp bold using asterisks), from the poster.
2. One sentence only: max 100 characters, only facts visible on the poster (what the customer gets).
3. Call to action: short (e.g. "Book your slot today", "Visit us this weekend", "Limited slots").
4. Max 2 emojis per variable or option.
5. Strictly NO "|" pipe separators.
6. Never output empty segments. Trim extra spaces. Single line only (no new lines, no tabs).
7. ${bookingRule}
8. Max 300 characters total.
9. Language: ${targetLang === "auto" ? "Same language as poster_language" : targetLang}.

Return ONLY a valid JSON object matching this EXACT structure:
{
  "extractedDetails": {
    "business_name": string or null,
    "business_type": string or null,
    "offer_title": string or null,
    "discount": string or null (e.g. "30% OFF", "Buy 1 Get 1", or null if not visible),
    "price": string or null (e.g. "₹1,499", "Starting ₹999", or null if not visible),
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
  }${templateOptions?.templateBodyText ? `,
  "suggestedVariables": {
    "<varNumber>": string or null
  }` : ""}
}`;

    const imagePart = {
      inlineData: {
        data: base64Image.replace(/^data:[^;]+;base64,/i, ""),
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
      price: parsed.extractedDetails?.price || null,
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

    const suggestedVariables: Record<string, string | null> = {};
    if (templateOptions?.templateBodyText) {
      const heuristicVars = mapExtractedDetailsToTemplateVariables(
        extractedDetails,
        templateOptions.templateBodyText,
        { bookingLink, targetVariable: templateOptions.targetVariable }
      );
      const rawSuggested =
        parsed.suggestedVariables && typeof parsed.suggestedVariables === "object"
          ? parsed.suggestedVariables
          : {};

      for (const varKey of Object.keys(heuristicVars)) {
        const aiVal = Object.prototype.hasOwnProperty.call(rawSuggested, varKey)
          ? sanitizeVariableValue(rawSuggested[varKey], 2)
          : heuristicVars[varKey];
        suggestedVariables[varKey] = aiVal;
      }
    }

    return {
      success: true,
      extractedDetails,
      generatedOptions: {
        short: shortOpt,
        standard: standardOpt,
        detailed: standardOpt,
        festive: festiveOpt,
      },
      ...(templateOptions?.templateBodyText ? { suggestedVariables } : {}),
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
    price: null,
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
