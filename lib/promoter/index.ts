/**
 * Promoter Management System
 * 
 * Manages promoter accounts with performance-based requirements:
 * - 30-day grace period to get started
 * - Monthly review: must refer at least 1 new client
 * - If inactive, auto-converts to paid or downgrades
 */

import { PromoterStatus, PromoterRequirements, DEFAULT_PROMOTER_REQUIREMENTS } from "@/lib/tiers/types";

// In-memory store (replace with Airtable/DB in production)
const promoterStore = new Map<string, PromoterStatus>();

/**
 * Create a new promoter account
 */
export function createPromoter(
  userId: string,
  requirements: PromoterRequirements = DEFAULT_PROMOTER_REQUIREMENTS
): PromoterStatus {
  const now = new Date();
  const gracePeriodEnd = new Date(now);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + requirements.gracePeriodDays);
  
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + requirements.reviewPeriodDays);

  const status: PromoterStatus = {
    userId,
    tier: "promoter",
    startedAt: now.toISOString(),
    gracePeriodEndsAt: gracePeriodEnd.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    referralsThisPeriod: 0,
    totalReferrals: 0,
    totalEarningsCents: 0,
    inGracePeriod: true,
    meetsRequirements: true, // Starts as meeting (in grace)
    warningIssued: false,
  };

  promoterStore.set(userId, status);
  return status;
}

/**
 * Get promoter status
 */
export function getPromoterStatus(userId: string): PromoterStatus | null {
  return promoterStore.get(userId) || null;
}

/**
 * Check if user is an active promoter
 */
export function isActivePromoter(userId: string): boolean {
  const status = promoterStore.get(userId);
  if (!status) return false;
  
  // Check if they've been suspended or downgraded
  if (status.actionTaken) return false;
  
  return true;
}

/**
 * Record a referral for a promoter
 */
export function recordPromoterReferral(
  promoterId: string,
  referredUserId: string
): PromoterStatus | null {
  const status = promoterStore.get(promoterId);
  if (!status) return null;

  status.referralsThisPeriod++;
  status.totalReferrals++;
  
  // Check if they now meet requirements
  const requirements = DEFAULT_PROMOTER_REQUIREMENTS;
  status.meetsRequirements = status.referralsThisPeriod >= requirements.minReferralsPerMonth;
  
  promoterStore.set(promoterId, status);
  return status;
}

/**
 * Record earnings for a promoter
 */
export function recordPromoterEarnings(
  promoterId: string,
  amountCents: number
): PromoterStatus | null {
  const status = promoterStore.get(promoterId);
  if (!status) return null;

  status.totalEarningsCents += amountCents;
  promoterStore.set(promoterId, status);
  return status;
}

/**
 * Review promoter performance (call monthly via cron)
 */
export function reviewPromoterPerformance(
  userId: string,
  requirements: PromoterRequirements = DEFAULT_PROMOTER_REQUIREMENTS
): { status: PromoterStatus; action: "continue" | "warning" | "convert" | "downgrade" | "suspend" } {
  const status = promoterStore.get(userId);
  if (!status) {
    throw new Error("Promoter not found");
  }

  const now = new Date();
  const gracePeriodEnd = new Date(status.gracePeriodEndsAt);

  // Still in grace period?
  if (now < gracePeriodEnd) {
    status.inGracePeriod = true;
    promoterStore.set(userId, status);
    return { status, action: "continue" };
  }

  status.inGracePeriod = false;

  // Check if meets requirements
  if (status.referralsThisPeriod >= requirements.minReferralsPerMonth) {
    // Reset for next period
    status.referralsThisPeriod = 0;
    status.meetsRequirements = true;
    status.warningIssued = false;
    
    // Set next review period
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + requirements.reviewPeriodDays);
    status.currentPeriodStart = now.toISOString();
    status.currentPeriodEnd = nextPeriodEnd.toISOString();
    
    promoterStore.set(userId, status);
    return { status, action: "continue" };
  }

  // Didn't meet requirements
  status.meetsRequirements = false;

  // First time failing? Issue warning
  if (!status.warningIssued) {
    status.warningIssued = true;
    status.warningIssuedAt = now.toISOString();
    promoterStore.set(userId, status);
    return { status, action: "warning" };
  }

  // Already warned, take action
  status.actionTaken = requirements.failureAction;
  status.actionTakenAt = now.toISOString();
  promoterStore.set(userId, status);

  return { status, action: requirements.failureAction };
}

/**
 * Get all promoters (for admin dashboard)
 */
export function getAllPromoters(): PromoterStatus[] {
  return Array.from(promoterStore.values());
}

/**
 * Get promoters needing attention (warnings or near requirements deadline)
 */
export function getPromotersNeedingAttention(): PromoterStatus[] {
  const now = new Date();
  
  return Array.from(promoterStore.values()).filter(status => {
    // Already actioned
    if (status.actionTaken) return false;
    
    // Has warning
    if (status.warningIssued) return true;
    
    // Period ending soon (within 7 days) and not meeting requirements
    const periodEnd = new Date(status.currentPeriodEnd);
    const daysUntilEnd = Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEnd <= 7 && !status.meetsRequirements) return true;
    
    return false;
  });
}

/**
 * Reactivate a promoter (after they were downgraded/suspended)
 */
export function reactivatePromoter(userId: string): PromoterStatus | null {
  const status = promoterStore.get(userId);
  if (!status) return null;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + DEFAULT_PROMOTER_REQUIREMENTS.reviewPeriodDays);

  // Reset status
  status.actionTaken = undefined;
  status.actionTakenAt = undefined;
  status.warningIssued = false;
  status.warningIssuedAt = undefined;
  status.referralsThisPeriod = 0;
  status.meetsRequirements = true;
  status.currentPeriodStart = now.toISOString();
  status.currentPeriodEnd = periodEnd.toISOString();
  status.inGracePeriod = false; // No grace period on reactivation

  promoterStore.set(userId, status);
  return status;
}

/**
 * Calculate days remaining in current period
 */
export function getPromoterDaysRemaining(userId: string): number {
  const status = promoterStore.get(userId);
  if (!status) return 0;

  const now = new Date();
  const periodEnd = new Date(status.currentPeriodEnd);
  
  return Math.max(0, Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Get promoter summary for display
 */
export function getPromoterSummary(userId: string): {
  isPromoter: boolean;
  inGoodStanding: boolean;
  daysRemaining: number;
  referralsNeeded: number;
  totalEarnings: string;
  status: string;
} | null {
  const status = promoterStore.get(userId);
  if (!status) return null;

  const requirements = DEFAULT_PROMOTER_REQUIREMENTS;
  const referralsNeeded = Math.max(0, requirements.minReferralsPerMonth - status.referralsThisPeriod);
  
  let statusLabel = "Active";
  if (status.actionTaken) {
    statusLabel = status.actionTaken === "convert" ? "Converted to Paid" : 
                  status.actionTaken === "suspend" ? "Suspended" : "Downgraded";
  } else if (status.warningIssued) {
    statusLabel = "Warning Issued";
  } else if (status.inGracePeriod) {
    statusLabel = "Grace Period";
  } else if (status.meetsRequirements) {
    statusLabel = "Active - Good Standing";
  } else {
    statusLabel = "Active - Needs Referrals";
  }

  return {
    isPromoter: true,
    inGoodStanding: !status.actionTaken && (status.meetsRequirements || status.inGracePeriod),
    daysRemaining: getPromoterDaysRemaining(userId),
    referralsNeeded,
    totalEarnings: `$${(status.totalEarningsCents / 100).toFixed(2)}`,
    status: statusLabel,
  };
}


