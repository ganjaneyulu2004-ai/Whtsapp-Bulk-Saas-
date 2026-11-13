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
  recipient_name?: string | null;
}

export interface BusinessVariableContext {
  name?: string | null;
  category?: string | null;
  bookingLink?: string | null;
  phone?: string | null;
  recipientName?: string | null;
  servicesAndPricing?: string | null;
  businessDescription?: string | null;
  about?: string | null;
}

export type TemplateVariableSlotType =
  | "NAME"
  | "DATE"
  | "OFFER"
  | "BUSINESS_NAME"
  | "LINK"
  | "PHONE"
  | "PRICE"
  | "DISCOUNT"
  | "PRODUCT_OR_SERVICE"
  | "LOCATION"
  | "UNKNOWN";

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
 * Extracts the preceding words (~6-8 words) and immediate clause after {{varNum}}.
 * Does not allow text across punctuation (. ! ? \n) or subsequent variable placeholders
 * to contaminate the context.
 */
export function extractVariableContext(
  bodyText?: string | null,
  varNum?: number
): {
  beforeSnippet: string;
  afterSnippet: string;
  fullBefore: string;
  lastWords: string[];
} {
  if (!bodyText || !varNum) {
    return { beforeSnippet: "", afterSnippet: "", fullBefore: "", lastWords: [] };
  }
  const token = `{{${varNum}}}`;
  const pos = bodyText.indexOf(token);
  if (pos === -1) {
    return { beforeSnippet: "", afterSnippet: "", fullBefore: "", lastWords: [] };
  }

  // 1. Text preceding {{varNum}}
  const fullBefore = bodyText.slice(0, pos);

  // Isolate the current clause/sentence: don't let text before sentence terminators (. ! ? \n) leak in
  const lastTerminatorMatch = fullBefore.match(/[\.\!\?\n]([^\.\!\?\n]*)$/);
  const clauseBefore = lastTerminatorMatch ? lastTerminatorMatch[1] : fullBefore;

  // Strip earlier variable placeholders (e.g. {{1}}) and markdown so they don't leak into beforeSnippet
  const cleanBefore = clauseBefore
    .replace(/\{\{\d+\}\}/g, " ")
    .replace(/[*_~`#]/g, " ")
    .replace(/[\r\n\t]+/g, " ");

  const words = cleanBefore
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const lastWords = words.slice(-6);
  const beforeSnippet = lastWords.join(" ").toLowerCase();

  // 2. Text immediately following {{varNum}}
  // ONLY look within the immediate clause/sentence before sentence terminators (. ! ? \n) or the next {{
  const afterRaw = bodyText.slice(pos + token.length);
  const clauseMatch = afterRaw.match(/^([^\.\!\?\n\{\}]*)/);
  const immediateClause = clauseMatch ? clauseMatch[1] : "";
  const cleanAfter = immediateClause
    .replace(/[*_~`#]/g, " ")
    .replace(/[\r\n\t]+/g, " ");

  const afterWords = cleanAfter
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 6);
  const afterSnippet = afterWords.join(" ").toLowerCase();

  return { beforeSnippet, afterSnippet, fullBefore, lastWords };
}

/**
 * Returns a combined snippet for backwards compatibility.
 */
export function getVariableSurroundingContext(bodyText?: string | null, varNum?: number): string {
  const ctx = extractVariableContext(bodyText, varNum);
  return `${ctx.beforeSnippet} ${ctx.afterSnippet}`.trim();
}

/**
 * Decides each variable's type mainly from the text BEFORE {{n}} (last ~6 words),
 * then text after only as a tie-breaker.
 *
 * Rules:
 * - "offer for you:" / "offer:" / "get" / "special offer" -> OFFER slot.
 * - "valid till" / "until" / "ends on" / "before" -> DATE slot.
 * - "Hi" / "Dear" at start -> NAME slot.
 * - "shopping with" / "welcome to" / "team" -> BUSINESS_NAME slot.
 */
export function detectVariableSlotType(
  bodyText?: string | null,
  varNum?: number
): TemplateVariableSlotType {
  if (!varNum) return "UNKNOWN";
  if (!bodyText) {
    return varNum === 1 ? "NAME" : varNum === 2 ? "OFFER" : "DATE";
  }

  const { beforeSnippet, afterSnippet, fullBefore, lastWords } = extractVariableContext(bodyText, varNum);

  // 1. NAME slot:
  // Typically {{1}} at start of message, preceded by greeting or very short start
  if (varNum === 1) {
    if (
      lastWords.length === 0 ||
      fullBefore.trim().length <= 25 ||
      /\b(hi|hello|hey|dear|namaste|greetings)\b/i.test(beforeSnippet)
    ) {
      return "NAME";
    }
  }

  if (/\b(hi|hello|hey|dear|namaste|greetings)\s*[:,\s]*$/i.test(beforeSnippet)) {
    return "NAME";
  }

  // 2. Decide primarily from text BEFORE {{n}} (last ~6 words):

  // 2a. DATE slot:
  // "valid till", "valid until", "until", "ends on", "before", "last date", "expires"
  if (
    /\b(valid\s+(till|until|through|to)|validity|till|until|ends?\s+on|end\s+date|before|expires?|expiring|last\s+date|deadline)\b/i.test(
      beforeSnippet
    )
  ) {
    return "DATE";
  }

  // 2b. OFFER slot:
  // "offer for you:", "offer:", "get", "special offer", "exclusive offer", "mega offer", "deals", "promo", "enjoy", "avail", "save big"
  if (
    /\b(offer\s+for\s+you|special\s+offer|exclusive\s+offer|mega\s+offer|festival\s+offer|limited\s+offer|offer\s*:|offer|deals?|promo|promotion|get|enjoy|avail|save\s+big|discounts?|flat\s+\d+|up\s+to\s+\d+)\b/i.test(
      beforeSnippet
    )
  ) {
    return "OFFER";
  }

  // 2c. BUSINESS_NAME slot:
  // "shopping with", "welcome to", "team", "from", "brand", "company", "store", "shop", "studio"
  if (
    /\b(shopping\s+with|welcome\s+to|team|from|brand|company|store|shop|studio|hospital|clinic|salon)\b/i.test(
      beforeSnippet
    )
  ) {
    return "BUSINESS_NAME";
  }

  // 2d. LINK slot:
  // "link", "website", "book now", "book here", "order now", "visit us at", "visit", "click", "tap here"
  if (
    /\b(link|url|website|book(\s+now)?|book\s+here|order(\s+now)?|order\s+here|visit\s+us\s+at|visit|click|tap\s+here|check\s+out|register\s+at|browse\s+at|online\s+at)\b/i.test(
      beforeSnippet
    )
  ) {
    return "LINK";
  }

  // 2e. PHONE slot:
  // "call", "phone", "mobile", "whatsapp", "helpline", "contact", "dial"
  if (
    /\b(call|phone|mobile|whatsapp|helpline|contact(\s+us)?(\s+at)?|dial|reach\s+us\s+at)\b/i.test(
      beforeSnippet
    )
  ) {
    return "PHONE";
  }

  // 2f. PRICE slot:
  // "price", "cost", "fee", "rate", "mrp", "rs", "inr", "₹", "starting at", "only at"
  if (
    /\b(price|cost|fee|rate|mrp|rs\.?|inr|₹|starting\s+at|only\s+at|just\s+for)\b/i.test(
      beforeSnippet
    )
  ) {
    return "PRICE";
  }

  // 2g. LOCATION slot:
  // "location", "address", "venue", "branch", "city", "center", "centre"
  if (/\b(location|address|venue|branch|city|center|centre|studio\s+at|store\s+at)\b/i.test(beforeSnippet)) {
    return "LOCATION";
  }

  // 2h. PRODUCT_OR_SERVICE slot:
  // "product", "service", "package", "item", "course", "treatment", "plan", "session"
  if (/\b(product|service|package|item|course|treatment|plan|session|booking|order)\b/i.test(beforeSnippet)) {
    return "PRODUCT_OR_SERVICE";
  }

  // 3. TIE-BREAKER with text AFTER {{n}} (only in the immediate clause, max 6 words):
  if (/\b(valid|expires|ends)\b/i.test(afterSnippet)) {
    return "DATE";
  }
  if (/\b(offer|deal|discount|off)\b/i.test(afterSnippet)) {
    return "OFFER";
  }
  if (/\b(link|website)\b/i.test(afterSnippet)) {
    return "LINK";
  }
  if (/\b(team|store|shop|company|studio)\b/i.test(afterSnippet)) {
    return "BUSINESS_NAME";
  }
  if (/\b(sessions?|services?)\b/i.test(afterSnippet)) {
    return "PRODUCT_OR_SERVICE";
  }

  // 4. Default position-based fallback:
  if (varNum === 1) return "NAME";
  if (varNum === 2) return "OFFER";
  if (varNum === 3) return "DATE";
  return "OFFER";
}

/**
 * Extracts the first clean service item name from servicesAndPricing text,
 * stripping any prices, currencies, percentages, and frequency/duration suffixes.
 */
export function extractCleanServiceItem(rawText: string): string | null {
  if (!rawText || !rawText.trim()) return null;

  // Split by newlines, bullets (•), semicolons, or pipes
  const candidates = rawText
    .split(/[\r\n;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    // If a line has multiple comma-separated items, inspect each token
    const subTokens = candidate.split(/,\s*/);
    for (const subToken of subTokens) {
      let item = subToken.trim();
      if (!item) continue;

      // 1. Strip leading numbering or bullet markers (e.g. "1. ", "1) ", "- ", "* ")
      item = item.replace(/^[\d\.\)\-\*•–—\s]+/, "").trim();

      // 2. Strip prices, currencies, percentages, and frequency/duration suffixes
      // e.g. @ ₹15,000/hr, ₹15,000, 15000/-, Rs. 15000, $500, 25% off, per hour, for 1 hour
      item = item
        .replace(/@?\s*(?:rs\.?|inr|₹|\$)\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*[\w]+)?/gi, "")
        .replace(/\b(?:rs\.?|inr|₹|\$)\s*[\d,]+(?:\.\d+)?/gi, "")
        .replace(/\b[\d,]+\s*(?:rs|inr|₹|\$|-|\/-)\b/gi, "")
        .replace(/\b\d+%\s*(?:off)?\b/gi, "")
        .replace(/\b(?:per|for)\s+(?:hour|hr|session|day|month|slot)\b/gi, "")
        .replace(/https?:\/\/\S+/gi, "")
        .replace(/\+?\d[\d\s-]{8,}\d/g, "")
        .replace(/^[-–—:, \t]+/, "")
        .replace(/[-–—:, \t]+$/, "")
        .trim();

      // Check if item is a meaningful service name (between 3 and 60 chars)
      if (item.length >= 3 && item.length <= 60) {
        return item;
      }
    }
  }

  return null;
}

