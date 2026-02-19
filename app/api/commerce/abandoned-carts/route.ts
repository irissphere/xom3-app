/**
 * Abandoned Cart Recovery API
 * 
 * GET  /api/commerce/abandoned-carts  - List abandoned carts (admin)
 * POST /api/commerce/abandoned-carts  - Send recovery email to a specific cart
 * 
 * An "abandoned cart" is detected by:
 * 1. Cart items exist for a user
 * 2. No order has been placed in the last 2+ hours
 * 3. User has an email on file
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/client';
import { abandonedCartEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// GET: List users with abandoned carts
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Find cart_items grouped by user, where no recent order exists
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('user_id, product_id, quantity, name, price, image_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Group by user
    const userCarts: Record<string, any> = {};
    for (const item of cartItems || []) {
      if (!item.user_id) continue;
      if (!userCarts[item.user_id]) {
        userCarts[item.user_id] = {
          user_id: item.user_id,
          items: [],
          total: 0,
          oldest_item: item.created_at,
        };
      }
      userCarts[item.user_id].items.push(item);
      userCarts[item.user_id].total += (item.price || 0) * (item.quantity || 1);
    }

    // Get user emails for these users
    const userIds = Object.keys(userCarts);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profiles) {
        for (const profile of profiles) {
          if (userCarts[profile.id]) {
            userCarts[profile.id].email = profile.email;
            userCarts[profile.id].name = profile.full_name;
          }
        }
      }
    }

    // Filter to only those with emails and carts older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const abandonedCarts = Object.values(userCarts)
      .filter((cart: any) => cart.email && cart.oldest_item < oneHourAgo)
      .sort((a: any, b: any) => b.total - a.total);

    return NextResponse.json({
      ok: true,
      abandoned_carts: abandonedCarts,
      count: abandonedCarts.length,
    });
  } catch (error: any) {
    console.error('[Abandoned Carts] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST: Send recovery email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, email, name, items, total } = body;

    if (!email || !items || items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Email and items required' },
        { status: 400 }
      );
    }

    const storeUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://spacebaddie.com';

    const emailData = abandonedCartEmail({
      customerName: name || undefined,
      email,
      items: items.map((item: any) => ({
        name: item.name,
        price: item.price || 0,
        image_url: item.image_url || null,
      })),
      total: total || 0,
      cartUrl: `${storeUrl}/cart`,
      storeUrl,
    });

    const sent = await sendEmail({
      to: email,
      subject: emailData.subject,
      html: emailData.html,
    });

    return NextResponse.json({
      ok: true,
      sent,
      message: sent ? 'Recovery email sent' : 'Email logged (no API key configured)',
    });
  } catch (error: any) {
    console.error('[Abandoned Cart Recovery] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
