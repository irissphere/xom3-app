/**
 * Affiliate Dashboard API
 * GET /api/affiliate/dashboard
 *
 * Returns affiliate stats: profile, tier progress, earnings breakdown,
 * link performance, and recent commissions.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { TIER_CONFIG, getNextTierProgress, calculateTier } from '@/lib/affiliate/commission';
import type { AffiliateTier } from '@/lib/affiliate/commission';

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
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const admin = getAdmin();

    // Fetch profile
    const { data: profile } = await admin
      .from('affiliate_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Not an affiliate', registered: false }, { status: 404 });
    }

    // Auto-upgrade tier if needed
    const calculatedTier = calculateTier(profile.total_sales_cents || 0);
    if (calculatedTier !== profile.tier) {
      await admin.from('affiliate_profiles').update({ tier: calculatedTier }).eq('user_id', user.id);
      profile.tier = calculatedTier;
    }

    // Tier progress
    const tierProgress = getNextTierProgress(profile.total_sales_cents || 0);

    // Earnings breakdown
    const { data: commissions } = await admin
      .from('affiliate_commissions')
      .select('*')
      .eq('affiliate_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const pendingCents = (commissions || [])
      .filter(c => c.status === 'pending')
      .reduce((s, c) => s + (c.commission_cents || 0), 0);

    const approvedCents = (commissions || [])
      .filter(c => c.status === 'approved')
      .reduce((s, c) => s + (c.commission_cents || 0), 0);

    const paidCents = (commissions || [])
      .filter(c => c.status === 'paid')
      .reduce((s, c) => s + (c.commission_cents || 0), 0);

    // Links stats
    const { data: links } = await admin
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_user_id', user.id)
      .order('created_at', { ascending: false });

    const totalClicks = (links || []).reduce((s, l) => s + (l.clicks || 0), 0);
    const totalConversions = (links || []).reduce((s, l) => s + (l.conversions || 0), 0);
    const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';

    const tierConfig = TIER_CONFIG[profile.tier as AffiliateTier] || TIER_CONFIG.starter;

    return NextResponse.json({
      ok: true,
      registered: true,
      profile: {
        ...profile,
        tierConfig,
      },
      tierProgress,
      earnings: {
        pending: pendingCents,
        approved: approvedCents,
        paid: paidCents,
        total: profile.total_commission_cents || 0,
      },
      stats: {
        totalClicks,
        totalConversions,
        conversionRate: parseFloat(conversionRate),
        totalLinks: links?.length || 0,
      },
      recentCommissions: (commissions || []).slice(0, 10),
      links: links || [],
    });
  } catch (err) {
    console.error('[Affiliate Dashboard] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
