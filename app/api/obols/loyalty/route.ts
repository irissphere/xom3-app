import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

/**
 * GET /api/obols/loyalty
 * Returns loyalty points status for a user
 * Note: Route path uses 'obols' for backwards compatibility
 */
export async function GET(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const userId = sanitizeUserId(userIdRaw);

    if (!userId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    // Try to load subscription record - loyalty points stored separately
    try {
      const { loadSubscriptionRecord } = await import("@/lib/subscription/subscription-store");
      const subscription = await loadSubscriptionRecord({ userId });
      
      // Loyalty points would be stored in a separate system in production
      const loyaltyPoints = 0; // TODO: Integrate with loyalty points store
      
      return NextResponse.json({
        userId,
        loyaltyPoints,
        tier: subscription?.subscribed ? "paid" : "trial",
        multiplier: subscription?.subscribed ? 2.0 : 1.0,
        message: "Loyalty status retrieved",
      });
    } catch {
      // Subscription modules not available, return default response
      return NextResponse.json({
        userId,
        loyaltyPoints: 0,
        tier: "trial",
        multiplier: 1.0,
        message: "Loyalty status (default)",
      });
    }
  } catch (error: unknown) {
    console.error("Loyalty error:", error);
    return NextResponse.json({ 
      loyaltyPoints: 0,
      tier: "trial",
      multiplier: 1.0,
      message: "Error retrieving loyalty status"
    });
  }
}

/**
 * POST /api/obols/loyalty
 * Awards loyalty points to a user
 * Note: Route path uses 'obols' for backwards compatibility
 */
export async function POST(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const userId = sanitizeUserId(userIdRaw);

    if (!userId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const points = typeof body.points === "number" ? body.points : 0;
    const reason = typeof body.reason === "string" ? body.reason : "manual";

    if (points <= 0) {
      return NextResponse.json({ 
        success: false,
        message: "Invalid points amount (must be positive)"
      }, { status: 400 });
    }

    // Points awarded - in production this would update the database
    return NextResponse.json({
      success: true,
      userId,
      pointsAwarded: points,
      reason,
      message: `Awarded ${points} loyalty points`,
    });
  } catch (error: unknown) {
    console.error("Loyalty award error:", error);
    return NextResponse.json({ error: "Failed to award loyalty points" }, { status: 500 });
  }
}

