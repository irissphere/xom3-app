import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia" as any,
  });
}

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Fetch the order with payment intent
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status === "refunded") {
      return NextResponse.json(
        { ok: false, error: "Order already refunded" },
        { status: 400 }
      );
    }

    const paymentIntentId = order.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return NextResponse.json(
        { ok: false, error: "No payment intent found for this order. Cannot process refund." },
        { status: 400 }
      );
    }

    // Process Stripe refund
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: (reason === "duplicate" || reason === "fraudulent" || reason === "requested_by_customer")
        ? reason
        : "requested_by_customer",
    });

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: "refunded",
        updated_at: new Date().toISOString(),
        notes: order.notes
          ? `${order.notes}\nRefund processed: ${refund.id} (${reason || "customer request"})`
          : `Refund processed: ${refund.id} (${reason || "customer request"})`,
      })
      .eq("id", orderId);

    // Restore inventory for refunded items
    try {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (orderItems) {
        for (const item of orderItems) {
          if (!item.product_id) continue;
          const { data: product } = await supabase
            .from("spacebaddie_products")
            .select("inventory_count, status")
            .eq("id", item.product_id)
            .single();

          if (product && product.inventory_count >= 0) {
            const newCount = product.inventory_count + item.quantity;
            const updateData: Record<string, any> = { inventory_count: newCount };
            if (product.status === "draft" && newCount > 0) {
              updateData.status = "active";
            }
            await supabase
              .from("spacebaddie_products")
              .update(updateData)
              .eq("id", item.product_id);
          }
        }
      }
    } catch (invErr) {
      console.error("[Refund] Inventory restoration failed (non-fatal):", invErr);
    }

    // Send refund confirmation email
    if (order.email) {
      try {
        await sendEmail({
          to: order.email,
          subject: `Refund Processed - Order #${orderId.slice(0, 8)}`,
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
              <h1 style="color: #4ade80; margin-bottom: 16px;">Refund Processed</h1>
              <p>Your refund for Order <strong>#${orderId.slice(0, 8)}</strong> has been processed.</p>
              <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0;"><strong>Amount:</strong> $${((order.total_cents || 0) / 100).toFixed(2)}</p>
                <p style="margin: 8px 0 0;"><strong>Refund ID:</strong> ${refund.id}</p>
                ${reason ? `<p style="margin: 8px 0 0;"><strong>Reason:</strong> ${reason}</p>` : ""}
              </div>
              <p style="color: #94a3b8;">The refund will appear in your account within 5-10 business days depending on your bank.</p>
              <p style="color: #64748b; font-size: 12px; margin-top: 32px;">SpaceBaddie Shop</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("[Refund] Email failed (non-fatal):", emailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error: any) {
    console.error("[Refund] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Refund failed" },
      { status: 500 }
    );
  }
}
