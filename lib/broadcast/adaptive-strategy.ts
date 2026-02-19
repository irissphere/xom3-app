// Broadcast Engine - Adaptive Posting Strategy
// Adjusts posting strategy based on real-time performance and trends

import { Platform, BroadcastPost } from "./types";
import { PlatformTrends, TrendSignal, CrossPlatformSignal } from "./trend-detection";
import { emitSignal } from "@/lib/uoi/signals";

export interface PostingStrategy {
  platform: Platform;
  frequency: number; // posts per day
  optimalTimes: number[]; // hours of day (0-23)
  contentFormat: string; // "video", "carousel", "reel", "short"
  captionStyle: "question" | "story" | "fact" | "cta" | "trending";
  hashtagStrategy: "trending" | "niche" | "mixed";
  ctaStyle: "direct" | "soft" | "question";
  priority: number; // 0-100, higher = more important
  lastUpdated: string;
}

export interface PerformanceMetrics {
  platform: Platform;
  reach: number;
  engagement: number;
  engagementRate: number;
  leads: number;
  leadConversionRate: number;
  trendAlignment: number; // 0-100, how well content aligns with trends
  lastUpdated: string;
}

export interface AdaptiveStrategy {
  platforms: PostingStrategy[];
  globalTrends: CrossPlatformSignal[];
  performance: PerformanceMetrics[];
  lastOptimized: string;
}

/**
 * Calculate platform priority based on performance
 */
export function calculatePlatformPriority(
  metrics: PerformanceMetrics,
  trends: PlatformTrends
): number {
  let priority = 50; // Base priority
  
  // Performance boost
  if (metrics.engagementRate > 0.05) priority += 20; // 5%+ engagement rate
  if (metrics.leadConversionRate > 0.02) priority += 30; // 2%+ lead conversion
  if (metrics.leads > 10) priority += 10; // High lead volume
  
  // Trend alignment boost
  if (metrics.trendAlignment > 70) priority += 15;
  
  // Trend velocity boost
  const highVelocityTrends = trends.keywords.filter(t => t.velocity > 50).length;
  if (highVelocityTrends > 3) priority += 10;
  
  return Math.min(100, Math.max(0, priority));
}

/**
 * Optimize posting frequency based on performance
 */
export function optimizeFrequency(
  currentFrequency: number,
  metrics: PerformanceMetrics,
  trends: PlatformTrends
): number {
  // If engagement is high and leads are coming, increase frequency
  if (metrics.engagementRate > 0.05 && metrics.leads > 5) {
    return Math.min(5, currentFrequency + 0.5); // Max 5 posts/day
  }
  
  // If engagement is low, decrease frequency
  if (metrics.engagementRate < 0.01) {
    return Math.max(0.5, currentFrequency - 0.5); // Min 0.5 posts/day
  }
  
  // If trends are hot, increase frequency
  const hotTrends = trends.keywords.filter(t => t.velocity > 70).length;
  if (hotTrends > 2) {
    return Math.min(5, currentFrequency + 0.25);
  }
  
  return currentFrequency;
}

/**
 * Optimize posting times based on engagement patterns
 */
