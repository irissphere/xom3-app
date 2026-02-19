/**
 * Loyalty Tier Perks Application
 * 
 * Applies tier-based discounts and benefits
 */

import { LoyaltyTier, TierConfig } from './types';
import { LOYALTY_TIERS } from './tiers';

/**
 * Apply tier discount to a price
 */
export function applyTierDiscount(priceCents: number, tier: LoyaltyTier): number {
  const tierConfig = LOYALTY_TIERS[tier];
  const discountPercent = tierConfig.discountPercent;
  
  if (discountPercent === 0) return priceCents;
  
  const discount = Math.floor(priceCents * (discountPercent / 100));
  return priceCents - discount;
}

/**
 * Get discount amount for a price
 */
export function getDiscountAmount(priceCents: number, tier: LoyaltyTier): number {
  const tierConfig = LOYALTY_TIERS[tier];
  const discountPercent = tierConfig.discountPercent;
  
  if (discountPercent === 0) return 0;
  
  return Math.floor(priceCents * (discountPercent / 100));
}

/**
 * Check if user has free AI video credits available
 */
export function hasFreeAIVideoCredits(
  tier: LoyaltyTier,
  usedThisMonth: number
): boolean {
  const tierConfig = LOYALTY_TIERS[tier];
  
  if (tierConfig.freeAIVideosPerMonth === -1) {
    return true; // Unlimited
  }
  
  return usedThisMonth < tierConfig.freeAIVideosPerMonth;
}

/**
 * Get tier perks summary
 */
export function getTierPerks(tier: LoyaltyTier): {
  discount: number;
  freeAIVideos: number | 'unlimited';
  support: 'standard' | 'priority' | 'dedicated';
  earlyFeatures: boolean;
} {
  const tierConfig = LOYALTY_TIERS[tier];
  
  return {
    discount: tierConfig.discountPercent,
    freeAIVideos: tierConfig.freeAIVideosPerMonth === -1 
      ? 'unlimited' 
      : tierConfig.freeAIVideosPerMonth,
    support: tierConfig.dedicatedSupport 
      ? 'dedicated' 
      : tierConfig.prioritySupport 
        ? 'priority' 
        : 'standard',
    earlyFeatures: tierConfig.earlyFeatures,
  };
}















