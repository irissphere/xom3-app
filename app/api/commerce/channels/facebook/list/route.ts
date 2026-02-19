/**
 * POST /api/commerce/channels/facebook/list
 * Body: { productId: string }
 * Creates product in Meta catalog (Marketplace) and records in product_channel_listings.
 */
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
    const catalogId = process.env.META_CATALOG_ID || process.env.FACEBOOK_CATALOG_ID;
    const token = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_CATALOG_ACCESS_TOKEN;
    if (!catalogId || !token) {
      return NextResponse.json(
        { ok: false, error: "Facebook catalog not configured. Set META_CATALOG_ID and META_ACCESS_TOKEN." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const productId = body.productId;
    if (!productId) {
      return NextResponse.json({ ok: false, error: "productId required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: product, error: fetchError } = await supabase
      .from("spacebaddie_products")
      .select("id, name, description, price, image_url")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xom3.io";
    const productUrl = `${baseUrl}/shop/${product.id}`;
    const imageUrl = product.image_url || `${baseUrl}/og-image.png`;

    const batchPayload = {
      requests: [
        {
          method: "CREATE",
          data: {
            name: product.name,
            description: (product.description || "").slice(0, 5000),
            image_url: imageUrl,
            url: productUrl,
            availability: "in stock",
            price: `${product.price} USD`,
            currency: "USD",
          },
        },
      ],
      item_type: "PRODUCT_ITEM",
      allow_upsert: true,
    };

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${catalogId}/items_batch?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchPayload),
      }
    );

    const metaData = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = metaData.error?.message || metaData.error?.error_user_msg || res.statusText;
      return NextResponse.json(
        { ok: false, error: `Facebook API: ${errMsg}` },
        { status: res.status >= 400 ? res.status : 500 }
      );
    }

    const externalId = metaData?.handles?.[0] || metaData?.product_id || null;

    const { error: insertError } = await supabase.from("product_channel_listings").upsert(
      {
        product_id: productId,
        channel: "facebook",
        external_id: externalId,
        listed_at: new Date().toISOString(),
        sync_status: "listed",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,channel" }
    );

    if (insertError) {
      console.error("[Channels Facebook] Insert listing", insertError);
    }

    return NextResponse.json({ ok: true, external_id: externalId });
  } catch (e: any) {
    console.error("[Channels Facebook List]", e);
    return NextResponse.json({ ok: false, error: e.message || "Failed to list to Facebook" }, { status: 500 });
  }
}
