/**
 * Referral Commission Calculation and Crediting
 * 
 * Commission Model: 11% ONE-TIME on first subscription payment
 * - Simple, clean, instant gratification
 * - No ongoing tracking required
 * - Commission paid when referred user makes first payment
 */

import { ReferralCommission, ReferralRelationship } from './types';

const COMMISSION_RATE = 0.11; // 11% one-time
export const COMMISSION_MODEL = "one-time"; // "one-time" or "recurring"

/**
 * Calculate commission for a referral based on referred user's first payment
 */
export function calculateCommission(spendCents: number): number {
  return Math.floor(spendCents * COMMISSION_RATE);
}

/**
 * Create a commission record
 */
export function createCommission(
  relationship: ReferralRelationship,
  referredUserSpendCents: number,
  period: string
): ReferralCommission {
  const amountCents = calculateCommission(referredUserSpendCents);

  return {
    id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    referralRelationshipId: relationship.id,
    referrerUserId: relationship.referrerUserId,
    referredUserId: relationship.referredUserId,
    amountCents,
    description: `Referral commission for ${period}`,
    period,
    credited: false,
    creditedAt: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mark commission as credited
 */
export function creditCommission(commission: ReferralCommission): ReferralCommission {
  return {
    ...commission,
    credited: true,
    creditedAt: new Date().toISOString(),
  };
}

/**
 * Get total pending commissions for a user
 */
export function getTotalPendingCommissions(commissions: ReferralCommission[]): number {
  return commissions
    .filter(c => !c.credited)
    .reduce((sum, c) => sum + c.amountCents, 0);
}

/**
 * Get total earned commissions for a user
 */
export function getTotalEarnedCommissions(commissions: ReferralCommission[]): number {
  return commissions
    .filter(c => c.credited)
    .reduce((sum, c) => sum + c.amountCents, 0);
}



