/**
 * Commerce AI Assistant API
 * POST /api/commerce/ai-assist
 *
 * Supports three modes:
 * - type: "product" - Generate product details from a brief idea
 * - type: "description" - Improve/generate a product description
 * - type: "advice" - Answer commerce questions
 */

import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES_FOR_PROMPT } from "@/lib/commerce/categories";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Fetch a product image using multiple fallback strategies.
 * Priority: Pexels API > Pixabay API > picsum.photos (guaranteed)
 */
async function fetchProductImage(searchTerm: string): Promise<string | null> {
  const query = searchTerm.trim();
  if (!query) return null;

  // Strategy 1: Pexels API (best quality, needs free key)
  const pexelsKey = process.env.PEXELS_API_KEY;
  if (pexelsKey) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
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

  // Strategy 2: Pixabay API (free, key goes in URL)
  const pixabayKey = process.env.PIXABAY_API_KEY;
  if (pixabayKey) {
    try {
      const res = await fetch(
        `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&safesearch=true`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.hits?.[0]?.webformatURL) {
          return data.hits[0].webformatURL;
        }
      }
    } catch {}
  }

  // Strategy 3: picsum.photos (always works, deterministic by seed)
  // Creates a consistent, nice-looking placeholder for each product
  const seed = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  return `https://picsum.photos/seed/${seed}/400/400`;
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
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
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[AI Assist] OpenAI error:", err);
    throw new Error("AI generation failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    switch (type) {
      case "product_ideas": {
        const { prompt } = body;
        if (!prompt) {
          return NextResponse.json(
            { ok: false, error: "Product idea is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an elite e-commerce product strategist and market analyst. Given a product niche or idea, generate exactly 4 unique product suggestions ranked by business potential.

Return ONLY valid JSON (no markdown, no code fences) as an array of 4 objects:
[
  {
    "name": "Catchy product name",
    "description": "Compelling 2-3 sentence description focused on customer transformation and benefits. Use psychology-driven copy.",
    "category": "One of: ${CATEGORIES_FOR_PROMPT}. Use 'AI Tools' when the product is clearly AI-related.",
    "price": 29.99,
    "sale_price": 19.99,
    "estimated_margin": 65,
    "trending_score": 8,
    "trending_reason": "Brief reason why this is trending (e.g. 'TikTok viral in health niche, 300% search increase')",
    "shelf_life": "evergreen or seasonal",
    "shelf_life_detail": "Brief detail (e.g. 'Year-round demand, peaks in January')",
    "selling_route": "One of: digital-download, dropshipping, print-on-demand, subscription, service, course",
    "selling_route_detail": "Brief explanation of why this route is best",
    "recommendation_tag": "One of: Best Overall, Highest Margin, Most Trending, Quick Win, Evergreen Pick",
    "competitive_edge": "Brief 1-sentence competitive advantage",
    "image_search_term": "2-3 word search term for finding a stock photo of this product (e.g. 'scented candle', 'fitness ebook', 'gold necklace')",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

IMPORTANT RULES:
- The first product should be tagged "Best Overall" - your top recommendation
- Include variety: mix of price points, selling routes, and risk levels
- Prices must be realistic for the market
- Margins should account for typical costs (digital products: 80-95%, dropship: 20-40%, POD: 30-50%)
- Trending scores 1-10 based on current market demand
- Be specific and actionable, not generic`;

        const result = await callOpenAI(
          systemPrompt,
          `Product niche/idea: ${prompt}`
        );

        try {
          const cleaned = result
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          const ideas = Array.isArray(parsed) ? parsed : [parsed];

          // Fetch real product images from Unsplash
          const ideasWithImages = await Promise.all(
            ideas.map(async (idea: any) => {
              try {
                const searchTerm = idea.image_search_term || idea.name || prompt;
                const img = await fetchProductImage(searchTerm);
                return { ...idea, image_url: img };
              } catch {
                return { ...idea, image_url: null };
              }
            })
          );

          return NextResponse.json({ ok: true, ideas: ideasWithImages });
        } catch {
          return NextResponse.json({
            ok: false,
            error: "Failed to parse AI suggestions. Please try again.",
          }, { status: 500 });
        }
      }

      case "product": {
        const { prompt } = body;
        if (!prompt) {
          return NextResponse.json(
            { ok: false, error: "Product idea is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an e-commerce product expert. Given a brief product idea, generate complete product details.
Return ONLY valid JSON (no markdown, no code fences) with these fields:
{
  "name": "Product name (concise, catchy)",
  "description": "Compelling product description (2-3 sentences, highlight benefits)",
  "category": "One of: ${CATEGORIES_FOR_PROMPT}. Use 'AI Tools' when the product is clearly AI-related.",
  "price": 29.99,
  "image_search_term": "2-3 word search term for a stock photo (e.g. 'scented candle', 'fitness ebook')",
  "tags": ["tag1", "tag2", "tag3"]
}
The price should be realistic for the product type. Description should be persuasive and customer-focused.`;

        const result = await callOpenAI(
          systemPrompt,
          `Product idea: ${prompt}`
        );

        try {
          const cleaned = result
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);

          // Fetch a real product image
          try {
            const searchTerm = parsed.image_search_term || parsed.name || prompt;
            parsed.image_url = await fetchProductImage(searchTerm);
          } catch {
            parsed.image_url = null;
          }

          return NextResponse.json({ ok: true, product: parsed });
        } catch {
          return NextResponse.json({
            ok: true,
            product: {
              name: prompt,
              description: result,
              category: "Other",
              price: 0,
              image_url: null,
            },
          });
        }
      }

      case "description": {
        const { name, category, currentDescription } = body;
        if (!name) {
          return NextResponse.json(
            { ok: false, error: "Product name is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an expert copywriter specializing in e-commerce product descriptions.
Write a compelling, benefit-focused product description that drives purchases.
Keep it 2-4 sentences. Use persuasive language. Highlight value to the customer.
Return ONLY the description text, no JSON, no quotes, no formatting.`;

        const userMsg = currentDescription
          ? `Improve this product description for "${name}" (category: ${category || "General"}):\n\n"${currentDescription}"`
          : `Write a product description for "${name}" (category: ${category || "General"})`;

        const result = await callOpenAI(systemPrompt, userMsg);
        return NextResponse.json({ ok: true, description: result.trim() });
      }

      case "advice": {
        const { question } = body;
        if (!question) {
          return NextResponse.json(
            { ok: false, error: "Question is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are a friendly e-commerce advisor helping small business owners set up their first online store.
Give practical, actionable advice. Keep responses concise (2-4 paragraphs max).
Focus on beginner-friendly guidance. Mention specific steps they can take.
If relevant, suggest they use features available in the XOM3 commerce platform (product management, Stripe payments, order tracking).`;

        const result = await callOpenAI(systemPrompt, question);
        return NextResponse.json({ ok: true, advice: result.trim() });
      }

      case "trend_scan": {
        const { niche } = body;
        if (!niche) {
          return NextResponse.json(
            { ok: false, error: "Niche is required for trend scanning" },
            { status: 400 }
          );
        }

        // Proxy to the dedicated trend research API
        const trendUrl = new URL("/api/commerce/trend-research", req.url);
        const trendRes = await fetch(trendUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ niche, mode: "quick" }),
        });
        const trendData = await trendRes.json();
        return NextResponse.json(trendData);
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown type: ${type}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[AI Assist] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "AI assist failed" },
      { status: 500 }
    );
  }
}
