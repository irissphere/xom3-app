/**
 * SpaceBaddie Store Checkout Status API
 * GET /api/spacebaddie/store/checkout/status
 * 
 * Returns whether Stripe checkout is configured and available
 * AKV: Commerce Sovereign - SpaceBaddie Store Lane
 */

import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/spacebaddie/store/checkout/status
 * 
 * Returns { configured: boolean } indicating if Stripe is ready for checkout
 */
export async function GET() {
  try {
    const stripe = getStripe();
    
    return NextResponse.json({
      ok: true,
      configured: !!stripe,
      message: stripe 
        ? "Checkout is available" 
        : "Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.",
    });
  } catch (error: any) {
    console.error("[SpaceBaddie Store] Status check error:", error);
    return NextResponse.json({
      ok: false,
      configured: false,
      error: error?.message || "Failed to check checkout status",
    }, { status: 500 });
  }
}
