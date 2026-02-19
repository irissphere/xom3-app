import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

// GET all orders (admin view)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[Commerce Orders] Error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Transform for compatibility with the existing UI
    const transformedOrders = (orders || []).map(order => ({
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      total_amount: (order.total_cents || 0) / 100,
      created_at: order.created_at,
      updated_at: order.updated_at,
      email: order.email,
      shipping_address: order.shipping_address,
      stripe_session_id: order.stripe_session_id,
      items: (order.order_items || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        price: (item.unit_price_cents || 0) / 100,
      })),
    }));

    return NextResponse.json({ ok: true, orders: transformedOrders });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST create new order (used by checkout)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: body.user_id || null,
        email: body.email || '',
        status: body.status || 'pending',
        subtotal_cents: body.subtotal_cents || 0,
        tax_cents: body.tax_cents || 0,
        shipping_cents: body.shipping_cents || 0,
        total_cents: body.total_cents || 0,
        shipping_address: body.shipping_address || null,
        stripe_session_id: body.stripe_session_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Commerce Orders] Create error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Insert order items if provided
    if (body.items && Array.isArray(body.items)) {
      const orderItems = body.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name || item.name,
        quantity: item.quantity || 1,
        unit_price_cents: item.unit_price_cents || Math.round((item.price || 0) * 100),
        total_cents: (item.unit_price_cents || Math.round((item.price || 0) * 100)) * (item.quantity || 1),
      }));

      await supabase.from('order_items').insert(orderItems);
    }

    return NextResponse.json({ ok: true, order });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
