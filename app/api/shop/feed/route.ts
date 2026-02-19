/**
 * Product Feed API
 * GET /api/shop/feed
 *
 * Returns structured JSON-LD product data for:
 * - Google Merchant Center
 * - AI marketplace crawlers (ChatGPT, Google AI)
 * - Shopping aggregators
 *
 * To get ahead: submit this feed URL to Google Merchant Center and to
 * OpenAI's product feed program when available. Feed is also exposed at
 * /.well-known/ai-product-feed for crawler discovery.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: products, error } = await supabase
      .from("spacebaddie_products")
      .select(
        "id, name, description, price, image_url, category, status, created_at, updated_at, inventory_count, sku"
      )
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const baseUrl = process.env.NEXT_PUBLIC_URL || "https://xom3.io";

    // Optional: aggregate ratings (when product_ratings table exists and has data)
    let ratingsByProductId: Record<string, { ratingValue: number; reviewCount: number }> = {};
    const { data: ratingRows, error: ratingsError } = await supabase
      .from("product_ratings")
      .select("product_id, rating");
    if (!ratingsError && ratingRows && ratingRows.length > 0) {
      const byProduct: Record<string, number[]> = {};
      for (const row of ratingRows) {
        if (!byProduct[row.product_id]) byProduct[row.product_id] = [];
        byProduct[row.product_id].push(row.rating);
      }
      for (const [pid, ratings] of Object.entries(byProduct)) {
        const sum = ratings.reduce((a, b) => a + b, 0);
        ratingsByProductId[pid] = {
          ratingValue: Math.round((sum / ratings.length) * 10) / 10,
          reviewCount: ratings.length,
        };
      }
    }

    const feed = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${baseUrl}/api/shop/feed#product-list`,
      name: "XOM3 Shop Products",
      description: "Digital products, AI tools, templates, courses, and services in the XOM3 AI-powered marketplace",
      url: `${baseUrl}/shop`,
      numberOfItems: products?.length || 0,
      itemListElement: (products || []).map((product, index) => {
        const category = (product.category || "General") as string;
        const isDigitalOrAI =
          category === "AI Tools" ||
          category === "Digital" ||
          category === "Templates" ||
          category === "Courses";
        const rating = ratingsByProductId[product.id];
        return {
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Product",
            "@id": `${baseUrl}/shop/${product.id}`,
            ...(isDigitalOrAI && {
              additionalType: [
                "https://schema.org/Product",
                category === "AI Tools"
                  ? "https://schema.org/SoftwareApplication"
                  : "https://schema.org/DigitalDocument",
              ],
            }),
            name: product.name,
            description: product.description || "",
            url: `${baseUrl}/shop/${product.id}`,
            image: product.image_url || `${baseUrl}/og-image.png`,
            sku: product.sku || product.id,
            category: category,
            ...(rating &&
              rating.reviewCount > 0 && {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: rating.ratingValue,
                  reviewCount: rating.reviewCount,
                  bestRating: 5,
                },
              }),
            brand: {
              "@type": "Brand",
              name: "XOM3",
            },
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "USD",
              availability:
                product.inventory_count === 0
                  ? "https://schema.org/OutOfStock"
                  : "https://schema.org/InStock",
              url: `${baseUrl}/shop/${product.id}`,
              seller: {
                "@type": "Organization",
                name: "XOM3",
              },
            },
          },
        };
      }),
    };

    return NextResponse.json(feed, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/ld+json",
      },
    });
  } catch (error: any) {
    console.error("[Product Feed] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate product feed" },
      { status: 500 }
    );
  }
}
