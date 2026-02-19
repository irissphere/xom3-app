/**
 * Commerce Product Research API
 * POST /api/commerce/research
 *
 * AI-powered market research using GPT-4o for real intelligence.
 * Modes: trends, product, niche, validate
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 2000
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
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[Research API] OpenAI error:", err);
    throw new Error("AI research failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw: string): any {
  const cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    switch (mode) {
      /* ────────────────────── TREND DISCOVERY ────────────────────── */
      case "trends": {
        const { niche, category } = body;
        if (!niche && !category) {
          return NextResponse.json(
            { ok: false, error: "Provide a niche or category" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an elite e-commerce trend analyst with deep knowledge of current market data as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.

Your job is to identify REAL, CURRENT trending products and predict near-future trends. You must:
- Name SPECIFIC products, brands, and niches (not generic categories)
- Reference REAL platforms where these trends are happening (TikTok, Amazon, Google Trends, Instagram, Shopify stores)
- Provide realistic price ranges based on actual market data
- Flag seasonal timing (when to enter, peak months, declining phases)
- Score each trend 0-100 for demand, competition, and margin potential

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "analysisDate": "YYYY-MM-DD",
  "niche": "the niche analyzed",
  "marketOverview": "2-3 sentence summary of the current state of this market",
  "trendingProducts": [
    {
      "name": "Specific product name",
      "description": "What it is and why it's trending",
      "platforms": ["TikTok", "Amazon"],
      "priceRange": { "low": 15, "high": 45 },
      "demandScore": 85,
      "competitionScore": 60,
      "marginScore": 70,
      "trendDirection": "rising",
      "seasonality": "Year-round with Q4 peak",
      "entryDifficulty": "low",
      "estimatedMonthlySales": "5,000-15,000 units across platforms",
      "whyTrending": "Specific reason with platform references"
    }
  ],
  "emergingTrends": [
    {
      "trend": "Trend name",
      "description": "What's emerging and why",
      "timeframe": "Expected to peak in X months",
      "confidence": 75,
      "suggestedProducts": ["Product 1", "Product 2"],
      "platforms": ["Where this trend is visible"]
    }
  ],
  "avoidList": [
    {
      "product": "Product to avoid",
      "reason": "Why - oversaturated, declining, legal issues, etc."
    }
  ],
  "actionSteps": ["Step 1", "Step 2", "Step 3"]
}

Include 5-8 trending products and 3-5 emerging trends. Be specific and actionable.`;

        const query = niche || category;
        const result = await callOpenAI(
          systemPrompt,
          `Analyze current trends and opportunities in: ${query}`,
          3000
        );

        try {
          const parsed = parseJSON(result);
          return NextResponse.json({ ok: true, data: parsed });
        } catch {
          return NextResponse.json({
            ok: true,
            data: { raw: result, parseError: true },
          });
        }
      }

      /* ────────────────────── PRODUCT RESEARCH ────────────────────── */
      case "product": {
        const { product, targetPrice } = body;
        if (!product) {
          return NextResponse.json(
            { ok: false, error: "Product name or idea is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are a senior e-commerce product analyst. Provide deep, actionable research on a specific product idea. Use real market knowledge as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.

You must provide SPECIFIC, REAL data:
- Name actual competitor stores and brands selling this product
- Reference real platforms and their fee structures
- Calculate realistic margins including all costs
- Provide genuine risk assessment

Return ONLY valid JSON (no markdown, no code fences):
{
  "product": "Product name",
  "researchDate": "YYYY-MM-DD",
  "verdict": "GO" | "CAUTION" | "AVOID",
  "overallScore": 75,
  "summary": "2-3 sentence executive summary",
  "marketAnalysis": {
    "estimatedMarketSize": "$X billion globally",
    "growthRate": "X% annually",
    "maturityStage": "growing" | "mature" | "declining" | "emerging",
    "targetDemographic": "Who buys this",
    "purchaseMotivation": "Why they buy",
    "averageOrderValue": 35.00
  },
  "competitorLandscape": [
    {
      "name": "Real store/brand name",
      "platform": "Shopify/Amazon/Etsy",
      "priceRange": "$X-$Y",
      "strengths": ["Strength 1"],
      "weaknesses": ["Weakness 1"],
      "estimatedMonthlySales": "X units",
      "reviewCount": 500,
      "averageRating": 4.3
    }
  ],
  "pricingStrategy": {
    "recommendedRetailPrice": 29.99,
    "estimatedCOGS": 8.00,
    "shippingCost": 3.50,
    "platformFees": 2.50,
    "adCostPerSale": 7.00,
    "netProfitPerUnit": 9.00,
    "profitMargin": "30%",
    "breakEvenROAS": 2.5,
    "minimumViablePrice": 22.00
  },
  "demandSignals": {
    "searchVolume": "Estimated monthly searches",
    "socialMentions": "Platform activity level",
    "trendDirection": "rising" | "stable" | "declining",
    "seasonalPattern": "Description of seasonal trends",
    "score": 78
  },
  "risks": [
    {
      "risk": "Risk description",
      "severity": "high" | "medium" | "low",
      "mitigation": "How to handle it"
    }
  ],
  "actionPlan": [
    {
      "step": 1,
      "action": "What to do",
      "details": "How to do it",
      "estimatedCost": "$X",
      "timeframe": "X days/weeks"
    }
  ],
  "supplierOptions": [
    {
      "platform": "AliExpress/CJDropshipping/etc",
      "estimatedCost": "$X-$Y per unit",
      "shippingTime": "X-Y days",
      "moq": "Minimum order quantity",
      "recommendation": "Brief recommendation"
    }
  ]
}`;

        const priceNote = targetPrice
          ? ` Target retail price: $${targetPrice}.`
          : "";
        const result = await callOpenAI(
          systemPrompt,
          `Deep research on this product: ${product}.${priceNote}`,
          3000
        );

        try {
          const parsed = parseJSON(result);
          return NextResponse.json({ ok: true, data: parsed });
        } catch {
          return NextResponse.json({
            ok: true,
            data: { raw: result, parseError: true },
          });
        }
      }

      /* ────────────────────── NICHE EXPLORER ────────────────────── */
      case "niche": {
        const { niche } = body;
        if (!niche) {
          return NextResponse.json(
            { ok: false, error: "Niche description is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an e-commerce niche strategist. Analyze a niche opportunity with real, specific data as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.

Return ONLY valid JSON (no markdown, no code fences):
{
  "niche": "Niche name",
  "analysisDate": "YYYY-MM-DD",
  "overallOpportunityScore": 72,
  "summary": "Executive summary of the niche opportunity",
  "marketMetrics": {
    "estimatedSize": "$X billion",
    "annualGrowth": "X%",
    "saturationLevel": "low" | "medium" | "high",
    "entryBarrier": "low" | "medium" | "high",
    "averageMargin": "X%"
  },
  "topProducts": [
    {
      "name": "Specific product",
      "priceRange": "$X-$Y",
      "demandLevel": "high" | "medium" | "low",
      "competitionLevel": "high" | "medium" | "low",
      "profitPotential": "high" | "medium" | "low",
      "bestPlatforms": ["Platform 1", "Platform 2"],
      "quickTip": "One actionable tip"
    }
  ],
  "targetAudience": {
    "demographics": "Who buys in this niche",
    "psychographics": "What motivates them",
    "spendingHabits": "How they shop",
    "platforms": "Where they discover products",
    "painPoints": ["Pain point 1", "Pain point 2"]
  },
  "competitorMap": [
    {
      "name": "Real brand/store",
      "size": "small" | "medium" | "large",
      "marketShare": "estimated %",
      "differentiator": "What makes them successful"
    }
  ],
  "entryStrategy": {
    "recommendedApproach": "Dropshipping/POD/Wholesale/etc",
    "startupBudget": "$X-$Y",
    "timeToFirstSale": "X weeks",
    "bestPlatform": "Where to sell first",
    "marketingStrategy": "How to acquire first customers",
    "differentiationIdeas": ["Idea 1", "Idea 2"]
  },
  "risks": ["Risk 1", "Risk 2"],
  "opportunities": ["Opportunity 1", "Opportunity 2"]
}

Include 5-8 top products. Be specific with real brands and realistic numbers.`;

        const result = await callOpenAI(
          systemPrompt,
          `Analyze this niche opportunity: ${niche}`,
          3000
        );

        try {
          const parsed = parseJSON(result);
          return NextResponse.json({ ok: true, data: parsed });
        } catch {
          return NextResponse.json({
            ok: true,
            data: { raw: result, parseError: true },
          });
        }
      }

      /* ────────────────────── PRODUCT VALIDATION ────────────────────── */
      case "validate": {
        const { product, price, category, source } = body;
        if (!product) {
          return NextResponse.json(
            { ok: false, error: "Product name is required" },
            { status: 400 }
          );
        }

        const systemPrompt = `You are an e-commerce product validation expert. Score a product idea across 5 dimensions and give a clear go/no-go recommendation. Use real market knowledge as of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.

Be honest and specific. If a product is a bad idea, say so clearly.

Return ONLY valid JSON (no markdown, no code fences):
{
  "product": "Product name",
  "validationDate": "YYYY-MM-DD",
  "recommendation": "STRONG BUY" | "BUY" | "HOLD" | "AVOID",
  "overallScore": 68,
  "scores": {
    "demand": { "score": 75, "reasoning": "Why this score" },
    "competition": { "score": 60, "reasoning": "Why this score - lower competition = higher score" },
    "marginPotential": { "score": 70, "reasoning": "Why this score" },
    "trendMomentum": { "score": 80, "reasoning": "Why this score" },
    "fulfillmentEase": { "score": 65, "reasoning": "Why this score" }
  },
  "strengths": ["Specific strength 1", "Specific strength 2"],
  "weaknesses": ["Specific weakness 1", "Specific weakness 2"],
  "estimatedNumbers": {
    "monthlySalesPotential": "X-Y units",
    "revenuePerMonth": "$X-$Y",
    "profitPerMonth": "$X-$Y",
    "startupCost": "$X-$Y",
    "timeToProfit": "X months"
  },
  "competitorCheck": {
    "topCompetitors": ["Brand 1", "Brand 2"],
    "priceRange": "$X-$Y",
    "marketGap": "What gap you could fill"
  },
  "nextSteps": [
    "Specific step 1",
    "Specific step 2",
    "Specific step 3"
  ],
  "alternativeProducts": [
    {
      "name": "Better alternative if this scores low",
      "whyBetter": "Reason"
    }
  ]
}`;

        const ctx = [
          `Product: ${product}`,
          price ? `Target price: $${price}` : "",
          category ? `Category: ${category}` : "",
          source ? `Source: ${source}` : "",
        ]
          .filter(Boolean)
          .join(". ");

        const result = await callOpenAI(
          systemPrompt,
          `Validate this product idea: ${ctx}`,
          2000
        );

        try {
          const parsed = parseJSON(result);
          return NextResponse.json({ ok: true, data: parsed });
        } catch {
          return NextResponse.json({
            ok: true,
            data: { raw: result, parseError: true },
          });
        }
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown mode: ${mode}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("[Research API] Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Research failed" },
      { status: 500 }
    );
  }
}
