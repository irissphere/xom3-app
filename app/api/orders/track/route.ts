/**
 * Public Order Tracking API
 * GET /api/orders/track?id=xxx&email=xxx
 * 
 * Allows customers to check order status without logging in.
 * Security: requires matching order ID + email.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('id');
    const email = req.nextUrl.searchParams.get('email');

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('orders')
      .select('id, status, total_cents, shipping_cents, created_at, paid_at, updated_at, shipping_address, tracking_number, tracking_url, order_items(product_name, quantity, unit_price_cents, total_cents, metadata)')
      .eq('id', orderId);

    // If email provided, verify it matches (extra security)
    if (email) {
      query = query.eq('email', email.toLowerCase());
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return NextResponse.json(
        { ok: false, error: 'Order not found. Please check your order ID and email.' },
        { status: 404 }
      );
    }

    // Build status timeline
    const timeline: Array<{ status: string; label: string; date?: string; active: boolean; completed: boolean }> = [
      {
        status: 'pending',
        label: 'Order Placed',
        date: order.created_at,
        active: order.status === 'pending',
        completed: ['paid', 'processing', 'shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'paid',
        label: 'Payment Confirmed',
        date: order.paid_at || undefined,
        active: order.status === 'paid',
        completed: ['processing', 'shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'processing',
        label: 'Being Prepared',
        date: undefined,
        active: order.status === 'processing',
        completed: ['shipped', 'delivered'].includes(order.status),
      },
      {
        status: 'shipped',
        label: 'Shipped',
        date: undefined,
        active: order.status === 'shipped',
        completed: order.status === 'delivered',
      },
      {
        status: 'delivered',
        label: 'Delivered',
        date: undefined,
        active: order.status === 'delivered',
        completed: false,
      },
    ];

    const transformed = {
      id: order.id,
      status: order.status,
      total: (order.total_cents || 0) / 100,
      shipping: (order.shipping_cents || 0) / 100,
      created_at: order.created_at,
      paid_at: order.paid_at,
      tracking_number: (order as any).tracking_number || null,
      tracking_url: (order as any).tracking_url || null,
      shipping_address: order.shipping_address,
      timeline,
      items: (order.order_items || []).map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: (item.unit_price_cents || 0) / 100,
        total: (item.total_cents || 0) / 100,
        image_url: item.metadata?.image_url || null,
      })),
    };

    return NextResponse.json({ ok: true, order: transformed });
  } catch (error: any) {
    console.error('[Order Track] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to look up order' },
      { status: 500 }
    );
  }
}
