import { NextRequest, NextResponse } from "next/server";
import { createCommission, creditCommission } from "@/lib/referral/commission";
import { 
  getReferralByReferred,
  saveCommission,
  getUserCommissions 
} from "@/lib/referral/store";
import { isReferralActive } from "@/lib/referral/tracker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

const COMMISSION_RATE = 0.10; // 10%

/**
 * POST /api/referral/credit
 * Called when a referred user makes a purchase
 * Credits commission to the referrer's wallet
 */
export async function POST(req: NextRequest) {
  try {
    // The referred user who made the purchase
    const referredUserIdRaw = req.headers.get("x-user-id") || "";
    const referredUserId = sanitizeUserId(referredUserIdRaw);

    if (!referredUserId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const spendCents = typeof body.spendCents === "number" ? Math.floor(body.spendCents) : 0;
    const period = typeof body.period === "string" 
      ? body.period 
      : new Date().toISOString().slice(0, 7); // YYYY-MM

    if (spendCents <= 0) {
      return NextResponse.json({ error: "Invalid spend amount" }, { status: 400 });
    }

    // Check if this user was referred
    const relationship = getReferralByReferred(referredUserId);

    if (!relationship) {
      // User wasn't referred, no commission to credit
      return NextResponse.json({
        success: true,
        credited: false,
        reason: "User has no referral relationship",
      });
    }

    // Check if referral is still active (within 3-month window)
    if (!isReferralActive(relationship)) {
      return NextResponse.json({
        success: true,
        credited: false,
        reason: "Referral commission period has ended",
      });
    }

    // Calculate commission
    const commissionCents = Math.floor(spendCents * COMMISSION_RATE);

    if (commissionCents <= 0) {
      return NextResponse.json({
        success: true,
        credited: false,
        reason: "Commission amount too small",
      });
    }

    // Create commission record
    const commission = createCommission(relationship, spendCents, period);
    
    // Save the commission
    saveCommission(commission);

    // Credit to referrer's wallet
    try {
      const walletRes = await fetch(
        `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/wallet/add-funds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": relationship.referrerUserId,
          },
          body: JSON.stringify({
            amountCents: commissionCents,
            type: "referral_commission",
            description: `Referral commission for ${period}`,
            metadata: {
              referredUserId: referredUserId.slice(0, 8) + "...",
              commissionId: commission.id,
              spendCents,
              rate: COMMISSION_RATE,
            },
          }),
        }
      );

      if (walletRes.ok) {
        // Mark commission as credited
        const creditedCommission = creditCommission(commission);
        // Update in store (in production, update DB)
        console.log(`[Referral] Credited ${commissionCents} cents to ${relationship.referrerUserId}`);

        return NextResponse.json({
          success: true,
          credited: true,
          commissionId: creditedCommission.id,
          commissionCents,
          commissionFormatted: `$${(commissionCents / 100).toFixed(2)}`,
          referrerUserId: relationship.referrerUserId.slice(0, 8) + "...",
        });
      }
    } catch (walletError) {
      console.error("[Referral Credit] Wallet credit failed:", walletError);
      // Commission record saved but not credited - can retry later
    }

    return NextResponse.json({
      success: true,
      credited: false,
      commissionId: commission.id,
      commissionCents,
      reason: "Commission recorded but wallet credit pending",
    });
  } catch (error: any) {
    console.error("[Referral Credit] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_credit_error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/referral/credit
 * Get pending commissions for a referrer
 */
export async function GET(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const userId = sanitizeUserId(userIdRaw);

    if (!userId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const commissions = getUserCommissions(userId);
    
    const pending = commissions.filter(c => !c.credited);
    const credited = commissions.filter(c => c.credited);

    const pendingTotal = pending.reduce((sum, c) => sum + c.amountCents, 0);
    const creditedTotal = credited.reduce((sum, c) => sum + c.amountCents, 0);

    return NextResponse.json({
      success: true,
      pending: {
        count: pending.length,
        totalCents: pendingTotal,
        totalFormatted: `$${(pendingTotal / 100).toFixed(2)}`,
        items: pending.slice(0, 10).map(c => ({
          id: c.id,
          amountCents: c.amountCents,
          amountFormatted: `$${(c.amountCents / 100).toFixed(2)}`,
          period: c.period,
          createdAt: c.createdAt,
        })),
      },
      credited: {
        count: credited.length,
        totalCents: creditedTotal,
        totalFormatted: `$${(creditedTotal / 100).toFixed(2)}`,
      },
    });
  } catch (error: any) {
    console.error("[Referral Credit GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_credit_error" },
      { status: 500 }
    );
  }
}


