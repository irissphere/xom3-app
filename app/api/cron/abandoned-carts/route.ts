/**
 * Abandoned Cart Recovery CRON
 * GET /api/cron/abandoned-carts
 * 
 * Vercel Cron: runs every hour
 * Scans for abandoned carts (items in cart, no order in 2+ hours)
 * Sends recovery emails via Resend (3-step sequence)
 * Logs each send to prevent spam
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/client';
import { abandonedCartEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET() {
  try {
    const supabase = getSupabase();
    const storeUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spacebaddie.com';
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Find cart items that are at least 2 hours old
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('user_id, product_id, quantity, created_at')
      .lt('created_at', twoHoursAgo)
      .order('created_at', { ascending: false });

    if (cartError || !cartItems?.length) {
      return NextResponse.json({
        ok: true,
        message: 'No abandoned carts found',
        checked: 0,
        sent: 0,
      });
    }

    // 2. Group cart items by user
    const userCarts: Record<string, { user_id: string; items: any[]; oldest: string }> = {};
    for (const item of cartItems) {
      if (!item.user_id) continue;
      if (!userCarts[item.user_id]) {
        userCarts[item.user_id] = { user_id: item.user_id, items: [], oldest: item.created_at };
      }
      userCarts[item.user_id].items.push(item);
    }

    const userIds = Object.keys(userCarts);
    if (!userIds.length) {
      return NextResponse.json({ ok: true, message: 'No user carts to check', checked: 0, sent: 0 });
    }

    // 3. Get user profiles with emails
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (!profiles?.length) {
      return NextResponse.json({ ok: true, message: 'No users with emails', checked: userIds.length, sent: 0 });
    }

    // 4. Check who has NOT received a recovery email in the last 24 hours
    const profileEmails = profiles.map(p => p.email).filter(Boolean);
    const { data: recentSends } = await supabase
      .from('abandoned_cart_emails')
      .select('email, sequence_step')
      .in('email', profileEmails)
      .gt('sent_at', oneDayAgo);

    const recentlySentEmails = new Set((recentSends || []).map(s => s.email));

    // 5. Check who has placed an order recently (they're not abandoned)
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('user_id')
      .in('user_id', userIds)
      .gt('created_at', twoHoursAgo);

    const recentOrderUserIds = new Set((recentOrders || []).map(o => o.user_id));

    // 6. Get product info for cart items
    const allProductIds = [...new Set(cartItems.map(i => i.product_id))];
    const { data: products } = await supabase
      .from('spacebaddie_products')
      .select('id, name, price, image_url')
      .in('id', allProductIds);

    const productMap: Record<string, any> = {};
    for (const p of products || []) {
      productMap[p.id] = p;
    }

    // 7. Send recovery emails
    let sentCount = 0;
    const results: any[] = [];

    for (const profile of profiles) {
      const cart = userCarts[profile.id];
      if (!cart || !profile.email) continue;
      if (recentOrderUserIds.has(profile.id)) continue;
      if (recentlySentEmails.has(profile.email)) continue;

      const enrichedItems = cart.items
        .map((item: any) => {
          const product = productMap[item.product_id];
          if (!product) return null;
          return {
            name: product.name,
            price: product.price || 0,
            image_url: product.image_url,
            quantity: item.quantity,
          };
        })
        .filter(Boolean);

      if (!enrichedItems.length) continue;

      const total = enrichedItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

      // Determine sequence step
      const { data: previousSends } = await supabase
        .from('abandoned_cart_emails')
        .select('sequence_step')
        .eq('email', profile.email)
        .order('sent_at', { ascending: false })
        .limit(1);

      const lastStep = previousSends?.[0]?.sequence_step || 0;
      const nextStep = Math.min(lastStep + 1, 3);

      if (lastStep >= 3) continue; // Max 3 emails per abandonment cycle

      const emailData = abandonedCartEmail({
        customerName: profile.full_name || undefined,
        email: profile.email,
        items: enrichedItems,
        total,
        cartUrl: `${storeUrl}/cart`,
        storeUrl,
      });

      const sent = await sendEmail({
        to: profile.email,
        subject: emailData.subject,
        html: emailData.html,
      });

      // Log the send
      await supabase.from('abandoned_cart_emails').insert({
        user_id: profile.id,
        email: profile.email,
        cart_value_cents: Math.round(total * 100),
        items_count: enrichedItems.length,
        sequence_step: nextStep,
      });

      if (sent) sentCount++;
      results.push({
        email: profile.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        items: enrichedItems.length,
        total,
        step: nextStep,
        sent,
      });
    }

    return NextResponse.json({
      ok: true,
      checked: userIds.length,
      eligible: results.length,
      sent: sentCount,
      results,
    });
  } catch (error: any) {
    console.error('[Abandoned Cart Cron] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
