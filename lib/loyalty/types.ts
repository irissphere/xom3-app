/**
 * Loyalty Tier System Types
 */

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierConfig {
  id: LoyaltyTier;
  name: string;
  minLifetimeSpend: number; // in dollars
  discountPercent: number; // 0-15
  freeAIVideosPerMonth: number;
  prioritySupport: boolean;
  dedicatedSupport: boolean;
  earlyFeatures: boolean;
}

export interface UserTierStatus {
  userId: string;
  currentTier: LoyaltyTier;
  lifetimeSpendCents: number;
  lifetimeSpendDollars: number;
  nextTier: LoyaltyTier | null;
  spendToNextTier: number; // in dollars
  progressPercent: number; // 0-100
  tierUpDate: string | null;
}















