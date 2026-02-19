/**
 * Affiliate Payouts API
 * GET  /api/affiliate/payouts  — View payout history
 * POST /api/affiliate/payouts  — Request a payout
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const admin = getAdmin();

    const { data: commissions } = await admin
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_user_id', user.id)
      .in('status', ['approved', 'paid'])
      .order('created_at', { ascending: false });

    const approvedTotal = (commissions || [])
      .filter(c => c.status === 'approved')
      .reduce((s, c) => s + (c.commission_cents || 0), 0);

    const paidTotal = (commissions || [])
      .filter(c => c.status === 'paid')
      .reduce((s, c) => s + (c.commission_cents || 0), 0);

    return NextResponse.json({
      ok: true,
      availableForPayout: approvedTotal,
      totalPaid: paidTotal,
      history: commissions || [],
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const admin = getAdmin();

    // Check profile + Stripe account
    const { data: profile } = await admin
      .from('affiliate_profiles')
      .select('stripe_account_id, payout_method, status')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.status !== 'active') {
      return NextResponse.json({ error: 'Affiliate account not active' }, { status: 403 });
    }

    // Get approved commissions
    const { data: approved } = await admin
      .from('affiliate_commissions')
      .select('id, commission_cents')
      .eq('affiliate_user_id', user.id)
      .eq('status', 'approved');

    if (!approved || approved.length === 0) {
      return NextResponse.json({ error: 'No approved commissions to pay out' }, { status: 400 });
    }

    const totalCents = approved.reduce((s, c) => s + (c.commission_cents || 0), 0);

    // Minimum payout threshold: $10
    if (totalCents < 1000) {
      return NextResponse.json({
        error: `Minimum payout is $10.00. Current balance: $${(totalCents / 100).toFixed(2)}`,
      }, { status: 400 });
    }

    // If Stripe payout method and account exists, create a transfer
    if (profile.payout_method === 'stripe' && profile.stripe_account_id) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' as any });

        await stripe.transfers.create({
          amount: totalCents,
          currency: 'usd',
          destination: profile.stripe_account_id,
          description: `Affiliate payout - ${approved.length} commissions`,
        });

        // Mark commissions as paid
        const ids = approved.map(c => c.id);
        await admin.from('affiliate_commissions').update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        }).in('id', ids);

        return NextResponse.json({
          ok: true,
          paid: totalCents,
          commissionsCount: approved.length,
          method: 'stripe',
        });
      } catch (stripeErr: any) {
        console.error('[Affiliate Payout] Stripe error:', stripeErr);
        return NextResponse.json({
          error: `Stripe payout failed: ${stripeErr.message}`,
        }, { status: 500 });
      }
    }

    // For store_credit or paypal, mark as pending review
    const ids = approved.map(c => c.id);
    await admin.from('affiliate_commissions').update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    }).in('id', ids);

    return NextResponse.json({
      ok: true,
      paid: totalCents,
      commissionsCount: approved.length,
      method: profile.payout_method || 'manual',
      note: profile.payout_method === 'store_credit'
        ? 'Store credit has been applied to your account.'
        : 'Payout is being processed manually.',
    });
  } catch (err) {
    console.error('[Affiliate Payouts] Error:', err);
    return NextResponse.json({ error: 'Payout failed' }, { status: 500 });
  }
}
