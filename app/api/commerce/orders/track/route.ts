import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, email } = body;

    if (!orderId || !email) {
      return NextResponse.json(
        { ok: false, error: "Order ID and email are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Look up order by ID prefix match + email
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`*, order_items(*)`)
      .ilike("email", email.trim())
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Failed to look up order" },
        { status: 500 }
      );
    }

    // Find the order matching the ID (prefix match for short IDs)
    const cleanId = orderId.trim().toLowerCase();
    const order = (orders || []).find(
      (o: any) => o.id.toLowerCase() === cleanId || o.id.toLowerCase().startsWith(cleanId)
    );

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found. Please check your order ID and email." },
        { status: 404 }
      );
    }

    // Return safe customer-facing data (no internal fields)
    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        status: order.status,
        total: (order.total_cents || 0) / 100,
        shipping: (order.shipping_cents || 0) / 100,
        created_at: order.created_at,
        updated_at: order.updated_at,
        tracking_number: order.tracking_number || null,
        tracking_url: order.tracking_url || null,
        shipping_address: order.shipping_address || null,
        items: (order.order_items || []).map((item: any) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: (item.unit_price_cents || 0) / 100,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || "Tracking lookup failed" },
      { status: 500 }
    );
  }
}
