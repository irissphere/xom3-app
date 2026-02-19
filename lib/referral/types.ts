/**
 * Referral System Types
 */

export interface ReferralLink {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
  clickCount: number;
  signupCount: number;
  active: boolean;
}

export interface ReferralRelationship {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  createdAt: string;
  commissionStartDate: string;
  commissionEndDate: string; // 3 months from signup
  active: boolean;
}

export interface ReferralCommission {
  id: string;
  referralRelationshipId: string;
  referrerUserId: string;
  referredUserId: string;
  amountCents: number;
  description: string;
  period: string; // e.g., "2025-01"
  credited: boolean;
  creditedAt: string | null;
  createdAt: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarningsCents: number;
  pendingEarningsCents: number;
  commissionRate: number; // 0.10 = 10%
  commissionDurationMonths: number; // 3
}















