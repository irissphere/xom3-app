/**
 * Affiliate Links API
 * GET  /api/affiliate/links  — List my affiliate links
 * POST /api/affiliate/links  — Generate a new affiliate link
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: links, error } = await admin
      .from('affiliate_links')
      .select('*')
      .eq('affiliate_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, links: links || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 });
    }

    const admin = getAdmin();

    // Verify affiliate profile exists
    const { data: profile } = await admin
      .from('affiliate_profiles')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.status !== 'active') {
      return NextResponse.json({ error: 'Not registered as affiliate' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const productId = body.product_id || null;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io';

    // Generate unique code
    let code = generateAffiliateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: exists } = await admin.from('affiliate_links').select('id').eq('code', code).single();
      if (!exists) break;
      code = generateAffiliateCode();
      attempts++;
    }

    const url = productId
      ? `${baseUrl}/shop/${productId}?ref=${code}`
      : `${baseUrl}/shop?ref=${code}`;

    const { data: link, error } = await admin
      .from('affiliate_links')
      .insert({
        affiliate_user_id: user.id,
        product_id: productId,
        code,
        url,
      })
      .select()
      .single();

    if (error) {
      console.error('[Affiliate Links] Error:', error);
      return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, link });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
