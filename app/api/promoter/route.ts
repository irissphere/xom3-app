import { NextRequest, NextResponse } from "next/server";
import {
  createPromoter,
  getPromoterStatus,
  getPromoterSummary,
  getAllPromoters,
  isActivePromoter,
} from "@/lib/promoter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/promoter
 * Get promoter status or list all promoters (admin)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    const listAll = req.nextUrl.searchParams.get("all") === "true";

    // List all promoters (admin only - add auth check in production)
    if (listAll) {
      const promoters = getAllPromoters();
      return NextResponse.json({
        success: true,
        count: promoters.length,
        promoters: promoters.map(p => ({
          ...p,
          summary: getPromoterSummary(p.userId),
        })),
      });
    }

    // Get specific promoter status
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const status = getPromoterStatus(userId);
    if (!status) {
      return NextResponse.json({
        success: true,
        isPromoter: false,
        message: "User is not a promoter",
      });
    }

    const summary = getPromoterSummary(userId);

    return NextResponse.json({
      success: true,
      isPromoter: true,
      status,
      summary,
    });
  } catch (error: any) {
    console.error("[Promoter GET] Error:", error);
    return NextResponse.json(
      { error: error?.message || "promoter_error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/promoter
 * Create a new promoter account
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, name } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Check if already a promoter
    if (isActivePromoter(userId)) {
      return NextResponse.json({
        success: false,
        error: "User is already a promoter",
        status: getPromoterStatus(userId),
      }, { status: 409 });
    }

    // Create promoter account
    const status = createPromoter(userId);
    const summary = getPromoterSummary(userId);

    console.log(`[Promoter] Created new promoter: ${userId} (${email || name || "unknown"})`);

    return NextResponse.json({
      success: true,
      message: "Promoter account created successfully",
      status,
      summary,
      nextSteps: [
        "Share your referral link to earn 10% commission",
        "You have 30 days grace period to get started",
        "After grace period, refer at least 1 client per month to stay active",
        "If inactive, your account will convert to a paid subscription",
      ],
    });
  } catch (error: any) {
    console.error("[Promoter POST] Error:", error);
    return NextResponse.json(
      { error: error?.message || "promoter_create_error" },
      { status: 500 }
    );
  }
}