/**
 * Generates an OFFER fallback from THIS business's own data in order:
 * 1. services list item names from servicesAndPricing (strip prices)
 * 2. category label
 * 3. business name
 * 4. "special pricing on our services" (only if profile is empty).
 *
 * Example: for "Content Creation Session ₹15,000" -> "special pricing on content creation sessions".
 * Never uses a hard-coded category list that can pick another industry.
 * Never invents a discount percentage, exact price, or date.
 */
export function generateOfferFallbackFromProfile(biz?: BusinessVariableContext | null): string {
  if (!biz) return "special pricing on our services";

  // 1. Try services list item names from servicesAndPricing (or businessDescription/about if servicesAndPricing empty)
  const servicesSource = (biz.servicesAndPricing || biz.businessDescription || biz.about || "").trim();
  const rawServiceItem = extractCleanServiceItem(servicesSource);

  if (rawServiceItem) {
    // If item already starts with "special pricing" or "special offer", sanitize and return
    if (/^special (pricing|offer|discount)/i.test(rawServiceItem)) {
      return sanitizeVariableValue(rawServiceItem, 2);
    }

    // Natural pluralization for common singular session/service nouns:
    // e.g. "Content Creation Session" -> "content creation sessions"
    let lowerItem = rawServiceItem.toLowerCase();
    if (lowerItem.endsWith("session")) {
      lowerItem = lowerItem + "s";
    } else if (lowerItem.endsWith("package")) {
      lowerItem = lowerItem + "s";
    } else if (lowerItem.endsWith("shoot")) {
      lowerItem = lowerItem + "s";
    } else if (lowerItem.endsWith("consultation")) {
      lowerItem = lowerItem + "s";
    }

    return sanitizeVariableValue(`special pricing on ${lowerItem}`, 2);
  }

  // 2. Fallback to category label of this business
  const category = (biz.category || "").trim();
  if (
    category &&
    !category.toLowerCase().includes("retail shop") &&
    !category.toLowerCase().includes("retail & business") &&
    !category.toLowerCase().includes("other") &&
    category.toLowerCase() !== "general"
  ) {
    const lowerCat = category.toLowerCase();
    if (lowerCat.endsWith("services") || lowerCat.endsWith("products")) {
      return sanitizeVariableValue(`special pricing on ${lowerCat}`, 2);
    }
    return sanitizeVariableValue(`special pricing on ${lowerCat} services`, 2);
  }

  // 3. Fallback to business name of this business
  const name = (biz.name || "").trim();
  if (name && name.toLowerCase() !== "oneample" && name.toLowerCase() !== "your business") {
    return sanitizeVariableValue(`special pricing at ${name}`, 2);
  }

  // 4. Default fallback when profile is completely empty
  return "special pricing on our services";
}

