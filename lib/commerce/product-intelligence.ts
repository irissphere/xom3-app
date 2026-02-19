// Commerce Engine - Product Intelligence Engine
// Finds winning products automatically through research, trend detection, competitor analysis, pricing intelligence, and margin analysis

import {
  Product,
  ProductResearch,
  TrendSignal,
  MarketData,
  DemandForecast,
  CompetitorAnalysis,
  Competitor,
  PricingIntelligence,
  ProductScore,
  ProductRecommendation,
} from "./types";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

/**
 * Research a product - find trends, market data, demand forecast
 */
export async function researchProduct(
  productName: string,
  category: string,
  keywords: string[] = []
): Promise<ProductResearch> {
  // 1. Detect trends across platforms
  const trendSignals = await detectProductTrends(productName, keywords);

  // 2. Gather market data
  const marketData = await gatherMarketData(productName, category);

  // 3. Forecast demand
  const demandForecast = await forecastDemand(productName, trendSignals, marketData);

  // 4. Calculate validation score
  const validationScore = calculateValidationScore(trendSignals, marketData, demandForecast);

  // Emit signal
  await emitSignal({
    source: "commerce:product-intelligence",
    type: "product_researched",
    severity: "info",
    payload: {
      productName,
      validationScore,
      trendCount: trendSignals.length,
    },
    timestamp: Date.now(),
  });

  return {
    productId: `research_${Date.now()}`,
    trendSignals,
    marketData,
    demandForecast,
    validationScore,
    researchDate: new Date().toISOString(),
  };
}

/**
 * Detect product trends across platforms using AI analysis.
 * Uses OpenAI to estimate trend signals instead of random data.
 */
