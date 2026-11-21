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