/**
 * Resolves a safe, non-empty generic fallback for a template variable {{varNum}}.
 * Never invents a specific discount %, price, or exact date.
 * Ensures that no two variables in the same template receive the exact same fallback value.
 */
export function getGenericFallbackForVariable(
  varNum: number,
  bodyText?: string | null,
  details?: VariableExtractionDetails | null,
  biz?: BusinessVariableContext | null,
  usedValues?: Set<string> | string[]
): string {
  // Normalize usedValues set
  const usedSet = new Set<string>();
  if (usedValues) {
    if (Array.isArray(usedValues)) {
      for (const item of usedValues) {
        if (item && item.trim()) usedSet.add(item.trim().toLowerCase());
      }
    } else if (usedValues instanceof Set) {
      for (const item of usedValues) {
        if (item && item.trim()) usedSet.add(item.trim().toLowerCase());
      }
    }
  }

  const slotType = detectVariableSlotType(bodyText, varNum);

  // Helper to pick the first candidate not in usedSet
  const selectUnique = (candidates: (string | null | undefined)[]): string => {
    for (const raw of candidates) {
      if (!raw || !String(raw).trim()) continue;
      const sanitized = sanitizeVariableValue(raw, 2);
      if (!sanitized) continue;
      if (!usedSet.has(sanitized.toLowerCase())) {
        usedSet.add(sanitized.toLowerCase());
        if (usedValues instanceof Set) {
          usedValues.add(sanitized);
        }
        return sanitized;
      }
    }
    // If all candidates have been used, produce a guaranteed non-duplicate variant
    const base = sanitizeVariableValue(candidates[0] || "special offer", 2) || "special offer";
    let counter = 2;
    while (usedSet.has(`${base.toLowerCase()} (${counter})`)) {
      counter++;
    }
    const uniqueVal = `${base} (${counter})`;
    usedSet.add(uniqueVal.toLowerCase());
    if (usedValues instanceof Set) {
      usedValues.add(uniqueVal);
    }
    return uniqueVal;
  };

  switch (slotType) {
    case "NAME": {
      const recipient = biz?.recipientName || details?.recipient_name;
      return selectUnique([recipient, "Customer", "Valued Customer", "Guest"]);
    }

    case "DATE": {
      const extractedDate = details?.valid_till
        ? (details.valid_from ? `${details.valid_from} to ${details.valid_till}` : details.valid_till)
        : null;

      const { beforeSnippet } = extractVariableContext(bodyText, varNum);
      const isTillOrUntil = /\b(valid\s+(till|until)|till|until)\b/i.test(beforeSnippet);

      const primaryDateFallback = isTillOrUntil ? "slots last" : "a limited time";
      const secondaryDateFallback = isTillOrUntil ? "stocks last" : "this week";

      return selectUnique([
        extractedDate,
        primaryDateFallback,
        secondaryDateFallback,
        "a limited period",
        "the festive season",
      ]);
    }

    case "OFFER": {
      // If extracted details from poster exist, build poster offer string
      let extractedOffer: string | null = null;
      if (details?.offer_title || details?.discount || details?.products_or_services) {
        const headline = [details.offer_title, details.discount].filter(Boolean).join(" – ");
        const tailParts = [details.products_or_services, details.price].filter(Boolean);
        const combined = [headline, tailParts.join(" · ")].filter(Boolean).join(": ");
        const linkSuffix = details.website ? ` 👉 ${details.website}` : "";
        const phoneSuffix = !details.website && details.phone ? ` Call ${details.phone}` : "";
        if (combined) {
          extractedOffer = `${combined}${linkSuffix}${phoneSuffix}`;
        }
      }

      const profileOffer = generateOfferFallbackFromProfile(biz);

      return selectUnique([
        extractedOffer,
        profileOffer,
        "special pricing on our services",
        "exclusive seasonal savings",
        "special discount on our packages",
        "limited-time savings",
      ]);
    }

    case "BUSINESS_NAME": {
      return selectUnique([
        biz?.name,
        details?.business_name,
        "our team",
        "our store",
        "our company",
        "our official studio",
      ]);
    }

    case "LINK": {
      return selectUnique([
        details?.website,
        biz?.bookingLink,
        "our website",
        "our booking link",
        "our official portal",
      ]);
    }

    case "PHONE": {
      return selectUnique([
        details?.phone,
        biz?.phone,
        "our team",
        "our customer desk",
        "our helpline",
      ]);
    }

    case "PRICE": {
      return selectUnique([
        details?.price,
        "special pricing",
        "exclusive rates",
        "affordable pricing",
      ]);
    }

    case "DISCOUNT": {
      return selectUnique([
        details?.discount,
        "special discount",
        "exclusive savings",
        "festive discount",
      ]);
    }

    case "PRODUCT_OR_SERVICE": {
      return selectUnique([
        details?.products_or_services,
        details?.offer_title,
        generateOfferFallbackFromProfile(biz),
        "our services",
        "our popular packages",
        "our featured sessions",
      ]);
    }

    case "LOCATION": {
      return selectUnique([
        details?.location,
        "our center",
        "our studio",
        "our branch",
      ]);
    }

    case "UNKNOWN":
    default: {
      if (varNum === 1) {
        return selectUnique([biz?.recipientName, "Customer", "Valued Customer"]);
      }
      return selectUnique([
        generateOfferFallbackFromProfile(biz),
        "special pricing on our services",
        "a limited time",
        biz?.name || "our team",
      ]);
    }
  }
}

/**
 * Returns a complete map of all variables {{1}}..{{n}} with either extracted or fallback values.
 * Guarantees that no two variables receive the same fallback value.
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

  const usedValues = new Set<string>();

  // If respecting manual values, register existing manual values first into usedValues
  if (respectManual && existingValues) {
    for (const [, v] of Object.entries(existingValues)) {
      if (v && v.trim()) {
        usedValues.add(v.trim().toLowerCase());
      }
    }
  }

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
    result[varNum] = getGenericFallbackForVariable(varNum, bodyText, details, biz, usedValues);
  }

  return result;
}
