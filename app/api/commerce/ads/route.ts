import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  generateAdCreatives,
  generateAdTargeting,
  createAdTest,
  trackAdPerformance,
  optimizeROAS,
  createMultiPlatformAd,
  generateAdObject,
} from "@/lib/commerce/ad-engine";
import { toProductObject } from "@/lib/commerce/product-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function resolveProductObject(body: any) {
  if (body.productObject) return body.productObject;
  if (!body.productId) return null;
  const { data, error } = await supabase()
    .from("spacebaddie_products")
    .select("*")
    .eq("id", body.productId)
    .single();
  if (error || !data) return null;
  return toProductObject(data);
}

/**
 * POST /api/commerce/ads
 *
 * Accepts either { productObject } or { productId } (auto-fetches from DB).
 *
 * Actions:
 *  - generate       : Generate a full ad object for a product+funnel
 *  - creatives      : Generate ad creatives only
 *  - targeting      : Generate audience targeting only
 *  - test           : Create an A/B or multivariate ad test
 *  - multi-platform : Create ads across multiple platforms
 *  - track          : Track ad performance metrics
 *  - optimize       : Get ROAS optimization recommendations
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "generate" } = body;

    switch (action) {
      case "generate": {
        const productObject = await resolveProductObject(body);
        if (!productObject || !body.funnelObject) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) and funnelObject are required" },
            { status: 400 }
          );
        }
        const adObject = await generateAdObject(
          productObject,
          body.funnelObject,
          body.platform || "meta",
          body.budget
        );
        return NextResponse.json({ ok: true, adObject });
      }

      case "creatives": {
        const productObject = await resolveProductObject(body);
        if (!productObject || !body.funnelObject) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) and funnelObject are required" },
            { status: 400 }
          );
        }
        const creatives = await generateAdCreatives(productObject, body.funnelObject);
        return NextResponse.json({ ok: true, creatives });
      }

      case "targeting": {
        const productObject = await resolveProductObject(body);
        if (!productObject || !body.funnelObject) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) and funnelObject are required" },
            { status: 400 }
          );
        }
        const targeting = await generateAdTargeting(productObject, body.funnelObject);
        return NextResponse.json({ ok: true, targeting });
      }

      case "test": {
        const productObject = await resolveProductObject(body);
        if (!productObject || !body.funnelObject) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) and funnelObject are required" },
            { status: 400 }
          );
        }
        const test = await createAdTest(
          productObject,
          body.funnelObject,
          body.testType || "a_b"
        );
        return NextResponse.json({ ok: true, test });
      }

      case "multi-platform": {
        const productObject = await resolveProductObject(body);
        if (!productObject || !body.funnelObject) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) and funnelObject are required" },
            { status: 400 }
          );
        }
        const ads = await createMultiPlatformAd(
          productObject,
          body.funnelObject,
          body.platforms || ["meta", "google", "tiktok"]
        );
        return NextResponse.json({ ok: true, ads });
      }

      case "track": {
        if (!body.adId || !body.platform || !body.metrics) {
          return NextResponse.json(
            { ok: false, error: "adId, platform, and metrics are required" },
            { status: 400 }
          );
        }
        const performance = await trackAdPerformance(body.adId, body.platform, body.metrics);
        return NextResponse.json({ ok: true, performance });
      }

      case "optimize": {
        if (!body.ad || !body.performance) {
          return NextResponse.json(
            { ok: false, error: "ad and performance are required" },
            { status: 400 }
          );
        }
        const optimization = await optimizeROAS(body.ad, body.performance);
        return NextResponse.json({ ok: true, optimization });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[commerce/ads]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/** GET /api/commerce/ads - engine status */
export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: "ad-engine",
    status: "active",
    supportedPlatforms: ["meta", "google", "tiktok", "pinterest", "snapchat", "twitter"],
    modules: [
      "creative-generator",
      "audience-targeting",
      "ad-testing",
      "performance-tracking",
      "roas-optimizer",
      "multi-platform-orchestrator",
    ],
    actions: ["generate", "creatives", "targeting", "test", "multi-platform", "track", "optimize"],
  });
}
