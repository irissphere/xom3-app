import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

export async function GET(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const userId = sanitizeUserId(userIdRaw);

    if (!userId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const tierParam = req.nextUrl.searchParams.get("tier");
    const tier: "healthcare" | "xom3" = tierParam === "xom3" ? "xom3" : "healthcare";

    // Try to load subscription modules dynamically - if they fail, return default response
    try {
      const { loadSubscriptionRecord } = await import("@/lib/subscription/subscription-store");
      const subscription = await loadSubscriptionRecord({ userId });
      const subscribed = subscription?.subscribed ?? false;

      // For xom3 tier, also return promo and trial wallet status
      if (tier === "xom3") {
        try {
          const { getPromoStatus } = await import("@/lib/obols/promo");
          const { getTrialWalletStatus } = await import("@/lib/obols/obols-store");
          
          const [promo, trialWallet] = await Promise.all([
            getPromoStatus(),
            getTrialWalletStatus(userId),
          ]);

          return NextResponse.json({
            tier: "xom3",
            subscribed,
            promo: {
              promoId: promo.promoId,
              startedAtIso: promo.startedAtIso,
              endsAtIso: promo.endsAtIso,
              maxEnrollments: promo.enrolledCount + promo.reservedCount + promo.slotsRemaining,
              enrolledCount: promo.enrolledCount,
              reservedCount: promo.reservedCount,
              slotsRemaining: promo.slotsRemaining,
            },
            trial: trialWallet
              ? {
                  enrolledAtIso: trialWallet.enrolledAtIso,
                  endsAtIso: trialWallet.endsAtIso,
                  limitObols: trialWallet.limitObols,
                  usedObols: trialWallet.usedObols,
                  remainingObols: Math.max(0, trialWallet.limitObols - trialWallet.usedObols),
                  graceEndsAtIso: trialWallet.graceEndsAtIso,
                  trialActive: trialWallet.trialActive,
                  inGrace: trialWallet.inGrace,
                }
              : null,
          });
        } catch {
          // Credits modules not available, return basic response
        }
      }

      // For healthcare tier, just return subscription status
      return NextResponse.json({
        tier: "healthcare",
        subscribed,
      });
    } catch {
      // Subscription modules not available, return default response
      return NextResponse.json({
        tier,
        subscribed: false,
      });
    }
  } catch (error: any) {
    console.error("Credits status error:", error);
    // Return default response instead of error
    return NextResponse.json({
      tier: req.nextUrl.searchParams.get("tier") || "healthcare",
      subscribed: false,
    });
  }
}
