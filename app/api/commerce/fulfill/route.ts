import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  syncSupplier,
  routeOrder,
  processShipping,
  sendCustomerNotifications,
  resolveIssue,
  generateFulfillmentObject,
} from "@/lib/commerce/fulfillment-engine";
import { toProductObject, toRevenueEvent } from "@/lib/commerce/product-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function resolveOrder(orderId: string) {
  const db = supabase();
  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderErr || !order) return null;

  const { data: items } = await db
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  return { order, items: items || [] };
}

async function resolveProductForOrder(item: any) {
  const { data, error } = await supabase()
    .from("spacebaddie_products")
    .select("*")
    .eq("id", item.product_id)
    .single();
  if (error || !data) return null;
  return toProductObject(data);
}

/**
 * POST /api/commerce/fulfill
 *
 * Accepts either full objects or { orderId } (auto-fetches from DB).
 *
 * Actions:
 *  - generate       : Generate a full fulfillment object for an order
 *  - sync-supplier  : Sync supplier data (stock, cost, shipping time)
 *  - route-order    : Determine best supplier and shipping for an order
 *  - ship           : Process shipping (label, tracking, carrier)
 *  - notify         : Send customer notifications
 *  - resolve-issue  : Handle fulfillment issues (refund, reship, etc.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "generate" } = body;

    switch (action) {
      case "generate": {
        let { orderId, revenueEvent, productObject, customerAddress, customerEmail, customerPhone, supplierId, supplierType } = body;

        // Auto-resolve from DB if only orderId is sent
        if (orderId && (!revenueEvent || !productObject || !customerAddress)) {
          const resolved = await resolveOrder(orderId);
          if (!resolved) {
            return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
          }
          const { order, items } = resolved;
          customerAddress = customerAddress || order.shipping_address || {};
          customerEmail = customerEmail || order.email || "";

          if (!productObject && items.length > 0) {
            productObject = await resolveProductForOrder(items[0]);
          }
          if (!revenueEvent && items.length > 0) {
            revenueEvent = toRevenueEvent(order, items[0]);
          }
        }

        if (!orderId || !revenueEvent || !productObject || !customerAddress) {
          return NextResponse.json(
            { ok: false, error: "orderId, revenueEvent, productObject, and customerAddress are required" },
            { status: 400 }
          );
        }

        const fulfillment = await generateFulfillmentObject(
          orderId,
          revenueEvent,
          productObject,
          customerAddress,
          customerEmail || "",
          customerPhone || "",
          supplierId,
          supplierType
        );
        return NextResponse.json({ ok: true, fulfillment });
      }

      case "sync-supplier": {
        if (!body.supplierId || !body.supplierType || !body.productId) {
          return NextResponse.json(
            { ok: false, error: "supplierId, supplierType, and productId are required" },
            { status: 400 }
          );
        }
        const supplier = await syncSupplier(body.supplierId, body.supplierType, body.productId);
        return NextResponse.json({ ok: true, supplier });
      }

      case "route-order": {
        let productObject = body.productObject;
        if (!productObject && body.productId) {
          const { data } = await supabase().from("spacebaddie_products").select("*").eq("id", body.productId).single();
          if (data) productObject = toProductObject(data);
        }

        if (!body.orderId || !body.productId || !productObject || !body.customerLocation) {
          return NextResponse.json(
            { ok: false, error: "orderId, productId, productObject, and customerLocation are required" },
            { status: 400 }
          );
        }
        const routing = await routeOrder(
          body.orderId,
          body.productId,
          productObject,
          body.customerLocation,
          body.quantity || 1,
          body.variant
        );
        return NextResponse.json({ ok: true, routing });
      }

      case "ship": {
        if (!body.orderId || !body.routing || !body.supplier || !body.customerAddress) {
          return NextResponse.json(
            { ok: false, error: "orderId, routing, supplier, and customerAddress are required" },
            { status: 400 }
          );
        }
        const shipping = await processShipping(
          body.orderId,
          body.routing,
          body.supplier,
          body.customerAddress
        );
        return NextResponse.json({ ok: true, shipping });
      }

      case "notify": {
        if (!body.orderId || !body.customerId || !body.shipping || !body.fulfillmentStatus) {
          return NextResponse.json(
            { ok: false, error: "orderId, customerId, shipping, and fulfillmentStatus are required" },
            { status: 400 }
          );
        }
        const notifications = await sendCustomerNotifications(
          body.orderId,
          body.customerId,
          body.customerEmail || "",
          body.customerPhone || "",
          body.shipping,
          body.fulfillmentStatus
        );
        return NextResponse.json({ ok: true, notifications });
      }

      case "resolve-issue": {
        if (!body.orderId || !body.issueType || !body.description || !body.customerId) {
          return NextResponse.json(
            { ok: false, error: "orderId, issueType, description, and customerId are required" },
            { status: 400 }
          );
        }
        const issue = await resolveIssue(
          body.orderId,
          body.issueType,
          body.description,
          body.customerId
        );
        return NextResponse.json({ ok: true, issue });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[commerce/fulfill]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/** GET /api/commerce/fulfill - engine status */
export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: "fulfillment-engine",
    status: "active",
    supportedSuppliers: ["aliexpress", "cj_dropshipping", "zendrop", "print_on_demand", "wholesale", "custom"],
    supportedCarriers: ["usps", "fedex", "ups", "dhl"],
    modules: [
      "supplier-sync",
      "order-routing",
      "shipping-engine",
      "customer-notifications",
      "issue-resolution",
      "fulfillment-object-generator",
    ],
    actions: ["generate", "sync-supplier", "route-order", "ship", "notify", "resolve-issue"],
  });
}
