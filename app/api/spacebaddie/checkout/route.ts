/**
 * SpaceBaddie Checkout API
 * Creates Stripe checkout sessions for Pro/Enterprise subscriptions
 * Uses dynamic pricing for faster setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getOrCreateCustomer } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// SpaceBaddie pricing (in cents)
const SPACEBADDIE_PLANS = {
  pro: {
    name: 'SpaceBaddie Pro',
    price_cents: 2900, // $29/month
    description: 'Unlimited videos, custom avatars, 1080p HD, social automation',
    features: [
      'Unlimited video generation',
      'Custom AI avatars',
      '1080p HD quality',
      'No watermarks',
      'Social media automation',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'SpaceBaddie Enterprise',
    price_cents: 9900, // $99/month
    description: '4K video, API access, white-label, dedicated support',
    features: [
      'Everything in Pro',
      '4K video export',
      'API access',
      'White-label option',
      'Custom integrations',
      'Dedicated support',
    ],
  },
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, plan = 'pro', trial = false, userId } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const planConfig = SPACEBADDIE_PLANS[plan as keyof typeof SPACEBADDIE_PLANS];
    if (!planConfig) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) {
      console.error('[SpaceBaddie Checkout] Stripe not configured');
      return NextResponse.json(
        { error: 'Payment processing not available' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const { customerId, isNew } = await getOrCreateCustomer({
      email,
      metadata: {
        source: 'spacebaddie',
        plan,
        userId: userId || 'anonymous',
      },
    });

    console.log('[SpaceBaddie Checkout] Customer:', customerId, isNew ? '(new)' : '(existing)');

    // Build success/cancel URLs
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://spacebaddie.com';
    const successUrl = `${origin}/spacebaddie/studio?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/spacebaddie/pricing?cancelled=true`;

    // Create checkout session with dynamic pricing (subscription mode)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
              images: ['https://spacebaddie.com/logo.png'],
              metadata: {
                plan,
                source: 'spacebaddie',
              },
            },
            unit_amount: planConfig.price_cents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: trial ? 7 : undefined,
        metadata: {
          userId: userId || 'anonymous',
          plan,
          source: 'spacebaddie',
        },
      },
      metadata: {
        type: 'spacebaddie_subscription',
        userId: userId || 'anonymous',
        plan,
        source: 'spacebaddie',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    console.log('[SpaceBaddie Checkout] Session created:', session.id, 'plan:', plan, 'trial:', trial);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('[SpaceBaddie Checkout] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

/**
 * GET - Get checkout status or subscription info
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Check if user is operator/admin - they get unlimited access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  const isPrivileged = profile?.role === 'operator' || profile?.role === 'admin';

  // Get user's subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get video usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: videosThisMonth } = await supabase
    .from('spacebaddie_video_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString())
    .in('status', ['completed', 'processing', 'queued']);

  // Operators/admins get enterprise tier, otherwise use subscription tier
  const tier = isPrivileged ? 'enterprise' : (subscription?.tier || 'free');
  const limits = {
    free: 5,
    trial: -1,
    pro: -1, // unlimited
    enterprise: -1,
  };

  return NextResponse.json({
    subscription: {
      tier,
      status: isPrivileged ? 'active' : (subscription?.status || 'active'),
      trialEndsAt: subscription?.trial_ends_at,
      currentPeriodEnd: subscription?.current_period_end,
      isPrivileged, // Include this so frontend knows
    },
    usage: {
      videosThisMonth: videosThisMonth || 0,
      videosLimit: limits[tier as keyof typeof limits] || 5,
      unlimited: tier !== 'free',
      canCreate: true, // Operators/admins can always create
    },
  });
}
