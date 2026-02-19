/**
 * POST /api/spacebaddie/subscribe
 *
 * Creates a Stripe Checkout session for SpaceBaddie subscriptions (Pro $29/mo, Enterprise $99/mo).
 * Uses the price IDs from STRIPE_PRICE_ID_PRO and STRIPE_PRICE_ID_ENTERPRISE env vars.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, SUBSCRIPTION_TIERS } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TIERS = ['pro', 'enterprise'] as const;
type SpaceBaddieTier = (typeof VALID_TIERS)[number];

export async function POST(req: NextRequest) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in to subscribe' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tier = body.tier as string;

    if (!VALID_TIERS.includes(tier as SpaceBaddieTier)) {
      return NextResponse.json({ error: 'Invalid tier. Choose pro or enterprise.' }, { status: 400 });
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier as SpaceBaddieTier];
    const priceId = tierConfig.priceId;

    if (!priceId) {
      return NextResponse.json({
        error: `Stripe price not configured for SpaceBaddie ${tier}. Set STRIPE_PRICE_ID_${tier.toUpperCase()} env var.`,
      }, { status: 500 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // Detect the domain from the request to redirect back correctly
    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const baseUrl = origin || process.env.NEXT_PUBLIC_URL || 'https://spacebaddie.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/spacebaddie/pricing`,
      metadata: {
        source: 'spacebaddie',
        tier,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          source: 'spacebaddie',
          tier,
          userId: user.id,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
      tier,
    });
  } catch (error: any) {
    console.error('[SpaceBaddie Subscribe] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create subscription checkout' },
      { status: 500 },
    );
  }
}
