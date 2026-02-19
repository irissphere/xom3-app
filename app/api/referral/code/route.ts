import { NextRequest, NextResponse } from "next/server";
import { 
  generateReferralCode, 
  createReferralLink, 
  getReferralUrl 
} from "@/lib/referral/codes";
import { 
  getUserReferralLink, 
  saveReferralLink, 
  findReferralLinkByCode 
} from "@/lib/referral/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

/**
 * GET /api/referral/code
 * Get or create a user's referral code
 */
export async function GET(req: NextRequest) {
  try {
    // Get userId from header or use demo user for testing
    const userIdRaw = req.headers.get("x-user-id") || "demo-operator";
    const userId = sanitizeUserId(userIdRaw);

    // Check if user already has a referral link
    let link = getUserReferralLink(userId);

    if (!link) {
      // Generate new code and create link
      const code = generateReferralCode();
      link = createReferralLink(userId, code);
      saveReferralLink(link);
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://kairosdashboard.me";
    const referralUrl = getReferralUrl(link.code, baseUrl);

    return NextResponse.json({
      success: true,
      code: link.code,
      url: referralUrl,
      clicks: link.clickCount,
      signups: link.signupCount,
      active: link.active,
      createdAt: link.createdAt,
    });
  } catch (error: any) {
    console.error("[Referral Code] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_code_error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referral/code
 * Track a referral code click
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.toUpperCase().trim() : "";

    if (!code || code.length < 6) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    // Find the link by code
    const foundLink = findReferralLinkByCode(code);

    if (!foundLink) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    // Increment click count
    foundLink.clickCount++;
    saveReferralLink(foundLink);

    return NextResponse.json({
      success: true,
      code: foundLink.code,
      valid: foundLink.active,
    });
  } catch (error: any) {
    console.error("[Referral Click] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_click_error" },
      { status: 500 }
    );
  }
}

