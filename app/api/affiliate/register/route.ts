/**
 * Affiliate Registration API
 * POST /api/affiliate/register
 *
 * Creates an affiliate profile for the authenticated user.
 * Optionally creates a Stripe Connect Express account for payouts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = getAdmin();
    const body = await request.json().catch(() => ({}));

    // Check if already registered
    const { data: existing } = await admin
      .from('affiliate_profiles')
      .select('id, tier, status')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({
        ok: true,
        message: 'Already registered as affiliate',
        profile: existing,
      });
    }

    // Create affiliate profile
    const { data: profile, error } = await admin
      .from('affiliate_profiles')
      .insert({
        user_id: user.id,
        tier: 'starter',
        payout_method: body.payout_method || 'stripe',
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('[Affiliate Register] Error:', error);
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }

    // Optionally create a Stripe Connect account for payouts
    let stripeOnboardingUrl: string | null = null;
    if (body.payout_method === 'stripe') {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' as any });
        const account = await stripe.accounts.create({
          type: 'express',
          email: user.email,
          metadata: { affiliate_user_id: user.id },
        });

        await admin.from('affiliate_profiles').update({
          stripe_account_id: account.id,
        }).eq('user_id', user.id);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io';
        const onboarding = await stripe.accountLinks.create({
          account: account.id,
          refresh_url: `${baseUrl}/affiliate?setup=retry`,
          return_url: `${baseUrl}/affiliate?setup=complete`,
          type: 'account_onboarding',
        });
        stripeOnboardingUrl = onboarding.url;
      } catch (stripeErr) {
        console.error('[Affiliate Register] Stripe Connect error (non-fatal):', stripeErr);
      }
    }

    return NextResponse.json({
      ok: true,
      profile,
      stripeOnboardingUrl,
    });
  } catch (err) {
    console.error('[Affiliate Register] Error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
