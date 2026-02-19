/**
 * Returns API
 * POST /api/commerce/returns - Submit a return request
 * GET  /api/commerce/returns - List returns (admin)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/client";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * GET - List all return requests (admin)
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: returns, error } = await supabase
      .from("return_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, returns: returns || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST - Submit a return request (customer-facing)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, email, items, reason, details } = body;

    if (!orderId || !email || !reason) {
      return NextResponse.json(
        { ok: false, error: "Order ID, email, and reason are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Verify the order exists and belongs to this email
    const { data: orders } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .ilike("email", email.trim())
      .order("created_at", { ascending: false });

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

    // Must be in a returnable state
    const returnableStatuses = ["paid", "processing", "shipped", "delivered"];
    if (!returnableStatuses.includes(order.status?.toLowerCase())) {
      return NextResponse.json(
        { ok: false, error: `Orders with status "${order.status}" cannot be returned. Only paid, processing, shipped, or delivered orders qualify.` },
        { status: 400 }
      );
    }

    // Check if already has a return
    const { data: existingReturn } = await supabase
      .from("return_requests")
      .select("id")
      .eq("order_id", order.id)
      .not("status", "eq", "rejected")
      .single();

    if (existingReturn) {
      return NextResponse.json(
        { ok: false, error: "A return request already exists for this order." },
        { status: 400 }
      );
    }

    // Create the return request
    const { data: returnReq, error } = await supabase
      .from("return_requests")
      .insert({
        order_id: order.id,
        email: email.trim(),
        reason,
        details: details || null,
        items: items || null,
        status: "pending",
        total_cents: order.total_cents || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Send confirmation email
    try {
      await sendEmail({
        to: email.trim(),
        subject: `Return Request Received - Order #${order.id.slice(0, 8)}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
            <h1 style="color: #a78bfa; margin-bottom: 16px;">Return Request Received</h1>
            <p>We've received your return request for Order <strong>#${order.id.slice(0, 8)}</strong>.</p>
            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0;"><strong>Reason:</strong> ${reason}</p>
              ${details ? `<p style="margin: 8px 0 0;"><strong>Details:</strong> ${details}</p>` : ""}
              <p style="margin: 8px 0 0;"><strong>Status:</strong> Pending Review</p>
            </div>
            <p style="color: #94a3b8;">We'll review your request within 1-2 business days and send you instructions for returning your items.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 32px;">SpaceBaddie Shop</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[Returns] Email failed (non-fatal):", emailErr);
    }

    return NextResponse.json({
      ok: true,
      returnRequest: {
        id: returnReq.id,
        status: "pending",
        message: "Return request submitted. We'll email you within 1-2 business days with next steps.",
      },
    });
  } catch (err: any) {
    console.error("[Returns] Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
