import { NextResponse } from "next/server";
import {
  referralRelationshipsByReferrer,
  referralCommissions,
} from "@/lib/referral/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/referral/leaderboard
 * Returns real leaderboard data from the referral store (no mock data)
 */
export async function GET() {
  try {
    const entries: Array<{ userId: string; referrals: number; earningsCents: number }> = [];

    for (const [userId, relationships] of referralRelationshipsByReferrer) {
      const commissions = referralCommissions.get(userId) || [];
      const earningsCents = commissions
        .filter((c) => c.credited)
        .reduce((sum, c) => sum + c.amountCents, 0);
      entries.push({
        userId,
        referrals: relationships.length,
        earningsCents,
      });
    }

    // Sort by referrals desc, then earnings desc
    entries.sort((a, b) => {
      if (b.referrals !== a.referrals) return b.referrals - a.referrals;
      return b.earningsCents - a.earningsCents;
    });

    const leaderboard = entries.slice(0, 10).map((e, i) => ({
      rank: i + 1,
      name: `${e.userId.slice(0, 2)}****${e.userId.slice(-2)}`,
      referrals: e.referrals,
      earnings: `$${(e.earningsCents / 100).toFixed(2)}`,
    }));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error: unknown) {
    console.error("[Referral Leaderboard] Error:", error);
    return NextResponse.json(
      { success: false, leaderboard: [] },
      { status: 500 }
    );
  }
}
