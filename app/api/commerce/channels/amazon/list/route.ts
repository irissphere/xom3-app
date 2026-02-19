/**
 * POST /api/commerce/channels/amazon/list
 * Body: { productId: string }
 * Creates listing in Amazon Seller Central via SP-API and records in product_channel_listings.
 * Requires: AMAZON_LWA_CLIENT_ID, AMAZON_LWA_CLIENT_SECRET, AMAZON_SP_API_REFRESH_TOKEN,
 *           AMAZON_SELLER_ID, AMAZON_MARKETPLACE_ID (e.g. ATVPDKIKX0DER for US).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

async function getLwaAccessToken(): Promise<string> {
  const clientId = process.env.AMAZON_LWA_CLIENT_ID || process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET || process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Amazon SP-API credentials not configured.");
  }

  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to get Amazon access token");
  }
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const sellerId = process.env.AMAZON_SELLER_ID;
    const marketplaceId = process.env.AMAZON_MARKETPLACE_ID || "ATVPDKIKX0DER";
    if (!sellerId) {
      return NextResponse.json(
        { ok: false, error: "Amazon Seller ID not configured. Set AMAZON_SELLER_ID." },
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
      .select("id, name, description, price, image_url, sku")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    }

    const accessToken = await getLwaAccessToken();
    const sku = product.sku || `XOM3-${product.id.slice(0, 8)}`;

    const listingPayload = {
      productType: "PRODUCT",
      requirements: "LISTING",
      attributes: {
        condition_type: [{ value: "new_new" }],
        item_name: [{ value: product.name, marketplace_id: marketplaceId }],
        product_description: [{ value: (product.description || "").slice(0, 2000), marketplace_id: marketplaceId }],
        main_product_image_locator: [{ media_location: product.image_url || "" }],
        purchase_price: [{ value: product.price, currency: "USD" }],
      },
    };

    const spApiRes = await fetch(
      `https://sellingpartnerapi-na.amazon.com/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}?marketplaceIds=${marketplaceId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-amz-access-token": accessToken,
        },
        body: JSON.stringify(listingPayload),
      }
    );

    const spData = await spApiRes.json().catch(() => ({}));

    if (!spApiRes.ok) {
      const errMsg = spData.errors?.[0]?.message || spData.message || spApiRes.statusText;
      return NextResponse.json(
        { ok: false, error: `Amazon SP-API: ${errMsg}` },
        { status: spApiRes.status >= 400 ? spApiRes.status : 500 }
      );
    }

    const externalId = spData.sku || sku;

    await supabase.from("product_channel_listings").upsert(
      {
        product_id: productId,
        channel: "amazon",
        external_id: externalId,
        listed_at: new Date().toISOString(),
        sync_status: "listed",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,channel" }
    );

    return NextResponse.json({ ok: true, external_id: externalId });
  } catch (e: any) {
    console.error("[Channels Amazon List]", e);
    return NextResponse.json({ ok: false, error: e.message || "Failed to list to Amazon" }, { status: 500 });
  }
}
