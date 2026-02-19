// Broadcast Engine - Trend Engine (The Adaptive Core)
// Watches the world, detects what's rising, and adjusts the entire Broadcast Engine automatically

import { Platform, BroadcastPost } from "./types";
import { TrendSignal, PlatformTrends, CrossPlatformSignal, detectAllTrends, calculateVelocity, classifyTrend } from "./trend-detection";
import { emitSignal } from "@/lib/uoi/signals";
import { emitStateUpdate } from "@/lib/hse/signals";

export type TrendCategory = 
  | "breakout"    // Exploding fast, short-lived, high opportunity
  | "sustained"    // Growing steadily, medium-term, high ROI
  | "seasonal"     // Predictable cycles (open enrollment, tax season)
  | "micro";       // Small niche, high relevance, low competition

export interface ClassifiedTrend {
  id: string;
  category: TrendCategory;
  signal: TrendSignal | CrossPlatformSignal;
  velocity: number;
  volume: number;
  momentum: number; // 0-100, how long it will last
  relevance: number; // 0-100, how relevant to your business
  opportunity: number; // 0-100, opportunity score
  detectedAt: string;
  platforms: Platform[];
  metadata: {
    firstDetected?: string;
    peakPlatform?: Platform;
    spreading?: boolean;
    competitorActivity?: number;
    sentiment?: "positive" | "neutral" | "negative";
    relatedTrends?: string[];
  };
}

export interface TrendAction {
  trendId: string;
  category: TrendCategory;
  action: "auto_campaign" | "content_series" | "prepared_scripts" | "niche_content";
  priority: "high" | "medium" | "low";
  platforms: Platform[];
  contentCount: number; // How many pieces of content to generate
  schedule: {
    startDate: string;
    frequency: number; // posts per day
    duration: number; // days
  };
  metadata: {
    topics: string[];
    keywords: string[];
    hashtags: string[];
    hooks: string[];
    ctas: string[];
  };
  createdAt: string;
}

/**
 * Classify trend into category
 */
export function classifyTrendCategory(
  signal: TrendSignal | CrossPlatformSignal,
  historicalData?: any[]
): TrendCategory {
  const velocity = signal.velocity;
  const volume = "volume" in signal ? signal.volume : 0;
  
  // Breakout: High velocity, medium volume, short history
  if (velocity > 70 && volume > 1000 && volume < 10000) {
    return "breakout";
  }
  
  // Sustained: Medium-high velocity, high volume, growing steadily
  if (velocity > 40 && volume > 5000) {
    return "sustained";
  }
  
  // Seasonal: Check if it matches known seasonal patterns
  const seasonalKeywords = [
    "open enrollment", "enrollment", "medicare", "tax season", "tax", 
    "back to school", "new year", "resolution", "benefits", "coverage"
  ];
  const signalValue = "value" in signal ? signal.value : signal.keyword;
  const lower = signalValue.toLowerCase();
  if (seasonalKeywords.some(keyword => lower.includes(keyword))) {
    return "seasonal";
  }
  
  // Micro: Lower velocity, niche volume, high relevance
  if (velocity < 40 && volume < 5000 && volume > 100) {
    return "micro";
  }
  
  // Default to sustained for medium trends
  return "sustained";
}

/**
 * Calculate trend momentum (how long it will last)
 */
export function calculateMomentum(
  signal: TrendSignal | CrossPlatformSignal,
  historicalData?: any[]
): number {
  const velocity = signal.velocity;
  const volume = "volume" in signal ? signal.volume : 0;
  
  // High velocity + high volume = high momentum
  let momentum = (velocity * 0.6) + (Math.min(100, volume / 100) * 0.4);
  
  // Cross-platform signals have higher momentum
  if ("platforms" in signal && signal.platforms.length > 2) {
    momentum += 10;
  }
  
  // Spreading trends have higher momentum
  if ("spreading" in signal && signal.spreading) {
    momentum += 15;
  }
  
  return Math.min(100, Math.max(0, momentum));
}

/**
 * Calculate trend relevance (how relevant to your business)
 */
export function calculateRelevance(
  signal: TrendSignal | CrossPlatformSignal
): number {
  const signalValue = "value" in signal ? signal.value : signal.keyword;
  const lower = signalValue.toLowerCase();
  
  // Industry keywords
  const industryKeywords = [
    "insurance", "benefits", "policy", "coverage", "healthcare", "medical",
    "dental", "vision", "plan", "enrollment", "deductible", "copay", "premium",
    "claim", "provider", "medicare", "medicaid", "life insurance", "health insurance"
  ];
  
  let relevance = 0;
  
  // Check for industry keywords
  for (const keyword of industryKeywords) {
    if (lower.includes(keyword)) {
      relevance += 20;
    }
  }
  
  // Intent keywords boost relevance
  const intentKeywords = ["help", "need", "want", "interested", "sign up", "price", "quote"];
  for (const keyword of intentKeywords) {
    if (lower.includes(keyword)) {
      relevance += 10;
    }
  }
  
  // Cross-platform signals are more relevant
  if ("platforms" in signal && signal.platforms.length > 2) {
    relevance += 15;
  }
  
  return Math.min(100, Math.max(0, relevance));
}

