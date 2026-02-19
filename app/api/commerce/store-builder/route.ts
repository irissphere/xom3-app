import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildStore,
  generateStoreObject,
  generateProductPage,
  buildCollections,
  applyBranding,
  buildProductVariants,
  type StoreBuilderConfig,
} from "@/lib/commerce/store-engine";
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
 * POST /api/commerce/store-builder
 *
 * Accepts either { productObject } or { productId } (auto-fetches from DB).
 *
 * Actions:
 *  - build          : Create a new store skeleton
 *  - generate       : Generate a full store object with products
 *  - product-page   : Generate a product page for a single product
 *  - collections    : Build collections from products
 *  - branding       : Apply branding to a store
 *  - variants       : Build product variants
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "build" } = body;

    switch (action) {
      case "build": {
        const config: StoreBuilderConfig = {
          storeName: body.storeName || "My Store",
          domain: body.domain || "mystore.xom3.io",
          theme: body.theme,
          category: body.category,
        };
        const store = await buildStore(config);
        return NextResponse.json({ ok: true, store });
      }

      case "generate": {
        if (!body.store || !body.productObjects) {
          return NextResponse.json(
            { ok: false, error: "store and productObjects are required" },
            { status: 400 }
          );
        }
        const storeObject = await generateStoreObject(body.store, body.productObjects);
        return NextResponse.json({ ok: true, storeObject });
      }

      case "product-page": {
        const productObject = await resolveProductObject(body);
        const productId = body.productId || productObject?.id;
        if (!productObject || !productId) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) is required" },
            { status: 400 }
          );
        }
        const productPage = await generateProductPage(productObject, productId);
        return NextResponse.json({ ok: true, productPage });
      }

      case "collections": {
        if (!body.products || !body.storeId) {
          return NextResponse.json(
            { ok: false, error: "products and storeId are required" },
            { status: 400 }
          );
        }
        const collections = await buildCollections(body.products, body.storeId);
        return NextResponse.json({ ok: true, collections });
      }

      case "branding": {
        if (!body.store) {
          return NextResponse.json(
            { ok: false, error: "store is required" },
            { status: 400 }
          );
        }
        const brandedStore = await applyBranding(body.store, body.brandingConfig);
        return NextResponse.json({ ok: true, store: brandedStore });
      }

      case "variants": {
        const productObject = await resolveProductObject(body);
        const productId = body.productId || productObject?.id;
        if (!productObject || !productId) {
          return NextResponse.json(
            { ok: false, error: "productObject (or productId) is required" },
            { status: 400 }
          );
        }
        const variants = await buildProductVariants(productObject, productId);
        return NextResponse.json({ ok: true, variants });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error("[commerce/store-builder]", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/** GET /api/commerce/store-builder - engine status */
export async function GET() {
  return NextResponse.json({
    ok: true,
    engine: "store-engine",
    status: "active",
    modules: [
      "store-builder",
      "product-page-generator",
      "collection-engine",
      "branding-engine",
      "inventory-variant-engine",
      "store-object-generator",
    ],
    actions: ["build", "generate", "product-page", "collections", "branding", "variants"],
  });
}
