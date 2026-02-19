import { NextRequest, NextResponse } from "next/server";
import { normalizeReferralCode, isValidReferralCode } from "@/lib/referral/codes";
import { createReferralRelationship } from "@/lib/referral/tracker";
import { 
  findReferralLinkByCode,
  getReferralsByReferrer,
  saveReferralRelationship,
  saveReferralLink
} from "@/lib/referral/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

/**
 * POST /api/referral/apply
 * Apply a referral code when a new user signs up
 * Credits the referrer when the referred user makes a purchase
 */
export async function POST(req: NextRequest) {
  try {
    const userIdRaw = req.headers.get("x-user-id") || "";
    const referredUserId = sanitizeUserId(userIdRaw);

    if (!referredUserId) {
      return NextResponse.json({ error: "Missing x-user-id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const codeRaw = typeof body.code === "string" ? body.code : "";
    const code = normalizeReferralCode(codeRaw);

    if (!isValidReferralCode(code)) {
      return NextResponse.json({ error: "Invalid referral code format" }, { status: 400 });
    }

    // Find the referrer by their code
    const referrerLink = findReferralLinkByCode(code);

    if (!referrerLink) {
      return NextResponse.json({ 
        error: "Referral code not found or inactive" 
      }, { status: 404 });
    }

    // Prevent self-referral
    if (referrerLink.userId === referredUserId) {
      return NextResponse.json({ 
        error: "Cannot use your own referral code" 
      }, { status: 400 });
    }

    // Check if user was already referred
    const existingReferrals = getReferralsByReferrer(referrerLink.userId);
    const alreadyReferred = existingReferrals.some(
      rel => rel.referredUserId === referredUserId
    );

    if (alreadyReferred) {
      return NextResponse.json({ 
        error: "User already has a referral relationship" 
      }, { status: 400 });
    }

    // Create the referral relationship
    const relationship = createReferralRelationship(
      referrerLink.userId,
      referredUserId,
      code
    );

    // Store the relationship
    saveReferralRelationship(relationship);

    // Increment signup count on the link
    referrerLink.signupCount++;
    saveReferralLink(referrerLink);

    return NextResponse.json({
      success: true,
      relationshipId: relationship.id,
      referrerUserId: referrerLink.userId.slice(0, 8) + "...", // Masked
      commissionEndDate: relationship.commissionEndDate,
      message: "Referral applied successfully. Earn 10% commission on their purchases for 3 months.",
    });
  } catch (error: any) {
    console.error("[Referral Apply] Error:", error);
    return NextResponse.json(
      { error: error?.message || "referral_apply_error" },
      { status: 500 }
    );
  }
}