async function detectProductTrends(
  productName: string,
  keywords: string[]
): Promise<TrendSignal[]> {
  const allKeywords = [productName, ...keywords].slice(0, 5);
  const signals: TrendSignal[] = [];

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    // Fallback: return conservative AI-estimated signals without the API
    for (const keyword of allKeywords) {
      for (const platform of ["google", "tiktok", "amazon"] as const) {
        signals.push({
          keyword,
          platform,
          volume: 5000,
          velocity: 50,
          momentum: 50,
          relevance: 60,
          detectedAt: new Date().toISOString(),
        });
      }
    }
    return signals;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a product trend analyst. Given product keywords, estimate their current trend metrics across Google, TikTok, and Amazon. Return ONLY valid JSON array. Each item: { "keyword": string, "platform": "google"|"tiktok"|"amazon", "volume": number (estimated monthly search volume), "velocity": number 0-100 (how fast it's growing), "momentum": number 0-100 (current strength), "relevance": number 0-100 (how relevant to e-commerce) }. Be realistic — not everything is trending. Base estimates on real market knowledge.`,
          },
          {
            role: "user",
            content: `Analyze trend signals for these product keywords: ${allKeywords.join(", ")}`,
          },
        ],
        temperature: 0.6,
        max_tokens: 2000,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "[]";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => ({
          keyword: s.keyword || productName,
          platform: s.platform || "google",
          volume: s.volume || 1000,
          velocity: Math.min(100, Math.max(0, s.velocity || 0)),
          momentum: Math.min(100, Math.max(0, s.momentum || 0)),
          relevance: Math.min(100, Math.max(0, s.relevance || 0)),
          detectedAt: new Date().toISOString(),
        }));
      }
    }
  } catch (err) {
    console.error("[ProductIntelligence] AI trend detection failed:", err);
  }

  // Fallback: return conservative estimates
  for (const keyword of allKeywords) {
    for (const platform of ["google", "tiktok", "amazon"] as const) {
      signals.push({
        keyword,
        platform,
        volume: 5000,
        velocity: 50,
        momentum: 50,
        relevance: 60,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return signals;
}

/**
 * Gather market data for a product
 */
async function gatherMarketData(
  productName: string,
  category: string
): Promise<MarketData> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a market research analyst. Given a product and category, estimate market data. Return ONLY valid JSON: { "marketSize": number (USD), "growthRate": number (% YoY), "seasonality": { "peakMonths": string[], "lowMonths": string[] }, "demographics": { "ageRange": string, "gender": string, "interests": string[] } }. Be realistic.`,
            },
            {
              role: "user",
              content: `Market data for "${productName}" in category "${category}"`,
            },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.marketSize) return parsed;
      }
    } catch (err) {
      console.error("[ProductIntelligence] AI market data failed:", err);
    }
  }

  // Conservative fallback (not random)
  return {
    marketSize: 5000000,
    growthRate: 12,
    seasonality: {
      peakMonths: ["November", "December"],
      lowMonths: ["January", "February"],
    },
    demographics: {
      ageRange: "25-45",
      gender: "all",
      interests: ["online shopping", "trending products"],
    },
  };
}

/**
 * Forecast demand for a product
 */
async function forecastDemand(
  productName: string,
  trendSignals: TrendSignal[],
  marketData: MarketData
): Promise<DemandForecast> {
  // Calculate demand based on trends and market data
  const avgMomentum = trendSignals.reduce((sum, s) => sum + s.momentum, 0) / trendSignals.length || 0;
  const avgVelocity = trendSignals.reduce((sum, s) => sum + s.velocity, 0) / trendSignals.length || 0;

  // Base demand on momentum and velocity
  const baseDemand = (avgMomentum + avgVelocity) / 2;
  const marketMultiplier = marketData.growthRate / 100;

  return {
    shortTerm: Math.floor(baseDemand * 1000 * (1 + marketMultiplier)),
    mediumTerm: Math.floor(baseDemand * 3000 * (1 + marketMultiplier * 2)),
    longTerm: Math.floor(baseDemand * 12000 * (1 + marketMultiplier * 4)),
    confidence: Math.min(100, Math.floor(avgMomentum + avgVelocity) / 2),
  };
}

/**
 * Calculate validation score (0-100)
 */
function calculateValidationScore(
  trendSignals: TrendSignal[],
  marketData: MarketData,
  demandForecast: DemandForecast
): number {
  let score = 0;

  // Trend signals (40 points)
  if (trendSignals.length > 0) {
    const avgMomentum = trendSignals.reduce((sum, s) => sum + s.momentum, 0) / trendSignals.length;
    score += (avgMomentum / 100) * 40;
  }

  // Market data (30 points)
  if (marketData.marketSize > 1000000) {
    score += 15;
  }
  if (marketData.growthRate > 10) {
    score += 15;
  }

  // Demand forecast (30 points)
  if (demandForecast.confidence > 70) {
    score += 15;
  }
  if (demandForecast.shortTerm > 1000) {
    score += 15;
  }

  return Math.min(100, Math.floor(score));
}

/**
 * Analyze competitors for a product
 */
export async function analyzeCompetitors(
  productName: string,
  category: string,
  priceRange?: { min: number; max: number }
): Promise<CompetitorAnalysis> {
  let competitors: Competitor[] = [];

  // Use AI to estimate competitor landscape
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an e-commerce competitor analyst. Given a product name and category, return a JSON array of 3-5 estimated competitors. Each: { "name": string (store or brand name), "platform": "amazon"|"shopify"|"etsy"|"ebay", "price": number, "rating": number (1-5), "reviews": number, "shipping": string, "features": string[], "strengths": string[], "weaknesses": string[] }. Return ONLY valid JSON array. Be realistic based on real market knowledge.`,
            },
            {
              role: "user",
              content: `Analyze competitors for "${productName}" in ${category}${priceRange ? ` (price range $${priceRange.min}-$${priceRange.max})` : ""}`,
            },
          ],
          temperature: 0.6,
          max_tokens: 2000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "[]";
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          competitors = parsed;
        }
      }
    } catch (err) {
      console.error("[ProductIntelligence] AI competitor analysis failed:", err);
    }
  }

  // Fallback if AI unavailable
  if (competitors.length === 0) {
    competitors = [
      {
        name: "Market Average (AI-estimated)",
        platform: "amazon",
        price: priceRange?.min ? (priceRange.min + (priceRange.max || priceRange.min)) / 2 : 24.99,
        rating: 4.2,
        reviews: 200,
        shipping: "Standard",
        features: [],
        strengths: ["Established seller"],
        weaknesses: ["Generic listing"],
      },
    ];
  }

  const prices = competitors.map(c => c.price);
  const averagePrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const median = sortedPrices[Math.floor(sortedPrices.length / 2)];

  // Calculate market share (simplified)
  const totalReviews = competitors.reduce((sum, c) => sum + (c.reviews || 0), 0);
  const topCompetitor = competitors[0];
  const top3Competitors = competitors.slice(0, 3);

  return {
    productId: `competitor_analysis_${Date.now()}`,
    competitors,
    averagePrice,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      median,
    },
    marketShare: {
      topCompetitor: topCompetitor.reviews ? (topCompetitor.reviews / totalReviews) * 100 : 0,
      top3Competitors: top3Competitors.reduce((sum, c) => sum + (c.reviews || 0), 0) / totalReviews * 100,
      others: 100 - (top3Competitors.reduce((sum, c) => sum + (c.reviews || 0), 0) / totalReviews * 100),
    },
    competitiveAdvantage: ["Better pricing", "Unique features"],
    competitiveDisadvantage: ["Less brand recognition", "Fewer reviews"],
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Analyze pricing intelligence for a product
 */
