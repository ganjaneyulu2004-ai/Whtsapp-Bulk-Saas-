/**
 * Template variable helper and generic fallback resolver.
 * Pure TypeScript functions with no database or Node-only imports so it can be safely used
 * across client components, API routes, queue workers, and Gemini integration.
 */

export interface VariableExtractionDetails {
  business_name?: string | null;
  business_type?: string | null;
  offer_title?: string | null;
  discount?: string | null;
  price?: string | null;
  products_or_services?: string | null;
  occasion?: string | null;
  valid_from?: string | null;
  valid_till?: string | null;
  location?: string | null;
  phone?: string | null;
  website?: string | null;
  social_handle?: string | null;
  other_key_text?: string | null;
}

export interface BusinessVariableContext {
  name?: string | null;
  category?: string | null;
  bookingLink?: string | null;
  phone?: string | null;
  recipientName?: string | null;
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

export function sanitizeVariableValue(val: string | null | undefined, maxEmojis = 2): string {
  if (!val) return "";
  const singleLine = String(val)
    .replace(/[\r\n\t]/g, " ")
    .replace(/ {5,}/g, "    ")
    .replace(/\s+/g, " ")
    .trim();
  if (!singleLine) return "";
  return limitEmojis(singleLine, maxEmojis).replace(/\s+/g, " ").trim().substring(0, 300).trim();
}

/**
 * Extracts surrounding text around {{varNum}} in template bodyText.
 */
export function getVariableSurroundingContext(bodyText?: string | null, varNum?: number): string {
  if (!bodyText || !varNum) return "";
  const token = `{{${varNum}}}`;
  const pos = bodyText.indexOf(token);
  if (pos === -1) return "";
  const before = bodyText.slice(Math.max(0, pos - 65), pos).toLowerCase();
  const after = bodyText.slice(pos + token.length, Math.min(bodyText.length, pos + token.length + 45)).toLowerCase();
  return `${before} ${after}`;
}

/**
 * Resolves a safe, non-empty generic fallback for a template variable {{varNum}}.
 * Never invents a specific discount %, price, or exact date.
 *
 * Rules:
 * - name slot {{1}} -> contact name, fallback "Customer"
 * - valid-till/date slot -> "a limited time"
 * - offer/description slot -> short generic line about the business/service (e.g. "special pricing on our services")
 * - link/website slot -> booking link, website or "our website"
 * - phone slot -> phone or "our team"
 */
export function getGenericFallbackForVariable(
  varNum: number,
  bodyText?: string | null,
  details?: VariableExtractionDetails | null,
  biz?: BusinessVariableContext | null
): string {
  // {{1}} is Contact Name by default
  if (varNum === 1) {
    return sanitizeVariableValue(biz?.recipientName || "Customer", 2) || "Customer";
  }

  const context = getVariableSurroundingContext(bodyText, varNum);

  // 1. Date / validity slot -> "a limited time"
  if (/\b(valid|till|until|expir|last date|ends on|end date|validity|date)\b/.test(context)) {
    if (details?.valid_till && String(details.valid_till).trim()) {
      const v = details.valid_from
        ? `${details.valid_from} to ${details.valid_till}`
        : details.valid_till;
      return sanitizeVariableValue(v, 2) || "a limited time";
    }
    return "a limited time";
  }

  // 2. Link / URL slot
  if (/\b(link|url|website|book here|order here|visit us at|click)\b/.test(context)) {
    if (details?.website && String(details.website).trim()) {
      return sanitizeVariableValue(details.website, 2) || "our website";
    }
    if (biz?.bookingLink && String(biz.bookingLink).trim()) {
      return sanitizeVariableValue(biz.bookingLink, 2) || "our website";
    }
    return "our website";
  }

  // 3. Phone slot
  if (/\b(phone|call|mobile|whatsapp|helpline|contact us at|dial)\b/.test(context)) {
    if (details?.phone && String(details.phone).trim()) {
      return sanitizeVariableValue(details.phone, 2) || "our team";
    }
    if (biz?.phone && String(biz.phone).trim()) {
      return sanitizeVariableValue(biz.phone, 2) || "our team";
    }
    return "our team";
  }

  // 4. Price slot
  if (/\b(price|cost|fee|rate|mrp|rs\.?|inr|₹|starting at|only at)\b/.test(context)) {
    if (details?.price && String(details.price).trim()) {
      return sanitizeVariableValue(details.price, 2) || "special pricing";
    }
    return "special pricing";
  }

  // 5. Discount slot (isolated from offer text)
  if (/\b(discount|off|save|cashback)\b/.test(context) && !/\boffer\b/.test(context)) {
    if (details?.discount && String(details.discount).trim()) {
      return sanitizeVariableValue(details.discount, 2) || "special discount";
    }
    return "special discount";
  }

  // 6. Product / service slot
  if (/\b(product|service|package|item|course|treatment|plan)\b/.test(context) && !/\boffer\b/.test(context)) {
    if (details?.products_or_services && String(details.products_or_services).trim()) {
      return sanitizeVariableValue(details.products_or_services, 2) || "our services";
    }
    if (details?.offer_title && String(details.offer_title).trim()) {
      return sanitizeVariableValue(details.offer_title, 2) || "our services";
    }
    if (biz?.category && String(biz.category).trim()) {
      return sanitizeVariableValue(biz.category, 2) || "our services";
    }
    return "our services";
  }

  // 7. Business name / brand slot
  if (/\b(shopping with|welcome to|team|brand|shop name|store name|company)\b/.test(context)) {
    if (details?.business_name && String(details.business_name).trim()) {
      return sanitizeVariableValue(details.business_name, 2) || "our team";
    }
    if (biz?.name && String(biz.name).trim()) {
      return sanitizeVariableValue(biz.name, 2) || "our team";
    }
    return "our team";
  }

  // 8. Location slot
  if (/\b(location|address|venue|branch|city)\b/.test(context)) {
    if (details?.location && String(details.location).trim()) {
      return sanitizeVariableValue(details.location, 2) || "our center";
    }
    return "our center";
  }

  // 9. Offer / description / general announcement slot (e.g. "We have an offer for you: {{2}}")
  if (details?.offer_title || details?.discount || details?.products_or_services) {
    const headline = [details.offer_title, details.discount].filter(Boolean).join(" – ");
    const tailParts = [details.products_or_services, details.price].filter(Boolean);
    const combined = [headline, tailParts.join(" · ")].filter(Boolean).join(": ");
    const linkSuffix = details.website ? ` 👉 ${details.website}` : "";
    const phoneSuffix = !details.website && details.phone ? ` Call ${details.phone}` : "";
    if (combined) {
      return sanitizeVariableValue(`${combined}${linkSuffix}${phoneSuffix}`, 2) || "special pricing on our services";
    }
  }

  return "special pricing on our services";
}

/**
 * Returns a complete map of all variables {{1}}..{{n}} with either extracted or fallback values.
 */
export function resolveAllTemplateVariables(
  bodyText?: string | null,
  details?: VariableExtractionDetails | null,
  biz?: BusinessVariableContext | null,
  existingValues?: Record<number, string> | null,
  respectManual?: boolean
): Record<number, string> {
  const result: Record<number, string> = {};
  if (!bodyText) return result;

  let maxIdx = 0;
  const regex = /\{\{(\d+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(bodyText)) !== null) {
    const idx = parseInt(m[1], 10);
    if (!Number.isNaN(idx) && idx > maxIdx) maxIdx = idx;
  }

  for (let varNum = 1; varNum <= maxIdx; varNum++) {
    if (respectManual && existingValues && existingValues[varNum]?.trim()) {
      result[varNum] = existingValues[varNum].trim();
      continue;
    }
    result[varNum] = getGenericFallbackForVariable(varNum, bodyText, details, biz);
  }

  return result;
}

