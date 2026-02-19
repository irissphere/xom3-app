/**
 * Referral Store
 * In-memory store for referral data (replace with Airtable/Supabase in production)
 */

import type { ReferralLink, ReferralRelationship, ReferralCommission } from './types';

// Singleton stores
export const referralLinks = new Map<string, ReferralLink>();
export const referralRelationshipsByReferrer = new Map<string, ReferralRelationship[]>();
export const referralRelationshipsByReferred = new Map<string, ReferralRelationship>();
export const referralCommissions = new Map<string, ReferralCommission[]>();

/**
 * Get or create a user's referral link
 */
export function getUserReferralLink(userId: string): ReferralLink | null {
  return referralLinks.get(userId) || null;
}

/**
 * Save a referral link
 */
export function saveReferralLink(link: ReferralLink): void {
  referralLinks.set(link.userId, link);
}

/**
 * Find a referral link by code
 */
export function findReferralLinkByCode(code: string): ReferralLink | null {
  const normalizedCode = code.toUpperCase().trim();
  for (const [, link] of Array.from(referralLinks)) {
    if (link.code === normalizedCode && link.active) {
      return link;
    }
  }
  return null;
}

/**
 * Get referral relationships where user is the referrer
 */
export function getReferralsByReferrer(referrerUserId: string): ReferralRelationship[] {
  return referralRelationshipsByReferrer.get(referrerUserId) || [];
}

/**
 * Get referral relationship where user is the referred
 */
export function getReferralByReferred(referredUserId: string): ReferralRelationship | null {
  return referralRelationshipsByReferred.get(referredUserId) || null;
}

/**
 * Save a referral relationship
 */
export function saveReferralRelationship(relationship: ReferralRelationship): void {
  // Store by referrer
  const referrerRels = referralRelationshipsByReferrer.get(relationship.referrerUserId) || [];
  referrerRels.push(relationship);
  referralRelationshipsByReferrer.set(relationship.referrerUserId, referrerRels);
  
  // Store by referred
  referralRelationshipsByReferred.set(relationship.referredUserId, relationship);
}

/**
 * Get commissions for a user
 */
export function getUserCommissions(userId: string): ReferralCommission[] {
  return referralCommissions.get(userId) || [];
}

/**
 * Save a commission
 */
export function saveCommission(commission: ReferralCommission): void {
  const commissions = referralCommissions.get(commission.referrerUserId) || [];
  commissions.push(commission);
  referralCommissions.set(commission.referrerUserId, commissions);
}

/**
 * Credit commission to user's wallet (called by billing system)
 */
export async function creditCommissionToWallet(
  commission: ReferralCommission
): Promise<{ success: boolean; walletBalance?: number }> {
  // Mark as credited
  commission.credited = true;
  commission.creditedAt = new Date().toISOString();
  
  // In production, this would:
  // 1. Call /api/wallet/add-funds with the commission amount
  // 2. Update the commission record in the database
  
  console.log(`[Referral] Credited ${commission.amountCents} cents to ${commission.referrerUserId}`);
  
  return { success: true };
}


