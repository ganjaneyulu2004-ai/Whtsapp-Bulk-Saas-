/**
 * Builds the direct Meta Billing Hub link per business:
 * https://business.facebook.com/latest/billing_hub/accounts/details?business_id={ownerBusinessId}&asset_id={WABA_ID}
 * If ownerBusinessId is missing:
 * https://business.facebook.com/latest/billing_hub/accounts?asset_id={WABA_ID}
 */
export function buildMetaBillingUrl(params: {
  ownerBusinessId?: string | null;
  wabaId?: string | null;
}): string {
  const wabaId = params.wabaId?.trim();
  const ownerBusinessId = params.ownerBusinessId?.trim();

  if (ownerBusinessId && wabaId) {
    return `https://business.facebook.com/latest/billing_hub/accounts/details?business_id=${encodeURIComponent(
      ownerBusinessId
    )}&asset_id=${encodeURIComponent(wabaId)}`;
  }

  if (wabaId) {
    return `https://business.facebook.com/latest/billing_hub/accounts?asset_id=${encodeURIComponent(wabaId)}`;
  }

  return "https://business.facebook.com/latest/billing_hub/accounts";
}

export function getMetaBillingNotes(params: {
  ownerBusinessId?: string | null;
  ownerBusinessName?: string | null;
  wabaName?: string | null;
  verifiedName?: string | null;
  businessName?: string | null;
}) {
  const wabaName =
    params.wabaName?.trim() ||
    params.verifiedName?.trim() ||
    params.businessName?.trim() ||
    "your WhatsApp Account";

  const ownerName =
    params.ownerBusinessName?.trim() ||
    params.verifiedName?.trim() ||
    params.businessName?.trim() ||
    "your business account";

  const primaryNote = `Add the card under Messaging accounts → ${wabaName}, NOT under Ad accounts.`;
  const selectorNote = !params.ownerBusinessId
    ? `Make sure the business selector at top-left shows ${ownerName} before adding a card.`
    : null;

  return {
    wabaName,
    ownerName,
    primaryNote,
    selectorNote,
  };
}

