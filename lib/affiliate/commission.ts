/**
 * Affiliate Commission System
 * 
 * Tiered commission structure based on lifetime sales:
 *   Starter  (default)         → 10%
 *   Silver   ($1,000+ sales)   → 15%
 *   Gold     ($5,000+ sales)   → 20%
 *   Diamond  ($25,000+ sales)  → 25%
 */

export type AffiliateTier = 'starter' | 'silver' | 'gold' | 'diamond';

export const TIER_CONFIG: Record<AffiliateTier, {
  name: string;
  rate: number;
  minSalesCents: number;
  color: string;
  badge: string;
}> = {
  starter: { name: 'Starter', rate: 0.10, minSalesCents: 0, color: '#94a3b8', badge: 'Starter' },
  silver:  { name: 'Silver',  rate: 0.15, minSalesCents: 100_000, color: '#C0C0C0', badge: 'Silver' },
  gold:    { name: 'Gold',    rate: 0.20, minSalesCents: 500_000, color: '#FFD700', badge: 'Gold' },
  diamond: { name: 'Diamond', rate: 0.25, minSalesCents: 2_500_000, color: '#B9F2FF', badge: 'Diamond' },
};

const TIERS_ORDERED: AffiliateTier[] = ['diamond', 'gold', 'silver', 'starter'];

/**
 * Determine affiliate tier based on lifetime sales (in cents)
 */
export function calculateTier(totalSalesCents: number): AffiliateTier {
  for (const tier of TIERS_ORDERED) {
    if (totalSalesCents >= TIER_CONFIG[tier].minSalesCents) {
      return tier;
    }
  }
  return 'starter';
}

/**
 * Get commission rate for a tier
 */
export function getCommissionRate(tier: AffiliateTier): number {
  return TIER_CONFIG[tier]?.rate || 0.10;
}

/**
 * Calculate commission amount in cents
 */
export function calculateCommission(orderTotalCents: number, tier: AffiliateTier): number {
  const rate = getCommissionRate(tier);
  return Math.floor(orderTotalCents * rate);
}

/**
 * Get progress to next tier
 */
export function getNextTierProgress(totalSalesCents: number): {
  currentTier: AffiliateTier;
  nextTier: AffiliateTier | null;
  progressPercent: number;
  remainingCents: number;
} {
  const currentTier = calculateTier(totalSalesCents);

  const tierIndex = TIERS_ORDERED.indexOf(currentTier);
  if (tierIndex === 0) {
    return {
      currentTier,
      nextTier: null,
      progressPercent: 100,
      remainingCents: 0,
    };
  }

  const nextTier = TIERS_ORDERED[tierIndex - 1];
  const nextMin = TIER_CONFIG[nextTier].minSalesCents;
  const currentMin = TIER_CONFIG[currentTier].minSalesCents;
  const range = nextMin - currentMin;
  const progress = totalSalesCents - currentMin;
  const progressPercent = Math.min(100, Math.round((progress / range) * 100));

  return {
    currentTier,
    nextTier,
    progressPercent,
    remainingCents: Math.max(0, nextMin - totalSalesCents),
  };
}

/**
 * Generate a unique affiliate code
 */
export function generateAffiliateCode(prefix?: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return prefix ? `${prefix}-${code}` : code;
}
