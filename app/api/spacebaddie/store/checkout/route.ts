/**
 * SpaceBaddie Store Checkout API
 * POST /api/spacebaddie/store/checkout
 * 
 * Creates a Stripe one-time payment checkout session for merch orders
 * AKV: Commerce Sovereign - SpaceBaddie Merch Lane
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

/**
 * POST /api/spacebaddie/store/checkout
 * 
 * Body: { items: CartItem[] }
 * Creates a Stripe Checkout session in payment mode (one-time purchase)
 */
export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const body = await req.json();
    const items: CartItem[] = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items in cart" }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || typeof item.quantity !== "number") {
        return NextResponse.json({ error: "Invalid cart item" }, { status: 400 });
      }
      if (item.price < 0 || item.quantity < 1) {
        return NextResponse.json({ error: "Invalid price or quantity" }, { status: 400 });
      }
    }

    // Get user ID if authenticated (optional for merch purchases)
    let userId: string | null = null;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch {
      // Anonymous checkout allowed
    }

    // Calculate total for metadata
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          ...(item.image ? { images: [item.image] } : {}),
          metadata: {
            productId: String(item.productId),
          },
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Create checkout session
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${baseUrl}/spacebaddie/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/commerce`,
      metadata: {
        source: "spacebaddie_store",
        itemCount: String(items.length),
        totalAmount: total.toFixed(2),
        ...(userId ? { userId } : {}),
      },
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "ES", "IT", "NL", "BE"],
      },
      // Enable customer email collection
      customer_creation: "always",
      billing_address_collection: "auto",
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error: any) {
    console.error("[SpaceBaddie Store Checkout] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Checkout failed",
    }, { status: 500 });
  }
}
