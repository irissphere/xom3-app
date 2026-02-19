/**
 * Loyalty Tier Definitions
 */

import { LoyaltyTier, TierConfig } from './types';

export const LOYALTY_TIERS: Record<LoyaltyTier, TierConfig> = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    minLifetimeSpend: 0,
    discountPercent: 0,
    freeAIVideosPerMonth: 0,
    prioritySupport: false,
    dedicatedSupport: false,
    earlyFeatures: false,
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    minLifetimeSpend: 100,
    discountPercent: 5,
    freeAIVideosPerMonth: 1,
    prioritySupport: false,
    dedicatedSupport: false,
    earlyFeatures: false,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    minLifetimeSpend: 500,
    discountPercent: 10,
    freeAIVideosPerMonth: 3,
    prioritySupport: true,
    dedicatedSupport: false,
    earlyFeatures: false,
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    minLifetimeSpend: 2000,
    discountPercent: 15,
    freeAIVideosPerMonth: -1, // unlimited
    prioritySupport: true,
    dedicatedSupport: true,
    earlyFeatures: true,
  },
};

/**
 * Get tier configuration
 */
export function getTierConfig(tier: LoyaltyTier): TierConfig {
  return LOYALTY_TIERS[tier];
}

/**
 * Get all tiers in order
 */
export function getAllTiers(): TierConfig[] {
  return [
    LOYALTY_TIERS.bronze,
    LOYALTY_TIERS.silver,
    LOYALTY_TIERS.gold,
    LOYALTY_TIERS.platinum,
  ];
}

/**
 * Get next tier for a given tier
 */
export function getNextTier(tier: LoyaltyTier): LoyaltyTier | null {
  const order: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = order.indexOf(tier);
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return null;
  }
  return order[currentIndex + 1];
}















