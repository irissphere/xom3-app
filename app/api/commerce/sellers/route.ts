/**
 * Seller Marketplace API
 * GET  /api/commerce/sellers - List sellers (admin)
 * POST /api/commerce/sellers - Register as a seller
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" as any });
}

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * GET - List all sellers (admin view)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: sellers, error } = await supabase
      .from("marketplace_sellers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sellers: sellers || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST - Register as a seller
 * Creates Stripe Connect Express account for split payments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, storeName, userId } = body;

    if (!email || !storeName) {
      return NextResponse.json(
        { ok: false, error: "Email and store name are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if seller already exists
    const { data: existing } = await supabase
      .from("marketplace_sellers")
      .select("id")
      .eq("email", email)
      .single();

    if (existing) {
      return NextResponse.json(
        { ok: false, error: "A seller with this email already exists" },
        { status: 400 }
      );
    }

    // Create Stripe Connect Express account
    let stripeAccountId: string | null = null;
    let onboardingUrl: string | null = null;

    try {
      const stripe = getStripe();
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: storeName,
        },
      });

      stripeAccountId = account.id;

      // Generate onboarding link
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "https://xom3.io";
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${baseUrl}/commerce/marketplace/onboarding?refresh=true`,
        return_url: `${baseUrl}/commerce/marketplace/onboarding?success=true`,
        type: "account_onboarding",
      });

      onboardingUrl = accountLink.url;
    } catch (stripeErr: any) {
      console.error("[Marketplace] Stripe Connect error:", stripeErr);
      // Still create the seller record, Stripe can be set up later
    }

    // Create seller in database
    const { data: seller, error } = await supabase
      .from("marketplace_sellers")
      .insert({
        user_id: userId || null,
        email,
        store_name: storeName,
        stripe_account_id: stripeAccountId,
        commission_rate: 0.15, // 15% platform fee
        status: stripeAccountId ? "pending_onboarding" : "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      seller,
      onboardingUrl,
    });
  } catch (err: any) {
    console.error("[Marketplace] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
