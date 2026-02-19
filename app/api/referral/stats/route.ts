import { NextRequest, NextResponse } from "next/server";
import {
  getReferralsByReferrer,
  getUserCommissions,
  getUserReferralLink
} from "@/lib/referral/store";
import type { ReferralStats } from "@/lib/referral/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

const COMMISSION_RATE = 0.10; // 10%
const COMMISSION_DURATION_MONTHS = 3;

/**
 * GET /api/referral/stats
 * Get referral statistics for a user
 */
export async function GET(req: NextRequest) {
  try {
    // Get userId from header or use demo user for testing
    const userIdRaw = req.headers.get("x-user-id") || "demo-operator";
    const userId = sanitizeUserId(userIdRaw);

    // Get user's referral relationships (people they referred)
    const relationships = getReferralsByReferrer(userId);
    const commissions = getUserCommissions(userId);
    const referralLink = getUserReferralLink(userId);

    // Calculate active referrals (within 3-month commission window)
    const now = new Date();
    const activeRelationships = relationships.filter(rel => {
      if (!rel.active) return false;
      const endDate = new Date(rel.commissionEndDate);
      return now <= endDate;
    });

    // Calculate earnings
    const totalEarningsCents = commissions
      .filter(c => c.credited)
      .reduce((sum, c) => sum + c.amountCents, 0);

    const pendingEarningsCents = commissions
      .filter(c => !c.credited)
      .reduce((sum, c) => sum + c.amountCents, 0);

    const stats: ReferralStats = {
      totalReferrals: relationships.length,
      activeReferrals: activeRelationships.length,
      totalEarningsCents,
      pendingEarningsCents,
      commissionRate: COMMISSION_RATE,
      commissionDurationMonths: COMMISSION_DURATION_MONTHS,
    };

    // Recent referrals with details
    const recentReferrals = relationships.slice(0, 10).map(rel => ({
      id: rel.id,
      referredUserId: rel.referredUserId.slice(0, 8) + "...", // Masked for privacy
      createdAt: rel.createdAt,
      commissionEndDate: rel.commissionEndDate,
      active: rel.active && now <= new Date(rel.commissionEndDate),
    }));

    // Recent commissions
    const recentCommissions = commissions.slice(0, 10).map(comm => ({
      id: comm.id,
      amountCents: comm.amountCents,
      amountFormatted: `$${(comm.amountCents / 100).toFixed(2)}`,
      period: comm.period,
      credited: comm.credited,
      createdAt: comm.createdAt,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        totalEarningsFormatted: `$${(totalEarningsCents / 100).toFixed(2)}`,
        pendingEarningsFormatted: `$${(pendingEarningsCents / 100).toFixed(2)}`,
        commissionRatePercent: `${(COMMISSION_RATE * 100).toFixed(0)}%`,
      },
      recentReferrals,
      recentCommissions,
    });
  } catch (error: any) {
    console.error("[Referral Stats] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_stats_error" },
      { status: 500 }
    );
  }
}

