/**
 * Stripe Create Checkout Session API
 * POST /api/stripe/create-checkout
 */

import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, getOrCreateCustomer, SUBSCRIPTION_TIERS, SubscriptionTier } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tier = 'pro', trialDays } = body as { tier?: SubscriptionTier; trialDays?: number };

    const tierConfig = SUBSCRIPTION_TIERS[tier];
    if (!tierConfig || !tierConfig.priceId) {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { customerId } = await getOrCreateCustomer({
      email: user.email!,
      name: user.user_metadata?.full_name,
      metadata: {
        supabase_user_id: user.id,
      },
    });

    // Update user profile with Stripe customer ID
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);

    const origin = request.headers.get('origin') || 'https://spacebaddie.com';

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      customerEmail: user.email!,
      priceId: tierConfig.priceId,
      successUrl: `${origin}/spacebaddie/studio?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/spacebaddie?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        tier,
      },
      trialDays,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