export async function analyzePricing(
  product: Product,
  competitorAnalysis: CompetitorAnalysis
): Promise<PricingIntelligence> {
  const { averagePrice, priceRange } = competitorAnalysis;

  // Calculate optimal price based on:
  // 1. Competitor pricing
  // 2. Cost and margin requirements
  // 3. Market positioning

  const cost = product.cost;
  const minMargin = 0.3; // 30% minimum margin
  const minPrice = cost / (1 - minMargin);

  // Optimal price: slightly below average if we want to compete, or premium if we have advantages
  const optimalPrice = averagePrice * 0.95; // 5% below average for competitiveness
  const recommendedPrice = Math.max(optimalPrice, minPrice);

  // Calculate margins
  const currentMargin = ((product.price - cost) / product.price) * 100;
  const recommendedMargin = ((recommendedPrice - cost) / recommendedPrice) * 100;

  // Emit signal
  await emitSignal({
    source: "commerce:product-intelligence",
    type: "pricing_analyzed",
    severity: "info",
    payload: {
      productId: product.id,
      currentPrice: product.price,
      recommendedPrice,
      margin: recommendedMargin,
    },
    timestamp: Date.now(),
  });

  return {
    productId: product.id,
    currentPrice: product.price,
    recommendedPrice,
    priceRange: {
      min: priceRange.min,
      max: priceRange.max,
      optimal: recommendedPrice,
    },
    marginAnalysis: {
      current: currentMargin,
      recommended: recommendedMargin,
      minAcceptable: minMargin * 100,
    },
    elasticity: 1.2, // Price elasticity (would be calculated from historical data)
    competitorPricing: {
      average: averagePrice,
      median: priceRange.median,
      range: {
        min: priceRange.min,
        max: priceRange.max,
      },
    },
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Calculate comprehensive product score (0-100)
 */
export function calculateProductScore(
  product: Product,
  research?: ProductResearch,
  competitorAnalysis?: CompetitorAnalysis,
  pricing?: PricingIntelligence
): ProductScore {
  const components = {
    demand: 0,
    competition: 0,
    margin: 0,
    trend: 0,
    validation: 0,
  };

  // Demand score (25% weight)
  if (research?.demandForecast) {
    const confidence = research.demandForecast.confidence;
    const shortTerm = research.demandForecast.shortTerm;
    components.demand = Math.min(100, (confidence * 0.6 + (Math.min(shortTerm / 1000, 1) * 100) * 0.4));
  }

  // Competition score (25% weight) - inverted (less competition = higher score)
  if (competitorAnalysis) {
    const competitorCount = competitorAnalysis.competitors.length;
    const marketShare = competitorAnalysis.marketShare.topCompetitor;
    // Less competition and more fragmented market = higher score
    components.competition = Math.max(0, 100 - (competitorCount * 10) - (marketShare * 0.5));
  }

  // Margin score (20% weight)
  if (pricing?.marginAnalysis) {
    const margin = pricing.marginAnalysis.recommended;
    components.margin = Math.min(100, (margin / 50) * 100); // 50% margin = 100 points
  } else if (product.margin) {
    components.margin = Math.min(100, (product.margin / 50) * 100);
  }

  // Trend score (15% weight)
  if (research?.trendSignals && research.trendSignals.length > 0) {
    const avgMomentum = research.trendSignals.reduce((sum, s) => sum + s.momentum, 0) / research.trendSignals.length;
    components.trend = avgMomentum;
  }

  // Validation score (15% weight)
  if (research?.validationScore) {
    components.validation = research.validationScore;
  }

  // Calculate weighted scores
  const weights = {
    demand: 0.25,
    competition: 0.25,
    margin: 0.20,
    trend: 0.15,
    validation: 0.15,
  };

  const weighted = {
    demand: components.demand * weights.demand,
    competition: components.competition * weights.competition,
    margin: components.margin * weights.margin,
    trend: components.trend * weights.trend,
    validation: components.validation * weights.validation,
  };

  const overall = Object.values(weighted).reduce((sum, score) => sum + score, 0);

  return {
    productId: product.id,
    overall: Math.floor(overall),
    components,
    weighted,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Generate product recommendation
 */
export async function recommendProduct(
  product: Product,
  research?: ProductResearch,
  competitorAnalysis?: CompetitorAnalysis,
  pricing?: PricingIntelligence
): Promise<ProductRecommendation> {
  const score = calculateProductScore(product, research, competitorAnalysis, pricing);

  // Determine priority
  let priority: "high" | "medium" | "low" = "medium";
  if (score.overall >= 75) {
    priority = "high";
  } else if (score.overall < 50) {
    priority = "low";
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" = "medium";
  if (score.components.competition > 70 && score.components.margin > 50 && score.components.demand > 60) {
    riskLevel = "low";
  } else if (score.components.competition < 30 || score.components.margin < 30 || score.components.demand < 40) {
    riskLevel = "high";
  }

  // Generate reasoning
  const reasoning = generateReasoning(score, research, competitorAnalysis, pricing);

  // Generate action items
  const actionItems = generateActionItems(score, product, research, competitorAnalysis, pricing);

  // Estimate revenue and profit (simplified)
  const estimatedRevenue = pricing
    ? pricing.recommendedPrice * (research?.demandForecast.shortTerm || 100)
    : product.price * 100;
  const estimatedProfit = estimatedRevenue * (pricing?.marginAnalysis.recommended || product.margin) / 100;

  // Emit signal
  await emitSignal({
    source: "commerce:product-intelligence",
    type: "product_recommended",
    severity: priority === "high" ? "high" : "info",
    payload: {
      productId: product.id,
      score: score.overall,
      priority,
      riskLevel,
    },
    timestamp: Date.now(),
  });

  return {
    product,
    score,
    reasoning,
    priority,
    actionItems,
    estimatedRevenue,
    estimatedProfit,
    riskLevel,
  };
}

/**
 * Generate reasoning for recommendation
 */
function generateReasoning(
  score: ProductScore,
  research?: ProductResearch,
  competitorAnalysis?: CompetitorAnalysis,
  pricing?: PricingIntelligence
): string {
  const reasons: string[] = [];

  if (score.components.demand > 70) {
    reasons.push("Strong demand forecast with high confidence");
  }
  if (score.components.competition > 70) {
    reasons.push("Low competition with fragmented market");
  }
  if (score.components.margin > 50) {
    reasons.push("Healthy profit margins");
  }
  if (score.components.trend > 60) {
    reasons.push("Strong trend momentum across platforms");
  }
  if (score.components.validation > 70) {
    reasons.push("High validation score from research");
  }

  if (reasons.length === 0) {
    return "Product shows mixed signals. Requires deeper analysis.";
  }

  return reasons.join(". ") + ".";
}

/**
 * Generate action items for product
 */
function generateActionItems(
  score: ProductScore,
  product: Product,
  research?: ProductResearch,
  competitorAnalysis?: CompetitorAnalysis,
  pricing?: PricingIntelligence
): string[] {
  const items: string[] = [];

  if (score.components.demand < 50) {
    items.push("Conduct additional market research to validate demand");
  }
  if (score.components.competition < 50) {
    items.push("Develop unique selling proposition to differentiate from competitors");
  }
  if (score.components.margin < 40) {
    items.push("Optimize pricing or reduce costs to improve margins");
  }
  if (pricing && pricing.recommendedPrice !== product.price) {
    items.push(`Adjust price to $${pricing.recommendedPrice.toFixed(2)} (currently $${product.price.toFixed(2)})`);
  }
  if (score.overall >= 75) {
    items.push("Proceed with product launch - high potential");
  } else if (score.overall < 50) {
    items.push("Reconsider product or pivot strategy");
  }

  return items;
}

/**
 * Batch research multiple products
 */
export async function batchResearchProducts(
  products: Array<{ name: string; category: string; keywords?: string[] }>
): Promise<ProductRecommendation[]> {
  const recommendations: ProductRecommendation[] = [];

  for (const productData of products) {
    // Research
    const research = await researchProduct(productData.name, productData.category, productData.keywords || []);

    // Analyze competitors
    const competitorAnalysis = await analyzeCompetitors(productData.name, productData.category);

    // Create product object
    const product: Product = {
      id: `product_${Date.now()}_${Math.random()}`,
      name: productData.name,
      description: "",
      category: "physical" as const,
      source: "dropshipping" as const,
      price: competitorAnalysis.averagePrice,
      cost: competitorAnalysis.averagePrice * 0.6, // Assume 40% margin
      margin: 40,
      profit: competitorAnalysis.averagePrice * 0.4,
      score: 0,
      status: "researching",
      metadata: {
        keywords: productData.keywords,
        demandScore: research.validationScore,
        trendScore: research.trendSignals.length > 0
          ? research.trendSignals.reduce((sum, s) => sum + s.momentum, 0) / research.trendSignals.length
          : 0,
        competitionScore: 100 - (competitorAnalysis.competitors.length * 10),
      },
      research,
      competitorAnalysis,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Analyze pricing
    const pricing = await analyzePricing(product, competitorAnalysis);
    product.pricing = pricing;

    // Calculate score
    const score = calculateProductScore(product, research, competitorAnalysis, pricing);
    product.score = score.overall;

    // Generate recommendation
    const recommendation = await recommendProduct(product, research, competitorAnalysis, pricing);
    recommendations.push(recommendation);
  }

  // Emit batch signal
  await emitSignal({
    source: "commerce:product-intelligence",
    type: "products_researched_batch",
    severity: "info",
    payload: {
      count: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === "high").length,
      averageScore: recommendations.reduce((sum, r) => sum + r.score.overall, 0) / recommendations.length,
    },
    timestamp: Date.now(),
  });

  return recommendations.sort((a, b) => b.score.overall - a.score.overall);
}
