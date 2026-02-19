/**
 * Single Order API
 * GET  /api/commerce/orders/[id]  – Returns a single order with its items
 * PATCH /api/commerce/orders/[id] – Update order status (sends notification email)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";
import { orderStatusUpdateEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `
      )
      .eq("id", id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { ok: false, error: error?.message || "Order not found" },
        { status: 404 }
      );
    }

    // Transform for the frontend
    const transformed = {
      id: order.id,
      user_id: order.user_id,
      status: order.status,
      total: (order.total_cents || 0) / 100,
      subtotal: (order.subtotal_cents || 0) / 100,
      tax: (order.tax_cents || 0) / 100,
      shipping: (order.shipping_cents || 0) / 100,
      email: order.email,
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      stripe_session_id: order.stripe_session_id,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: (order.order_items || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        price: (item.unit_price_cents || 0) / 100,
        total: (item.total_cents || 0) / 100,
        image_url: item.metadata?.image_url || null,
      })),
    };

    return NextResponse.json({ ok: true, order: transformed });
  } catch (error: any) {
    console.error("[Commerce Order Detail] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/commerce/orders/[id]
 * Update order status and send notification email to customer.
 * 
 * Body: { status: string, tracking_number?: string, tracking_url?: string, notes?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status, tracking_number, tracking_url, notes } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Build update payload
    const updatePayload: Record<string, any> = {};
    if (status) updatePayload.status = status;
    if (tracking_number !== undefined) updatePayload.tracking_number = tracking_number;
    if (tracking_url !== undefined) updatePayload.tracking_url = tracking_url;
    if (notes !== undefined) updatePayload.notes = notes;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id)
      .select('*, order_items(*)')
      .single();

    if (updateError || !updatedOrder) {
      return NextResponse.json(
        { ok: false, error: updateError?.message || 'Failed to update order' },
        { status: 500 }
      );
    }

    // Send status notification email (for status changes that customers care about)
    const emailStatuses = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (status && emailStatuses.includes(status) && updatedOrder.email) {
      try {
        const storeUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://spacebaddie.com';
        const emailData = orderStatusUpdateEmail({
          orderId: id,
          customerName: updatedOrder.shipping_address?.name || undefined,
          email: updatedOrder.email,
          status: status as any,
          items: (updatedOrder.order_items || []).map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: (item.unit_price_cents || 0) / 100,
          })),
          total: (updatedOrder.total_cents || 0) / 100,
          trackingNumber: tracking_number || updatedOrder.tracking_number,
          trackingUrl: tracking_url || updatedOrder.tracking_url,
          storeUrl,
        });

        await sendEmail({
          to: updatedOrder.email,
          subject: emailData.subject,
          html: emailData.html,
        });

        console.log(`[Order ${id}] Status email sent: ${status} → ${updatedOrder.email}`);
      } catch (emailErr) {
        console.error(`[Order ${id}] Status email failed (non-fatal):`, emailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        updated_at: updatedOrder.updated_at,
      },
    });
  } catch (error: any) {
    console.error("[Commerce Order Update] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