/**
 * Calculate trend opportunity score
 */
export function calculateOpportunity(
  category: TrendCategory,
  velocity: number,
  volume: number,
  relevance: number,
  momentum: number
): number {
  let opportunity = 0;
  
  // Breakout trends: High opportunity, short window
  if (category === "breakout") {
    opportunity = (velocity * 0.4) + (relevance * 0.3) + (momentum * 0.3);
  }
  
  // Sustained trends: Medium-high opportunity, longer window
  if (category === "sustained") {
    opportunity = (velocity * 0.3) + (relevance * 0.4) + (momentum * 0.3);
  }
  
  // Seasonal trends: Predictable opportunity
  if (category === "seasonal") {
    opportunity = (relevance * 0.5) + (momentum * 0.5);
  }
  
  // Micro trends: Niche opportunity
  if (category === "micro") {
    opportunity = (relevance * 0.6) + (velocity * 0.4);
  }
  
  return Math.min(100, Math.max(0, opportunity));
}

/**
 * Classify and score trends
 */
export function classifyTrends(
  platformTrends: PlatformTrends[],
  crossPlatform: CrossPlatformSignal[]
): ClassifiedTrend[] {
  const classified: ClassifiedTrend[] = [];
  
  // Classify platform trends
  for (const trends of platformTrends) {
    for (const signal of [...trends.topics, ...trends.keywords, ...trends.hashtags]) {
      const category = classifyTrendCategory(signal);
      const momentum = calculateMomentum(signal);
      const relevance = calculateRelevance(signal);
      const opportunity = calculateOpportunity(category, signal.velocity, signal.volume, relevance, momentum);
      
      classified.push({
        id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        category,
        signal,
        velocity: signal.velocity,
        volume: signal.volume,
        momentum,
        relevance,
        opportunity,
        detectedAt: new Date().toISOString(),
        platforms: [trends.platform],
        metadata: {
          firstDetected: signal.detectedAt,
          peakPlatform: trends.platform,
          competitorActivity: signal.metadata?.competitorActivity,
          sentiment: signal.metadata?.sentiment,
          relatedTrends: signal.metadata?.relatedTrends
        }
      });
    }
  }
  
  // Classify cross-platform signals
  for (const signal of crossPlatform) {
    const category = classifyTrendCategory(signal);
    const momentum = calculateMomentum(signal);
    const relevance = calculateRelevance(signal);
    const opportunity = calculateOpportunity(category, signal.velocity, 0, relevance, momentum);
    
    classified.push({
      id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category,
      signal,
      velocity: signal.velocity,
      volume: 0, // Cross-platform signals don't have volume
      momentum,
      relevance,
      opportunity,
      detectedAt: new Date().toISOString(),
      platforms: signal.platforms,
      metadata: {
        firstDetected: signal.firstDetected,
        peakPlatform: signal.peakPlatform,
        spreading: signal.spreading
      }
    });
  }
  
  // Sort by opportunity (highest first)
  return classified.sort((a, b) => b.opportunity - a.opportunity);
}

/**
 * Map trend category to action
 */
