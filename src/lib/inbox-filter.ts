/**
 * Helper utilities to filter messages in Inbox.
 * Ensures real customers whose numbers have consecutive zeros (e.g. 9800001234 or 919800001234)
 * remain visible, while excluding only:
 * 1. Numbers that start with "910000" (the loadtest fake range)
 * 2. Exact phone numbers of contacts marked isTest=true
 */

export function isLoadTestPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const raw = String(phone).trim();
  const digits = raw.replace(/[^0-9]/g, "");
  return digits.startsWith("910000") || raw.startsWith("+910000");
}

export function isExcludedInboxPhone(
  phone: string | null | undefined,
  testContactPhones: Set<string> | string[] = []
): boolean {
  if (!phone) return true;
  const raw = String(phone).trim();
  const digits = raw.replace(/[^0-9]/g, "");

  if (isLoadTestPhone(raw)) {
    return true;
  }

  const testSet = testContactPhones instanceof Set ? testContactPhones : new Set(testContactPhones);
  if (testSet.has(raw) || testSet.has(digits) || testSet.has(`+${digits}`)) {
    return true;
  }

  return false;
}

export function isInboxVisiblePhone(
  phone: string | null | undefined,
  testContactPhones: Set<string> | string[] = []
): boolean {
  return !isExcludedInboxPhone(phone, testContactPhones);
}

/**
 * Normalizes phone numbers to standard E.164 with country code (e.g. +916309292829).
 * If a 10-digit Indian number is provided, automatically prepends country code 91.
 */
export function toE164(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return `+${digits}`;
}

/**
 * Formats phone numbers in friendly E.164 with country code, e.g. "+91 63092 92829".
 * Never displays invalid formats like "+6309292829".
 */
export function formatE164Display(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  if (digits.startsWith("91") && digits.length === 12) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  if (digits.length > 5) {
    return `+${digits.slice(0, digits.length - 5)} ${digits.slice(digits.length - 5)}`;
  }
  return `+${digits}`;
}

