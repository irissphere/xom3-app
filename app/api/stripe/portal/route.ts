/**
 * Stripe Customer Portal API
 * POST /api/stripe/portal
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe/client';
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

    // Get Stripe customer ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    const origin = request.headers.get('origin') || 'https://spacebaddie.com';

    const session = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${origin}/spacebaddie/studio`,
    });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Portal session error:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
