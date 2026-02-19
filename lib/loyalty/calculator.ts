/**
 * Loyalty Tier Calculator
 * 
 * Calculates user's tier based on lifetime spend
 */

import { LoyaltyTier, UserTierStatus, TierConfig } from './types';
import { LOYALTY_TIERS, getNextTier } from './tiers';

/**
 * Calculate user's tier from lifetime spend
 */
export function calculateTierFromSpend(lifetimeSpendCents: number): LoyaltyTier {
  const lifetimeSpendDollars = lifetimeSpendCents / 100;

  if (lifetimeSpendDollars >= 2000) return 'platinum';
  if (lifetimeSpendDollars >= 500) return 'gold';
  if (lifetimeSpendDollars >= 100) return 'silver';
  return 'bronze';
}

/**
 * Calculate user tier status
 */
export function calculateUserTierStatus(
  userId: string,
  lifetimeSpendCents: number
): UserTierStatus {
  const lifetimeSpendDollars = lifetimeSpendCents / 100;
  const currentTier = calculateTierFromSpend(lifetimeSpendCents);
  const nextTier = getNextTier(currentTier);

  let spendToNextTier = 0;
  let progressPercent = 0;

  if (nextTier) {
    const nextTierConfig = LOYALTY_TIERS[nextTier];
    const currentTierConfig = LOYALTY_TIERS[currentTier];
    const tierRange = nextTierConfig.minLifetimeSpend - currentTierConfig.minLifetimeSpend;
    const progress = lifetimeSpendDollars - currentTierConfig.minLifetimeSpend;
    
    spendToNextTier = Math.max(0, nextTierConfig.minLifetimeSpend - lifetimeSpendDollars);
    progressPercent = tierRange > 0 ? Math.min(100, Math.max(0, (progress / tierRange) * 100)) : 0;
  } else {
    progressPercent = 100; // Max tier
  }

  return {
    userId,
    currentTier,
    lifetimeSpendCents,
    lifetimeSpendDollars,
    nextTier,
    spendToNextTier,
    progressPercent,
    tierUpDate: null, // Would be set when tier changes
  };
}

/**
 * Check if user just tiered up
 */
export function checkTierUp(
  oldTier: LoyaltyTier,
  newTier: LoyaltyTier
): boolean {
  const order: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
  return order.indexOf(newTier) > order.indexOf(oldTier);
}















