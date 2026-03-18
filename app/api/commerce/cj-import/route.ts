/**
 * CJ Dropshipping Product Search & Import API
 * POST /api/commerce/cj-import
 *
 * Actions:
 *   { action: "search", query: "..." }          - Search CJ catalog, return matches
 *   { action: "import", pid: "...", markup: 2.5 } - Import a CJ product into the store
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchCJProducts, getCJProduct } from "@/lib/commerce/suppliers/cj-dropship";
import { stripHtml } from "@/lib/commerce/html-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Best-effort category mapping from CJ's categoryName to our unified list.
 */
function mapCJCategory(cjCategory: string): string {
  if (!cjCategory) return "Other";
  const lower = cjCategory.toLowerCase();

  const mapping: Record<string, string> = {
    electronics: "Electronics",
    phone: "Electronics",
    computer: "Electronics",
    laptop: "Electronics",
    tablet: "Electronics",
    audio: "Electronics",
    camera: "Electronics",
    earbud: "Electronics",
    earphone: "Electronics",
    headphone: "Electronics",
    headset: "Electronics",
    bluetooth: "Electronics",
    wireless: "Electronics",
    speaker: "Electronics",
    charger: "Electronics",
    cable: "Electronics",
    adapter: "Electronics",
    drone: "Electronics",
    fashion: "Fashion",
    clothing: "Fashion",
    apparel: "Fashion",
    shoes: "Fashion",
    dress: "Fashion",
    shirt: "Fashion",
    beauty: "Beauty",
    makeup: "Beauty",
    skincare: "Beauty",
    cosmetic: "Beauty",
    health: "Health & Wellness",
    wellness: "Health & Wellness",
    supplement: "Health & Wellness",
    vitamin: "Health & Wellness",
    home: "Home & Garden",
    garden: "Home & Garden",
    furniture: "Home & Garden",
    decor: "Home & Garden",
    kitchen: "Kitchen",
    cooking: "Kitchen",
    pet: "Pet Supplies",
    dog: "Pet Supplies",
    cat: "Pet Supplies",
    fitness: "Fitness",
    sport: "Fitness",
    gym: "Fitness",
    yoga: "Fitness",
    toy: "Toys & Games",
    game: "Toys & Games",
    baby: "Baby & Kids",
    kid: "Baby & Kids",
    children: "Baby & Kids",
    auto: "Automotive",
    car: "Automotive",
    vehicle: "Automotive",
    jewelry: "Jewelry & Accessories",
    accessories: "Jewelry & Accessories",
    watch: "Jewelry & Accessories",
    ring: "Jewelry & Accessories",
    necklace: "Jewelry & Accessories",
    outdoor: "Outdoor & Sports",
    camping: "Outdoor & Sports",
    hiking: "Outdoor & Sports",
    fishing: "Outdoor & Sports",
    throwing: "Outdoor & Sports",
    knife: "Outdoor & Sports",
    knives: "Outdoor & Sports",
    sports: "Outdoor & Sports",
    equipment: "Outdoor & Sports",
    surveillance: "Electronics",
    security: "Electronics",
    smart: "Electronics",
    lighting: "Home & Garden",
    led: "Electronics",
    lamp: "Home & Garden",
    office: "Office",
    stationery: "Office",
  };

  for (const [keyword, category] of Object.entries(mapping)) {
    if (lower.includes(keyword)) return category;
  }
  return "Other";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "search") {
      return handleSearch(body);
    } else if (action === "import") {
      return handleImport(body);
    } else {
      return NextResponse.json(
        { ok: false, error: 'Invalid action. Use "search" or "import".' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("[CJ Import] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "CJ import failed" },
      { status: 500 }
    );
  }
}

/* ───── Search CJ Catalog ───── */

async function handleSearch(body: { query?: string; limit?: number }) {
  const { query, limit = 8 } = body;

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { ok: false, error: "Search query is required (min 2 chars)" },
      { status: 400 }
    );
  }

  const results = await searchCJProducts(query.trim(), limit);

  return NextResponse.json({
    ok: true,
    query: query.trim(),
    count: results.length,
    products: results.map((p) => ({
      pid: p.pid,
      name: p.name,
      image: p.image,
      sellPrice: p.sellPrice,
      sourcePrice: p.sourcePrice,
      category: p.category,
      mappedCategory: mapCJCategory(p.category),
      variantCount: p.variants?.length || 0,
      variants: (p.variants || []).slice(0, 5).map((v) => ({
        vid: v.vid,
        name: v.name,
        price: v.price,
        sku: v.sku,
      })),
    })),
  });
}

/* ───── Import CJ Product into Store ───── */

async function handleImport(body: {
  pid?: string;
  markup?: number;
  customName?: string;
  customCategory?: string;
}) {
  const { pid, markup = 2.5, customName, customCategory } = body;

  if (!pid) {
    return NextResponse.json(
      { ok: false, error: "CJ product ID (pid) is required" },
      { status: 400 }
    );
  }

  // Fetch full product details from CJ
  const cjProduct = await getCJProduct(pid);
  if (!cjProduct) {
    return NextResponse.json(
      { ok: false, error: "Product not found on CJ Dropshipping" },
      { status: 404 }
    );
  }

  // Calculate retail price from source cost + markup
  const cost = cjProduct.sourcePrice || cjProduct.sellPrice || 0;
  const retailPrice = Math.ceil(cost * markup * 100) / 100; // e.g. $4.20 source * 2.5 = $10.50

  const mappedCategory = (customCategory && customCategory.trim()) || mapCJCategory(cjProduct.category) || "Other";
  const productName = stripHtml(customName || cjProduct.name);

  // Build description from CJ data - keep HTML for rich display but sanitize at render
  const description =
    cjProduct.description ||
    `${productName} — sourced via CJ Dropshipping. Ships in 7-15 business days.`;

  const supabase = getSupabaseAdmin();

  const firstVid = cjProduct.variants?.[0]?.vid || pid;
  const insertData: Record<string, any> = {
    name: productName,
    description,
    price: retailPrice,
    category: mappedCategory,
    status: "active",
    image_url: cjProduct.image || null,
    inventory_count: -1, // unlimited (dropshipped)
    shipping_required: true,
    product_type: "physical",
    sku: `CJ-${pid}`,
    supplier_source: "cj_dropshipping",
    supplier_sku: firstVid,
    metadata: JSON.stringify({
      supplier_source: "cj_dropshipping",
      cj_pid: pid,
      cj_source_price: cost,
      cj_sell_price: cjProduct.sellPrice,
      cj_category: cjProduct.category,
      markup_multiplier: markup,
      imported_at: new Date().toISOString(),
      variants: (cjProduct.variants || []).map((v) => ({
        vid: v.vid,
        name: v.name,
        price: v.price,
        sku: v.sku,
      })),
    }),
  };

  const { data: product, error } = await supabase
    .from("spacebaddie_products")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[CJ Import] Supabase insert error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    product,
    cj: {
      pid,
      sourcePrice: cost,
      retailPrice,
      markup,
      category: mappedCategory,
      variantCount: cjProduct.variants?.length || 0,
    },
  });
}
