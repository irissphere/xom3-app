/**
 * SpaceBaddie Creator → Affiliate Integration
 * POST /api/affiliate/creator-connect
 *
 * Automatically registers SpaceBaddie creators as affiliates
 * and generates store-wide + product-specific affiliate links
 * they can embed in their social content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { generateAffiliateCode } from '@/lib/affiliate/commission';

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
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const admin = getAdmin();
    const body = await request.json().catch(() => ({}));

    // Verify this user has SpaceBaddie social connections (is a creator)
    const { data: connections } = await admin
      .from('spacebaddie_social_connections')
      .select('platform, status, platform_username')
      .eq('user_id', user.id)
      .eq('status', 'connected');

    const connectedPlatforms = connections?.map(c => c.platform) || [];

    // Auto-register as affiliate if not already
    const { data: existingProfile } = await admin
      .from('affiliate_profiles')
      .select('id, user_id, tier, status')
      .eq('user_id', user.id)
      .single();

    let profile = existingProfile;
    if (!profile) {
      const { data: newProfile, error } = await admin
        .from('affiliate_profiles')
        .insert({
          user_id: user.id,
          tier: 'starter',
          payout_method: 'stripe',
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('[Creator Connect] Profile creation error:', error);
        return NextResponse.json({ error: 'Failed to create affiliate profile' }, { status: 500 });
      }
      profile = newProfile;
    }

    // Generate a store-wide link if they don't have one
    const { data: existingLink } = await admin
      .from('affiliate_links')
      .select('id, code, url')
      .eq('affiliate_user_id', user.id)
      .is('product_id', null)
      .limit(1)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io';
    let storeLink = existingLink;

    if (!storeLink) {
      const code = generateAffiliateCode('CR');
      const { data: newLink, error } = await admin
        .from('affiliate_links')
        .insert({
          affiliate_user_id: user.id,
          product_id: null,
          code,
          url: `${baseUrl}/shop?ref=${code}`,
        })
        .select()
        .single();

      if (!error && newLink) {
        storeLink = newLink;
      }
    }

    // Generate links for specific products if requested
    const productLinks: any[] = [];
    if (body.product_ids && Array.isArray(body.product_ids)) {
      for (const productId of body.product_ids.slice(0, 10)) {
        const { data: existingProductLink } = await admin
          .from('affiliate_links')
          .select('id, code, url')
          .eq('affiliate_user_id', user.id)
          .eq('product_id', productId)
          .single();

        if (existingProductLink) {
          productLinks.push(existingProductLink);
        } else {
          const code = generateAffiliateCode('CR');
          const { data: newLink } = await admin
            .from('affiliate_links')
            .insert({
              affiliate_user_id: user.id,
              product_id: productId,
              code,
              url: `${baseUrl}/shop/${productId}?ref=${code}`,
            })
            .select()
            .single();
          if (newLink) productLinks.push(newLink);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      profile: {
        id: profile!.id,
        tier: profile!.tier,
        status: profile!.status,
      },
      storeLink: storeLink ? {
        code: storeLink.code,
        url: storeLink.url,
      } : null,
      productLinks,
      connectedPlatforms,
      tips: [
        'Add your affiliate link to your social bio for passive earnings',
        'Mention products in your videos and include the link in descriptions',
        'Higher tiers = higher commissions. Keep promoting to level up!',
      ],
    });
  } catch (err) {
    console.error('[Creator Connect] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
