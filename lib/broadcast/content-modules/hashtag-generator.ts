// Broadcast Engine - Hashtag Generator Module
// Generates platform-specific, trend-aligned, niche, and broad hashtag clusters

import { Platform } from "../types";
import { ClassifiedTrend } from "../trend-engine";

export type HashtagStrategy = 
  | "trending"    // Trending hashtags
  | "niche"       // Niche, targeted hashtags
  | "broad"       // Broad, high-volume hashtags
  | "mixed"       // Mix of all strategies

export interface HashtagCluster {
  hashtags: string[];
  strategy: HashtagStrategy;
  platform: Platform;
  score: number; // 0-100, based on trend relevance, performance, etc.
}

export interface HashtagContext {
  topic: string;
  platform: Platform;
  trend?: ClassifiedTrend;
  strategy?: HashtagStrategy;
  count?: number; // Number of hashtags to generate
  performanceData?: {
    bestPerformingHashtags?: string[];
    hashtagPerformance?: Record<string, number>; // Engagement rates
  };
}

/**
 * Industry hashtags (always included)
 */
const INDUSTRY_HASHTAGS = [
  "healthinsurance", "healthcare", "benefits", "insurance", "health",
  "medical", "dental", "vision", "wellness", "medicare", "medicaid"
];

/**
 * Platform-specific base hashtags
 */
const PLATFORM_BASE_HASHTAGS: Record<Platform, string[]> = {
  youtube: ["youtube", "video", "tutorial", "guide"],
  tiktok: ["tiktok", "fyp", "viral", "foryou", "foryoupage"],
  instagram: ["instagram", "reels", "viral", "instagood", "explore"],
  reels: ["reels", "instagramreels", "reelsvideo", "viralreels"],
  facebook: ["facebook", "video", "share"],
  linkedin: ["linkedin", "professional", "business", "career"],
  twitter: ["twitter", "thread", "tweet"],
  shorts: ["shorts", "youtubeshorts", "shortvideo"]
};

/**
 * Generate trending hashtags
 */
export function generateTrendingHashtags(
  platform: Platform,
  trend?: ClassifiedTrend,
  count: number = 10
): string[] {
  const hashtags: string[] = [];
  
  // Add trend keyword if available
  if (trend) {
    const trendValue = "value" in trend.signal ? trend.signal.value : trend.signal.keyword;
    if (trendValue) {
      hashtags.push(trendValue.replace(/\s+/g, "").toLowerCase());
    }
  }
  
  // Add platform base hashtags
  hashtags.push(...PLATFORM_BASE_HASHTAGS[platform]);
  
  // Add trending modifiers
  hashtags.push("trending", "viral", "popular", "hot");
  
  // Return top N
  return hashtags.slice(0, count);
}

/**
 * Generate niche hashtags
 */
export function generateNicheHashtags(
  topic: string,
  platform: Platform,
  count: number = 10
): string[] {
  const hashtags: string[] = [];
  
  // Extract keywords from topic
  const keywords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.replace(/[^a-z0-9]/g, ""));
  
  hashtags.push(...keywords);
  
  // Add industry hashtags
  hashtags.push(...INDUSTRY_HASHTAGS);
  
  // Add platform base
  hashtags.push(...PLATFORM_BASE_HASHTAGS[platform]);
  
  // Remove duplicates and return top N
  return Array.from(new Set(hashtags)).slice(0, count);
}

/**
 * Generate broad hashtags
 */
export function generateBroadHashtags(
  platform: Platform,
  count: number = 10
): string[] {
  const hashtags: string[] = [];
  
  // High-volume, broad hashtags
  const broadTags = [
    "health", "wellness", "insurance", "benefits", "healthcare",
    "medical", "life", "family", "business", "tips", "advice",
    "help", "guide", "learn", "education"
  ];
  
  hashtags.push(...broadTags);
  hashtags.push(...PLATFORM_BASE_HASHTAGS[platform]);
  
  // Return top N
  return hashtags.slice(0, count);
}

/**
 * Generate mixed hashtag cluster
 */
export function generateMixedHashtags(
  topic: string,
  platform: Platform,
  trend?: ClassifiedTrend,
  count: number = 10
): string[] {
  const hashtags: string[] = [];
  
  // Mix of all strategies
  const trending = generateTrendingHashtags(platform, trend, Math.ceil(count * 0.3));
  const niche = generateNicheHashtags(topic, platform, Math.ceil(count * 0.4));
  const broad = generateBroadHashtags(platform, Math.ceil(count * 0.3));
  
  hashtags.push(...trending, ...niche, ...broad);
  
  // Remove duplicates and return top N
  return Array.from(new Set(hashtags)).slice(0, count);
}

/**
 * Generate hashtag cluster
 */
export function generateHashtagCluster(context: HashtagContext): HashtagCluster {
  const {
    topic,
    platform,
    trend,
    strategy = "mixed",
    count = platform === "tiktok" ? 100 : platform === "instagram" ? 30 : 0,
    performanceData
  } = context;
  
  let hashtags: string[] = [];
  let score = 70; // Base score
  
  // Generate based on strategy
  switch (strategy) {
    case "trending":
      hashtags = generateTrendingHashtags(platform, trend, count);
      score = trend ? trend.opportunity : 70;
      break;
    case "niche":
      hashtags = generateNicheHashtags(topic, platform, count);
      score = 75;
      break;
    case "broad":
      hashtags = generateBroadHashtags(platform, count);
      score = 65;
      break;
    case "mixed":
    default:
      hashtags = generateMixedHashtags(topic, platform, trend, count);
      score = trend ? 80 : 70;
      break;
  }
  
  // Boost score based on performance data
  if (performanceData?.bestPerformingHashtags) {
    const matchingHashtags = hashtags.filter(h => 
      performanceData.bestPerformingHashtags!.includes(h)
    );
    if (matchingHashtags.length > 0) {
      score = Math.min(100, score + (matchingHashtags.length * 5));
    }
  }
  
  return {
    hashtags,
    strategy,
    platform,
    score
  };
}

/**
 * Generate multiple hashtag clusters (for A/B testing)
 */
export function generateHashtagClusters(context: HashtagContext): HashtagCluster[] {
  const clusters: HashtagCluster[] = [];
  
  // Generate clusters for each strategy
  const strategies: HashtagStrategy[] = ["trending", "niche", "broad", "mixed"];
  
  for (const strategy of strategies) {
    clusters.push(generateHashtagCluster({
      ...context,
      strategy
    }));
  }
  
  // Sort by score (highest first)
  clusters.sort((a, b) => b.score - a.score);
  
  return clusters;
}
