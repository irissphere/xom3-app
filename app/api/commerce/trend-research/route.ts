/**
 * Commerce Trend Research API
 * POST /api/commerce/trend-research
 *
 * AI-powered product trend analysis combining:
 * - Current market intelligence
 * - Social media trends (TikTok, Instagram)
 * - Marketplace data (Amazon, AliExpress)
 * - Margin and competition analysis
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[Trend Research] OpenAI error:", err);
    throw new Error("AI analysis failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function fetchProductImage(searchTerm: string): Promise<string | null> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey && searchTerm) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=square`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.photos?.[0]?.src?.medium) {
          return data.photos[0].src.medium;
        }
      }
    } catch {}
  }
  const seed = searchTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `https://picsum.photos/seed/${seed}/400/400`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { niche, mode } = body;

    if (!niche) {
      return NextResponse.json(
        { ok: false, error: "Niche or category is required" },
        { status: 400 }
      );
    }

    const today = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (mode === "deep_dive") {
      // Deep dive into a specific product/niche
      const systemPrompt = `You are an elite e-commerce product analyst with real-time market intelligence. Today is ${today}.

Given a specific product or niche, provide a comprehensive deep-dive analysis.

Return ONLY valid JSON (no markdown, no code fences):
{
  "niche": "Niche name",
  "market_size": "Estimated market size (e.g. '$2.4B global market')",
  "growth_rate": "Year-over-year growth (e.g. '23% YoY')",
  "competition_level": "low, medium, or high",
  "entry_barrier": "low, medium, or high",
  "best_platforms": ["Platform 1", "Platform 2"],
  "top_products": [
    {
      "name": "Product name",
      "description": "Why this product works",
      "price_range": "$15-$35",
      "supplier_cost": "$3-$8",
      "estimated_margin": 70,
      "selling_route": "dropshipping or print-on-demand or digital",
      "trend_velocity": "rising, stable, or declining",
      "competition": "low, medium, or high",
      "social_proof": "Explanation of social media traction",
      "image_search_term": "2-3 word image search term",
      "supplier_search": "What to search on AliExpress/CJ Dropshipping",
      "target_audience": "Who buys this",
      "marketing_angle": "Best marketing approach",
      "risk_level": "low, medium, or high"
    }
  ],
  "content_strategy": "How to market products in this niche on TikTok/Instagram",
  "seasonal_notes": "Any seasonal patterns to be aware of",
  "beginner_tip": "Actionable tip for someone new to this niche"
}

Provide 5-8 products. Be specific with real product types that are actually trending, not generic suggestions. Include realistic pricing and margins.`;

      const result = await callOpenAI(systemPrompt, `Deep dive into: ${niche}`);
      try {
        const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // Fetch images for top products
        if (parsed.top_products) {
          parsed.top_products = await Promise.all(
            parsed.top_products.map(async (p: any) => {
              const img = await fetchProductImage(p.image_search_term || p.name);
              return { ...p, image_url: img };
            })
          );
        }

        return NextResponse.json({ ok: true, analysis: parsed });
      } catch {
        return NextResponse.json(
          { ok: false, error: "Failed to parse trend analysis" },
          { status: 500 }
        );
      }
    }

    // Default mode: quick trend scan
    const systemPrompt = `You are an elite e-commerce trend researcher with real-time intelligence across TikTok Shop, Amazon, AliExpress, and social media. Today is ${today}.

Analyze the current market for the given niche/category and return trending products that a new seller could start selling TODAY with minimal investment.

Return ONLY valid JSON (no markdown, no code fences):
{
  "niche": "Analyzed niche",
  "trend_summary": "2-3 sentence overview of current market trends",
  "hot_products": [
    {
      "rank": 1,
      "name": "Specific product name",
      "description": "Why this product is hot right now",
      "category": "AI Tools, Digital, Templates, Courses, Services, Software, Electronics, Fashion, Beauty, Health & Wellness, Home & Garden, Kitchen, Pet Supplies, Fitness, Toys & Games, Baby & Kids, Automotive, Jewelry & Accessories, Outdoor & Sports, Office, Other",
      "price": 29.99,
      "cost": 8.50,
      "margin_pct": 72,
      "selling_route": "dropshipping, print-on-demand, digital, or wholesale",
      "selling_route_detail": "Why this route works best",
      "trend_score": 9,
      "trend_source": "Where this is trending (e.g. 'TikTok #GlowUp, 2.3M views this week')",
      "competition": "low, medium, or high",
      "difficulty": "beginner, intermediate, or advanced",
      "time_to_first_sale": "Estimated time (e.g. '2-5 days')",
      "startup_cost": "$0-$50",
      "image_search_term": "2-3 word search term for product photo",
      "supplier_search": "What to search on CJ Dropshipping or AliExpress to find this exact product (2-5 keywords)",
      "quick_tip": "One actionable tip to succeed with this product"
    }
  ],
  "emerging_niches": [
    {
      "name": "Niche name",
      "why": "Why this is emerging",
      "opportunity_score": 8
    }
  ],
  "avoid": ["Product/niche to avoid and why"]
}

RULES:
- Return exactly 6-8 hot products, ranked by opportunity (best first)
- First 2 products should be BEGINNER-FRIENDLY (low cost, low risk)
- Include at least 1 digital product option ($0 startup)
- Be specific: real product types trending NOW, not generic categories
- Margins must be realistic
- Consider shipping times and customer expectations
- For physical products, the supplier_search field MUST contain keywords that would find this exact product on CJ Dropshipping or AliExpress (e.g. "LED sunset lamp", "portable neck fan", "silicone kitchen utensil set")
- Prefer products that are commonly available on dropshipping suppliers like CJ Dropshipping`;

    const result = await callOpenAI(systemPrompt, `Find trending products for: ${niche}`);

    try {
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Fetch images for products
      if (parsed.hot_products) {
        parsed.hot_products = await Promise.all(
          parsed.hot_products.map(async (p: any) => {
            const img = await fetchProductImage(p.image_search_term || p.name);
            return { ...p, image_url: img };
          })
        );
      }

      return NextResponse.json({ ok: true, trends: parsed });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Failed to parse trend data. Try again." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Trend Research] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Trend research failed" },
      { status: 500 }
    );
  }
}
