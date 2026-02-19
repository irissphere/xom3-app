import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_CONFIG } from "@/lib/stripe/client";
import { checkPromoEligibility, reservePromoSlot } from "@/lib/obols/promo";
import { getTierConfig } from "@/lib/tiers/features";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";
import type { SubscriptionTier } from "@/lib/tiers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Valid purchasable subscription tiers
const PURCHASABLE_TIERS: SubscriptionTier[] = ["starter", "growth", "pro"];

function sanitizeUserId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 128);
}

function isValidTier(tier: string): tier is SubscriptionTier {
  return PURCHASABLE_TIERS.includes(tier as SubscriptionTier);
}

/**
 * CREATE STRIPE CHECKOUT SESSION
 * 
 * Creates a Stripe Checkout session for XOM3 subscription
 * Accepts tier: starter | growth | pro (enterprise is custom/contact sales)
 * Handles trial eligibility via Obols promo system
 * Uses Supabase auth for user identification
 */
export async function POST(req: NextRequest) {
  try {
    // Get user from Supabase auth session (primary) or fallback to header
    let userId: string | null = null;
    
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        userId = user.id;
      }
    } catch (e) {
      console.log("[Stripe Checkout] Could not get Supabase user, checking headers");
    }
    
    // Fallback to header for API clients
    if (!userId) {
      const userIdRaw = req.headers.get("x-user-id") || "";
      userId = sanitizeUserId(userIdRaw) || null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Accept actual SubscriptionTier from request (starter/growth/pro)
    // Legacy support: map old "xom3" to "pro", "healthcare" to "growth"
    let subscriptionTier: SubscriptionTier;
    if (isValidTier(body.tier)) {
      subscriptionTier = body.tier;
    } else if (body.tier === "xom3") {
      // Legacy mapping
      subscriptionTier = "pro";
    } else if (body.tier === "healthcare") {
      // Legacy mapping
      subscriptionTier = "growth";
    } else {
      // Default to starter if invalid/missing
      subscriptionTier = "starter";
    }

    const email = typeof body.email === "string" ? body.email : undefined;
    const successUrl = typeof body.successUrl === "string" ? body.successUrl : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/subscription/success`;
    const cancelUrl = typeof body.cancelUrl === "string" ? body.cancelUrl : `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/subscription/cancel`;

    // Get tier config and price ID from feature matrix (source of truth)
    const tierConfig = getTierConfig(subscriptionTier);
    const priceId = tierConfig.stripePriceId;

    if (!priceId) {
      return NextResponse.json({ 
        error: `Missing Stripe price ID for tier: ${subscriptionTier}. Set STRIPE_PRICE_XOM3_${subscriptionTier.toUpperCase()} environment variable.` 
      }, { status: 500 });
    }

    // Check trial eligibility (pro tier only for now)
    let trialEligible = false;
    let trialDays = 0;
    let promoId: string | null = null;

    if (subscriptionTier === "pro" && STRIPE_CONFIG.trial.enabled) {
      const promo = await checkPromoEligibility(userId);
      
      if (promo.eligible && promo.promoId) {
        // Reserve slot immediately
        const reserved = await reservePromoSlot(userId, promo.promoId);
        
        if (reserved.success) {
          trialEligible = true;
          trialDays = STRIPE_CONFIG.trial.days;
          promoId = promo.promoId;
        }
      }
    }

    // Create Stripe checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        ...STRIPE_CONFIG.metadata,
        userId,
        subscriptionTier, // Single source of truth for tier
        tierName: tierConfig.name,
        trialEligible: trialEligible ? "true" : "false",
        ...(promoId ? { promoId } : {}),
      },
    };

    // Add customer email if provided
    if (email) {
      sessionParams.customer_email = email;
    }

    // Add trial period if eligible
    if (trialEligible && trialDays > 0) {
      sessionParams.subscription_data = {
        trial_period_days: trialDays,
        metadata: {
          userId,
          subscriptionTier, // Consistent tier in subscription metadata
          trialObols: STRIPE_CONFIG.trial.obols.toString(),
          ...(promoId ? { promoId } : {}),
        },
      };
    } else {
      // Always include subscription metadata even without trial
      sessionParams.subscription_data = {
        metadata: {
          userId,
          subscriptionTier,
        },
      };
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      subscriptionTier,
      tierName: tierConfig.name,
      price: tierConfig.price,
      trialEligible,
      trialDays,
    });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ 
      error: error?.message || "checkout_failed" 
    }, { status: 500 });
  }
}

