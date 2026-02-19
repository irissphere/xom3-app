/**
 * Shop Search API — unified search across local store and supplier catalogs
 * GET /api/shop/search?query=...&source=shop|cj_dropshipping&category=...&limit=12
 *
 * Sources:
 *   "shop" (default)         — Searches existing spacebaddie_products in Supabase
 *   "cj_dropshipping"        — Live search against CJ Dropshipping catalog
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchCJProducts } from "@/lib/commerce/suppliers/cj-dropship";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

interface NormalizedProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  source: "shop" | "cj_dropshipping";
  source_id?: string;
  source_price?: number;
  seller_name: string;
  variant_count?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query")?.trim() || "";
    const source = searchParams.get("source") || "shop";
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "12", 10), 50);

    if (!query || query.length < 2) {
      return NextResponse.json(
        { ok: false, error: "Search query is required (min 2 characters)" },
        { status: 400 }
      );
    }

    if (source === "cj_dropshipping") {
      try {
        return await handleCJSearch(query, limit);
      } catch (err: any) {
        const msg = err?.message || "";
        if (msg.toLowerCase().includes("not configured") || (msg.includes("CJ_API_KEY") && !msg.includes("authentication"))) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "CJ Dropshipping search is not configured. Add CJ_API_KEY in project settings to enable.",
            },
            { status: 503 }
          );
        }
        if (msg.includes("authentication failed") || msg.includes("getAccessToken failed")) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "CJ authentication failed. Use your API key (CJUserNum@api@xxx) or refresh the access token. Tokens expire every 15 days.",
            },
            { status: 503 }
          );
        }
        throw err;
      }
    }

    return handleShopSearch(query, category, limit);
  } catch (error: any) {
    console.error("[Shop Search] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}

async function handleShopSearch(
  query: string,
  category: string | null,
  limit: number
) {
  const supabase = getSupabaseAdmin();

  let dbQuery = supabase
    .from("spacebaddie_products")
    .select("id, name, description, price, image_url, category, user_id, inventory_count")
    .eq("status", "active")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category && category !== "All") {
    dbQuery = dbQuery.eq("category", category);
  }

  const { data: products, error } = await dbQuery;

  if (error) {
    console.error("[Shop Search] Supabase error:", error);
    return NextResponse.json(
      { ok: false, error: "Search failed" },
      { status: 500 }
    );
  }

  // Enrich with seller names
  const userIds = Array.from(new Set((products || []).map((p) => p.user_id)));
  let sellers: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    if (profiles) {
      sellers = profiles.reduce((acc, p) => {
        acc[p.user_id] = p.display_name || "Creator";
        return acc;
      }, {} as Record<string, string>);
    }
  }

  const normalized: NormalizedProduct[] = (products || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    image_url: p.image_url,
    category: p.category,
    source: "shop" as const,
    seller_name: sellers[p.user_id] || "Creator",
  }));

  return NextResponse.json({
    ok: true,
    source: "shop",
    query,
    count: normalized.length,
    products: normalized,
  });
}

async function handleCJSearch(query: string, limit: number) {
  const results = await searchCJProducts(query, limit);

  const CATEGORY_MAP: Record<string, string> = {
    electronics: "Electronics", phone: "Electronics", computer: "Electronics",
    fashion: "Fashion", clothing: "Fashion", apparel: "Fashion", shoes: "Fashion",
    beauty: "Beauty", makeup: "Beauty", skincare: "Beauty",
    health: "Health & Wellness", wellness: "Health & Wellness",
    home: "Home & Garden", garden: "Home & Garden", furniture: "Home & Garden",
    kitchen: "Kitchen", cooking: "Kitchen",
    pet: "Pet Supplies", dog: "Pet Supplies", cat: "Pet Supplies",
    fitness: "Fitness", sport: "Fitness", gym: "Fitness",
    toy: "Toys & Games", game: "Toys & Games",
    baby: "Baby & Kids", kid: "Baby & Kids",
    auto: "Automotive", car: "Automotive",
    jewelry: "Jewelry & Accessories", accessories: "Jewelry & Accessories",
    outdoor: "Outdoor & Sports", camping: "Outdoor & Sports",
    office: "Office", stationery: "Office",
  };

  function mapCategory(cjCat: string): string {
    if (!cjCat) return "Other";
    const lower = cjCat.toLowerCase();
    for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
      if (lower.includes(kw)) return cat;
    }
    return "Other";
  }

  const normalized: NormalizedProduct[] = results.map((p) => ({
    id: `cj-${p.pid}`,
    name: p.name,
    description: p.description || null,
    price: Math.ceil((p.sourcePrice || p.sellPrice || 0) * 2.5 * 100) / 100,
    image_url: p.image || null,
    category: mapCategory(p.category),
    source: "cj_dropshipping" as const,
    source_id: p.pid,
    source_price: p.sourcePrice || p.sellPrice || 0,
    seller_name: "CJ Dropshipping",
    variant_count: p.variants?.length || 0,
  }));

  return NextResponse.json({
    ok: true,
    source: "cj_dropshipping",
    query,
    count: normalized.length,
    products: normalized,
  });
}