export function optimizePostingTimes(
  currentTimes: number[],
  engagementByHour: Record<number, number>
): number[] {
  // Find top 3 hours with highest engagement
  const sorted = Object.entries(engagementByHour)
    .map(([hour, engagement]) => ({ hour: parseInt(hour), engagement }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3);
  
  return sorted.map(s => s.hour);
}

/**
 * Select content format based on trends
 */
export function selectContentFormat(
  platform: Platform,
  trends: PlatformTrends
): string {
  // Check trending formats
  const formatTrends = trends.formats.filter(f => f.velocity > 50);
  
  if (formatTrends.length > 0) {
    // Return most trending format
    return formatTrends.sort((a, b) => b.velocity - a.velocity)[0].value;
  }
  
  // Default formats by platform
  const defaults: Record<Platform, string> = {
    youtube: "video",
    tiktok: "video",
    instagram: "reel",
    facebook: "video",
    linkedin: "carousel",
    twitter: "text",
    shorts: "short",
    reels: "reel"
  };
  
  return defaults[platform] || "video";
}

/**
 * Select caption style based on trends
 */
export function selectCaptionStyle(
  trends: PlatformTrends,
  performance: PerformanceMetrics
): PostingStrategy["captionStyle"] {
  // If trending topics are question-based, use question style
  const questionTrends = trends.topics.filter(t => 
    t.value.toLowerCase().includes("how") || 
    t.value.toLowerCase().includes("why") ||
    t.value.toLowerCase().includes("what")
  );
  
  if (questionTrends.length > 0 && questionTrends[0].velocity > 50) {
    return "question";
  }
  
  // If story-based content performs well, use story style
  if (performance.engagementRate > 0.05) {
    return "story";
  }
  
  // If trends are hot, align with trending style
  if (trends.keywords.some(k => k.velocity > 70)) {
    return "trending";
  }
  
  return "fact";
}

/**
 * Select hashtag strategy
 */
export function selectHashtagStrategy(
  trends: PlatformTrends
): PostingStrategy["hashtagStrategy"] {
  const trendingHashtags = trends.hashtags.filter(h => h.velocity > 50);
  const nicheHashtags = trends.hashtags.filter(h => h.velocity < 30 && h.volume > 1000);
  
  if (trendingHashtags.length > 5) {
    return "trending";
  }
  
  if (nicheHashtags.length > 3) {
    return "niche";
  }
  
  return "mixed";
}

/**
 * Build adaptive strategy
 */
export async function buildAdaptiveStrategy(
  platformTrends: PlatformTrends[],
  performanceMetrics: PerformanceMetrics[]
): Promise<AdaptiveStrategy> {
  const strategies: PostingStrategy[] = [];
  
  for (const trends of platformTrends) {
    const metrics = performanceMetrics.find(m => m.platform === trends.platform);
    if (!metrics) continue;
    
    const priority = calculatePlatformPriority(metrics, trends);
    const frequency = optimizeFrequency(1, metrics, trends); // Start with 1 post/day
    const format = selectContentFormat(trends.platform, trends);
    const captionStyle = selectCaptionStyle(trends, metrics);
    const hashtagStrategy = selectHashtagStrategy(trends);
    
    strategies.push({
      platform: trends.platform,
      frequency,
      optimalTimes: [9, 12, 18], // Default, optimize based on data
      contentFormat: format,
      captionStyle,
      hashtagStrategy,
      ctaStyle: metrics.leadConversionRate > 0.02 ? "direct" : "soft",
      priority,
      lastUpdated: new Date().toISOString()
    });
  }
  
  // Sort by priority
  strategies.sort((a, b) => b.priority - a.priority);
  
  // Get cross-platform signals
  const { detectCrossPlatformSignals } = await import("./trend-detection");
  const crossPlatform = await detectCrossPlatformSignals(platformTrends);
  
  // Emit signal
  emitSignal({
    source: "broadcast_engine",
    type: "strategy_optimized",
    payload: {
      platforms: strategies.map(s => s.platform),
      topPriority: strategies[0]?.platform,
      crossPlatformSignals: crossPlatform.length
    },
    priority: "medium"
  });
  
  return {
    platforms: strategies,
    globalTrends: crossPlatform,
    performance: performanceMetrics,
    lastOptimized: new Date().toISOString()
  };
}

/**
 * Adjust strategy based on real-time performance
 */
export function adjustStrategyForPerformance(
  strategy: PostingStrategy,
  recentPerformance: {
    engagementRate: number;
    leads: number;
    trendAlignment: number;
  }
): PostingStrategy {
  const updated = { ...strategy };
  
  // If performance drops, reduce frequency
  if (recentPerformance.engagementRate < 0.01) {
    updated.frequency = Math.max(0.5, updated.frequency - 0.25);
  }
  
  // If performance spikes, increase frequency (cautiously)
  if (recentPerformance.engagementRate > 0.08 && recentPerformance.leads > 5) {
    updated.frequency = Math.min(5, updated.frequency + 0.25);
  }
  
  // If trend alignment is low, switch to trending style
  if (recentPerformance.trendAlignment < 30) {
    updated.captionStyle = "trending";
    updated.hashtagStrategy = "trending";
  }
  
  updated.lastUpdated = new Date().toISOString();
  
  return updated;
}

/**
 * Get recommended content topics based on trends
 */
export function getRecommendedTopics(
  trends: PlatformTrends[],
  crossPlatform: CrossPlatformSignal[]
): string[] {
  const topics: string[] = [];
  
  // Add cross-platform trending keywords
  for (const signal of crossPlatform.slice(0, 5)) {
    topics.push(signal.keyword);
  }
  
  // Add high-velocity platform-specific trends
  for (const platformTrends of trends) {
    const highVelocity = platformTrends.keywords
      .filter(k => k.velocity > 60)
      .slice(0, 3)
      .map(k => k.value);
    topics.push(...highVelocity);
  }
  
  return Array.from(new Set(topics));
}
