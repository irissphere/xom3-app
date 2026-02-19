/**
 * Affiliate Click Tracking API
 * GET /api/affiliate/click?ref=CODE
 *
 * Records a click on an affiliate link and sets a 30-day attribution cookie.
 * Redirects to the destination URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildAffiliateSetCookie } from '@/lib/affiliate/tracking';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('ref');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xom3.io';

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/shop`);
  }

  try {
    const admin = getAdmin();

    // Look up the affiliate link
    const { data: link } = await admin
      .from('affiliate_links')
      .select('id, url, clicks')
      .eq('code', code)
      .single();

    if (!link) {
      return NextResponse.redirect(`${baseUrl}/shop`);
    }

    // Increment click count
    await admin.from('affiliate_links').update({
      clicks: (link.clicks || 0) + 1,
    }).eq('id', link.id);

    // Set attribution cookie and redirect
    const response = NextResponse.redirect(link.url || `${baseUrl}/shop`);
    response.headers.set('Set-Cookie', buildAffiliateSetCookie(code));

    return response;
  } catch (err) {
    console.error('[Affiliate Click] Error:', err);
    return NextResponse.redirect(`${baseUrl}/shop`);
  }
}
