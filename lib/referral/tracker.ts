/**
 * Referral Relationship Tracking
 */

import { ReferralRelationship, ReferralLink } from './types';

const COMMISSION_DURATION_MONTHS = 3;

/**
 * Create a referral relationship when a user signs up with a referral code
 */
export function createReferralRelationship(
  referrerUserId: string,
  referredUserId: string,
  referralCode: string
): ReferralRelationship {
  const now = new Date();
  const commissionEndDate = new Date(now);
  commissionEndDate.setMonth(commissionEndDate.getMonth() + COMMISSION_DURATION_MONTHS);

  return {
    id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    referrerUserId,
    referredUserId,
    referralCode: referralCode.toUpperCase(),
    createdAt: now.toISOString(),
    commissionStartDate: now.toISOString(),
    commissionEndDate: commissionEndDate.toISOString(),
    active: true,
  };
}

/**
 * Check if referral relationship is still active (within 3 months)
 */
export function isReferralActive(relationship: ReferralRelationship): boolean {
  if (!relationship.active) return false;
  const now = new Date();
  const endDate = new Date(relationship.commissionEndDate);
  return now <= endDate;
}

/**
 * Get days remaining in referral commission period
 */
export function getReferralDaysRemaining(relationship: ReferralRelationship): number {
  if (!isReferralActive(relationship)) return 0;
  const now = new Date();
  const endDate = new Date(relationship.commissionEndDate);
  const diff = endDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

/**
 * Update referral link stats
 */
export function incrementReferralClick(link: ReferralLink): ReferralLink {
  return {
    ...link,
    clickCount: link.clickCount + 1,
  };
}

export function incrementReferralSignup(link: ReferralLink): ReferralLink {
  return {
    ...link,
    signupCount: link.signupCount + 1,
  };
}















