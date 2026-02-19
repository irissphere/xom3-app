/**
 * AI Product Listing Optimizer
 * POST /api/commerce/ai-optimize
 * 
 * Auto-enhances product listings to be best-in-class:
 * - Rewrites titles for maximum click-through
 * - Generates compelling descriptions with power words
 * - Creates SEO-optimized metadata
 * - Suggests pricing strategies
 * - Generates tags and keywords
 * 
 * Modes: "optimize_listing" | "generate_seo" | "pricing_advice" | "bulk_optimize"
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json({ ok: false, error: 'OpenAI not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { mode, product, products } = body;

    switch (mode) {
      case 'optimize_listing': {
        if (!product?.name) {
          return NextResponse.json({ ok: false, error: 'Product name required' }, { status: 400 });
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an elite e-commerce copywriter and conversion optimization expert. Your listings consistently outperform competitors by 3-5x.

Rules:
- Write in a premium but approachable tone
- Use power words that trigger emotion and urgency
- Include specific benefits, not just features
- Structure descriptions with bullet points for scannability
- Never use generic phrases like "high quality" - be specific
- Optimize for mobile reading (short paragraphs)
- Include a compelling hook in the first line

Return JSON only, no markdown.`,
            },
            {
              role: 'user',
              content: `Optimize this product listing for maximum conversions:

Product Name: ${product.name}
Current Description: ${product.description || 'None'}
Category: ${product.category || 'General'}
Price: $${product.price || 'Not set'}

Return this exact JSON structure:
{
  "optimized_name": "Power-word optimized title (max 80 chars)",
  "optimized_description": "Compelling multi-paragraph description with bullet points using \\n for newlines",
  "short_description": "One-liner for product cards (max 120 chars)",
  "key_benefits": ["benefit1", "benefit2", "benefit3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seo_title": "SEO optimized page title (max 60 chars)",
  "seo_description": "Meta description for search engines (max 155 chars)",
  "conversion_tips": ["tip1", "tip2", "tip3"]
}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 1200,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return NextResponse.json({ ok: true, optimization: result });
      }

      case 'generate_seo': {
        if (!product?.name) {
          return NextResponse.json({ ok: false, error: 'Product name required' }, { status: 400 });
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an SEO expert for e-commerce. Generate highly optimized SEO metadata that ranks. Return JSON only.`,
            },
            {
              role: 'user',
              content: `Generate SEO metadata for:
Name: ${product.name}
Description: ${product.description || 'None'}
Category: ${product.category || 'General'}

Return:
{
  "seo_title": "max 60 chars, keyword-rich",
  "meta_description": "max 155 chars, includes CTA",
  "keywords": ["keyword1", "keyword2", ...],
  "og_title": "for social sharing",
  "og_description": "for social sharing",
  "schema_type": "Product schema type suggestion",
  "url_slug": "seo-friendly-url-slug"
}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.5,
          max_tokens: 600,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return NextResponse.json({ ok: true, seo: result });
      }

      case 'pricing_advice': {
        if (!product?.name) {
          return NextResponse.json({ ok: false, error: 'Product name required' }, { status: 400 });
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a pricing psychology expert for e-commerce. You understand charm pricing, anchoring, bundling, and value perception. Return JSON only.`,
            },
            {
              role: 'user',
              content: `Analyze pricing strategy for:
Name: ${product.name}
Current Price: $${product.price || 'Not set'}
Category: ${product.category || 'General'}
Description: ${product.description || 'None'}

Return:
{
  "recommended_price": 29.99,
  "price_range": { "low": 19.99, "high": 49.99 },
  "pricing_strategy": "Explanation of recommended pricing approach",
  "psychological_tips": ["tip1", "tip2", "tip3"],
  "bundle_suggestions": ["Bundle idea 1", "Bundle idea 2"],
  "upsell_price": 49.99,
  "upsell_idea": "What to include in a premium version"
}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 800,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return NextResponse.json({ ok: true, pricing: result });
      }

      case 'bulk_optimize': {
        if (!products || !Array.isArray(products) || products.length === 0) {
          return NextResponse.json({ ok: false, error: 'Products array required' }, { status: 400 });
        }

        const productsList = products.slice(0, 5).map((p: any, i: number) =>
          `${i + 1}. "${p.name}" - ${p.category || 'General'} - $${p.price || '?'}`
        ).join('\n');

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an e-commerce optimization expert. Analyze a batch of product listings and provide quick optimization tips for each. Return JSON only.`,
            },
            {
              role: 'user',
              content: `Optimize these listings:
${productsList}

Return:
{
  "optimizations": [
    {
      "original_name": "name",
      "optimized_name": "better name",
      "short_description": "compelling one-liner",
      "priority_fix": "most important improvement needed"
    }
  ],
  "store_wide_tips": ["tip1", "tip2", "tip3"]
}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 1500,
        });

        const result = JSON.parse(response.choices[0]?.message?.content || '{}');
        return NextResponse.json({ ok: true, bulk: result });
      }

      default:
        return NextResponse.json(
          { ok: false, error: 'Invalid mode. Use: optimize_listing, generate_seo, pricing_advice, bulk_optimize' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[AI Optimize] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'AI optimization failed' },
      { status: 500 }
    );
  }
}
