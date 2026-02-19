import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateFunnelObject,
  generateLandingPage,
  optimizeCheckout,
  generateUpsells,
  generateDownsells,
  generateBundles,
  generatePostPurchase,
} from "@/lib/commerce/funnel-engine";
import { toProductObject, toStoreProduct } from "@/lib/commerce/product-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function resolveProduct(body: any) {
  if (body.productObject) return { productObject: body.productObject, storeProduct: body.storeProduct };
  if (!body.productId) return null;
  const { data, error } = await supabase()
    .from("spacebaddie_products")
    .select("*")
    .eq("id", body.productId)
    .single();
  if (error || !data) return null;
  return { productObject: toProductObject(data), storeProduct: toStoreProduct(data) };
}

/**
 * POST /api/commerce/funnels
 *
 * Accepts either { productObject, storeProduct } or { productId } (auto-fetches from DB).
 *
 * Actions:
 *  - generate       : Generate a full funnel object for a product
 *  - landing-page   : Generate just the landing page
 *  - checkout       : Generate optimized checkout config
 *  - upsells        : Generate upsell offers
 *  - downsells      : Generate downsell offers
 *  - bundles        : Generate bundle offers
 *  - post-purchase  : Generate post-purchase flow
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "generate", relatedProducts = [] } = body;

    const resolved = await resolveProduct(body);
    if (!resolved) {
      return NextResponse.json(
        { ok: false, error: "productObject or productId is required" },
        { status: 400 }
      );
    }
    const { productObject, storeProduct } = resolved;

    switch (action) {
      case "generate": {
        if (!storeProduct) {
          return NextResponse.json(
            { ok: false, error: "storeProduct is required for full funnel generation" },
            { status: 400 }
          );
        }
        const funnel = await generateFunnelObject(productObject, storeProduct, relatedProducts);
        return NextResponse.json({ ok: true, funnel });
      }

      case "landing-page": {
        if (!storeProduct) {
          return NextResponse.json(
            { ok: false, error: "storeProduct is required for landing page generation" },
            { status: 400 }
          );
        }
        const landingPage = await generateLandingPage(productObject, storeProduct);
        return NextResponse.json({ ok: true, landingPage });
      }

      case "checkout": {
        const checkout = await optimizeCheckout(productObject);
        return NextResponse.json({ ok: true, checkout });
      }

      case "upsells": {
        const upsells = await generateUpsells(productObject, relatedProducts);
        return NextResponse.json({ ok: true, upsells });
      }

      case "downsells": {
        const downsells = await generateDownsells(productObject, relatedProducts);
        return NextResponse.json({ ok: true, downsells });
      }

      case "bundles": {
        const bundles = await generateBundles(productObject, relatedProducts);
        return NextResponse.json({ ok: true, bundles });
      }

      case "post-purchase": {
        const postPurchase = await generatePostPurchase(productObject, relatedProducts);
        return NextResponse.json({ ok: true, postPurchase });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[commerce/funnels]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/** GET /api/commerce/funnels - engine status */
export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: "funnel-engine",
    status: "active",
    modules: [
      "landing-page-generator",
      "product-page-optimizer",
      "upsell-engine",
      "downsell-engine",
      "bundle-engine",
      "checkout-optimizer",
      "post-purchase-engine",
    ],
    actions: ["generate", "landing-page", "checkout", "upsells", "downsells", "bundles", "post-purchase"],
  });
}