export function mapTrendToAction(
  trend: ClassifiedTrend
): TrendAction {
  const signalValue = "value" in trend.signal ? trend.signal.value : trend.signal.keyword;
  
  // Breakout Trend → Auto-Campaign
  if (trend.category === "breakout") {
    return {
      trendId: trend.id,
      category: "breakout",
      action: "auto_campaign",
      priority: "high",
      platforms: trend.platforms,
      contentCount: 3, // Quick 3-post campaign
      schedule: {
        startDate: new Date().toISOString(),
        frequency: 2, // 2 posts per day
        duration: 2 // 2 days
      },
      metadata: {
        topics: [signalValue],
        keywords: [signalValue],
        hashtags: [signalValue.replace(/\s+/g, "")],
        hooks: [`${signalValue} is exploding right now`],
        ctas: ["Learn more at xom3.io"]
      },
      createdAt: new Date().toISOString()
    };
  }
  
  // Sustained Trend → Content Series
  if (trend.category === "sustained") {
    return {
      trendId: trend.id,
      category: "sustained",
      action: "content_series",
      priority: "medium",
      platforms: trend.platforms,
      contentCount: 7, // 7-part series
      schedule: {
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Start tomorrow
        frequency: 1, // 1 post per day
        duration: 7 // 7 days
      },
      metadata: {
        topics: [signalValue],
        keywords: [signalValue],
        hashtags: [signalValue.replace(/\s+/g, "")],
        hooks: [`Everything you need to know about ${signalValue}`],
        ctas: ["Follow for more insights"]
      },
      createdAt: new Date().toISOString()
    };
  }
  
  // Seasonal Trend → Prepared Scripts
  if (trend.category === "seasonal") {
    return {
      trendId: trend.id,
      category: "seasonal",
      action: "prepared_scripts",
      priority: "medium",
      platforms: trend.platforms,
      contentCount: 5, // 5 prepared scripts
      schedule: {
        startDate: new Date().toISOString(),
        frequency: 1, // 1 post per day
        duration: 5 // 5 days
      },
      metadata: {
        topics: [signalValue],
        keywords: [signalValue],
        hashtags: [signalValue.replace(/\s+/g, "")],
        hooks: [`${signalValue} season is here`],
        ctas: ["Get started today"]
      },
      createdAt: new Date().toISOString()
    };
  }
  
  // Micro Trend → Niche Content
  return {
    trendId: trend.id,
    category: "micro",
    action: "niche_content",
    priority: "low",
    platforms: trend.platforms,
    contentCount: 2, // 2 niche posts
    schedule: {
      startDate: new Date().toISOString(),
      frequency: 0.5, // 1 post every 2 days
      duration: 4 // 4 days
    },
    metadata: {
      topics: [signalValue],
      keywords: [signalValue],
      hashtags: [signalValue.replace(/\s+/g, "")],
      hooks: [`Deep dive: ${signalValue}`],
      ctas: ["DM for more info"]
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * Process trends and generate actions
 */
export async function processTrends(): Promise<{
  trends: ClassifiedTrend[];
  actions: TrendAction[];
  hseState: string[];
}> {
  // Detect all trends
  const { platforms, crossPlatform } = await detectAllTrends();
  
  // Classify trends
  const classified = classifyTrends(platforms, crossPlatform);
  
  // Filter high-opportunity trends (top 10)
  const topTrends = classified
    .filter(t => t.opportunity > 50)
    .slice(0, 10);
  
  // Map to actions
  const actions = topTrends.map(mapTrendToAction);
  
  // Determine HSE state
  const hseState: string[] = [];
  
  const breakoutCount = topTrends.filter(t => t.category === "breakout").length;
  const sustainedCount = topTrends.filter(t => t.category === "sustained").length;
  const seasonalCount = topTrends.filter(t => t.category === "seasonal").length;
  
  if (breakoutCount > 2) {
    hseState.push("trend_breakout_spike");
    emitStateUpdate(["trend_breakout_spike"]);
  }
  
  if (sustainedCount > 3) {
    hseState.push("trend_sustained_growth");
  }
  
  if (seasonalCount > 0) {
    hseState.push("trend_seasonal_cycle");
  }
  
  if (topTrends.length > 5) {
    hseState.push("trend_high_activity");
  }
  
  // Emit signal
  emitSignal({
    source: "broadcast_engine",
    type: "trends_processed",
    payload: {
      totalTrends: classified.length,
      topTrends: topTrends.length,
      actions: actions.length,
      categories: {
        breakout: breakoutCount,
        sustained: sustainedCount,
        seasonal: seasonalCount,
        micro: topTrends.filter(t => t.category === "micro").length
      }
    },
    priority: breakoutCount > 2 ? "high" : "medium"
  });
  
  return {
    trends: topTrends,
    actions,
    hseState
  };
}

/**
 * Get recommended content topics based on trends
 */
export function getRecommendedTopics(
  trends: ClassifiedTrend[],
  limit: number = 10
): string[] {
  return trends
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, limit)
    .map(t => {
      const signalValue = "value" in t.signal ? t.signal.value : t.signal.keyword;
      return signalValue;
    });
}

/**
 * Get recommended hashtags based on trends
 */
export function getRecommendedHashtags(
  trends: ClassifiedTrend[],
  limit: number = 20
): string[] {
  const hashtags: string[] = [];
  
  for (const trend of trends.slice(0, limit)) {
    const signalValue = "value" in trend.signal ? trend.signal.value : trend.signal.keyword;
    hashtags.push(signalValue.replace(/\s+/g, "").toLowerCase());
  }
  
  return Array.from(new Set(hashtags));
}
