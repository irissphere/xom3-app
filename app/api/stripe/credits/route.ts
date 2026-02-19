import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { CREDIT_PACKAGES } from "@/lib/obols/wallet-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/stripe/credits
 * 
 * Creates a Stripe Checkout session for purchasing credits.
 * 
 * Body:
 * - amount_cents: number (optional, for custom amounts)
 * - package_id: string (optional, e.g., 'pack_25')
 * - success_url: string (optional)
 * - cancel_url: string (optional)
 */
export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }
    
    const body = await req.json().catch(() => ({}));
    
    // Determine amount from package or custom
    let amountCents: number;
    let packageLabel: string;
    
    if (body.package_id) {
      const pkg = CREDIT_PACKAGES.find(p => p.id === body.package_id);
      if (!pkg) {
        return NextResponse.json(
          { error: "Invalid package selected" },
          { status: 400 }
        );
      }
      amountCents = pkg.amount_cents;
      packageLabel = pkg.label;
    } else if (body.amount_cents && typeof body.amount_cents === 'number') {
      amountCents = Math.round(body.amount_cents);
      // Minimum $5, maximum $500
      if (amountCents < 500) {
        return NextResponse.json(
          { error: "Minimum purchase is $5.00" },
          { status: 400 }
        );
      }
      if (amountCents > 50000) {
        return NextResponse.json(
          { error: "Maximum single purchase is $500.00. Contact support for larger amounts." },
          { status: 400 }
        );
      }
      packageLabel = `$${(amountCents / 100).toFixed(2)}`;
    } else {
      return NextResponse.json(
        { error: "Please select a package or specify an amount" },
        { status: 400 }
      );
    }
    
    // URLs — detect origin so Stripe redirects back to the correct domain
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const baseUrl = origin || process.env.NEXT_PUBLIC_URL || "https://xom3.io";
    const successUrl = body.success_url || `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = body.cancel_url || `${baseUrl}/credits`;
    
    // Get Stripe
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 500 }
      );
    }
    
    // Create Stripe Checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `XOM3 Credits - ${packageLabel}`,
              description: `Add ${packageLabel} to your XOM3 credit balance`,
              images: ["https://xom3.io/logo.png"],
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "credit_purchase",
        user_id: user.id,
        amount_cents: amountCents.toString(),
        source: "xom3-cockpit",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    
    console.log(`[Stripe Credits] Session created for user ${user.id}: ${amountCents} cents`);
    
    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
      amount_cents: amountCents,
      amount_formatted: packageLabel,
    });
  } catch (error: any) {
    console.error("[Stripe Credits] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
