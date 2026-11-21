export const META_TIER_LIMITS: Record<string, number> = {
  TIER_250: 250,
  TIER_1K: 1000,
  TIER_10K: 10000,
  TIER_100K: 100000,
  TIER_UNLIMITED: Infinity,
};

export function getTierDailyLimit(tier?: string | null): number {
  if (!tier) return 250;
  const upper = tier.toUpperCase().trim();
  return META_TIER_LIMITS[upper] ?? 250;
}

export function formatTierName(tier?: string | null): string {
  if (!tier) return "Tier 250 (250 / 24h)";
  const upper = tier.toUpperCase().trim();
  switch (upper) {
    case "TIER_250":
      return "Tier 250 (250 unique recipients / 24h)";
    case "TIER_1K":
      return "Tier 1K (1,000 unique recipients / 24h)";
    case "TIER_10K":
      return "Tier 10K (10,000 unique recipients / 24h)";
    case "TIER_100K":
      return "Tier 100K (100,000 unique recipients / 24h)";
    case "TIER_UNLIMITED":
      return "Tier Unlimited";
    default:
      return `${tier} (${getTierDailyLimit(tier)} / 24h)`;
  }
}

