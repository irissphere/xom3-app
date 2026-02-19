// Broadcast Engine - Thumbnail Text Generator Module
// Generates bold text overlays, curiosity text, problem-solution text, trend-aligned text

import { ClassifiedTrend } from "../trend-engine";

export type ThumbnailStyle = 
  | "bold"          // Bold, eye-catching
  | "curiosity"     // Curiosity-driven
  | "problem"       // Problem-solution
  | "trend"         // Trend-aligned
  | "minimal"       // Minimal, clean

export interface ThumbnailText {
  text: string;
  style: ThumbnailStyle;
  color?: string; // Recommended color
  position?: "top" | "center" | "bottom";
  score: number; // 0-100
}

export interface ThumbnailContext {
  topic: string;
  trend?: ClassifiedTrend;
  hook?: string;
  performanceData?: {
    bestPerformingThumbnail?: ThumbnailStyle;
    thumbnailPerformance?: Record<ThumbnailStyle, number>; // Click-through rates
  };
}

/**
 * Generate bold thumbnail text
 */
export function generateBoldThumbnail(context: ThumbnailContext): ThumbnailText {
  const { topic, hook } = context;
  
  const text = hook || `${topic.toUpperCase()}`;
  
  return {
    text,
    style: "bold",
    color: "#FF0000", // Red for attention
    position: "center",
    score: 85
  };
}

/**
 * Generate curiosity thumbnail text
 */
export function generateCuriosityThumbnail(context: ThumbnailContext): ThumbnailText {
  const { topic } = context;
  
  const text = `You Won't Believe This About ${topic}`;
  
  return {
    text,
    style: "curiosity",
    color: "#FFD700", // Gold for curiosity
    position: "top",
    score: 80
  };
}

/**
 * Generate problem-solution thumbnail text
 */
export function generateProblemThumbnail(context: ThumbnailContext): ThumbnailText {
  const { topic } = context;
  
  const text = `${topic} Made Simple`;
  
  return {
    text,
    style: "problem",
    color: "#00FF00", // Green for solution
    position: "center",
    score: 75
  };
}

/**
 * Generate trend-aligned thumbnail text
 */
export function generateTrendThumbnail(context: ThumbnailContext): ThumbnailText {
  const { topic, trend } = context;
  
  if (!trend) {
    return generateBoldThumbnail(context);
  }
  
  let text = "";
  if (trend.category === "breakout") {
    text = `${topic} IS TRENDING NOW`;
  } else if (trend.category === "sustained") {
    text = `${topic} - Everything You Need to Know`;
  } else {
    text = `${topic} - Trending Topic`;
  }
  
  return {
    text,
    style: "trend",
    color: "#FF6B6B", // Red-orange for trending
    position: "top",
    score: trend.opportunity
  };
}

/**
 * Generate minimal thumbnail text
 */
export function generateMinimalThumbnail(context: ThumbnailContext): ThumbnailText {
  const { topic } = context;
  
  const text = topic;
  
  return {
    text,
    style: "minimal",
    color: "#FFFFFF", // White for minimal
    position: "center",
    score: 70
  };
}

/**
 * Generate multiple thumbnail text variations
 */
export function generateThumbnailVariations(context: ThumbnailContext): ThumbnailText[] {
  const variations: ThumbnailText[] = [];
  
  // Generate all styles
  variations.push(generateBoldThumbnail(context));
  variations.push(generateCuriosityThumbnail(context));
  variations.push(generateProblemThumbnail(context));
  variations.push(generateMinimalThumbnail(context));
  
  // Add trend thumbnail if trend exists
  if (context.trend) {
    variations.push(generateTrendThumbnail(context));
  }
  
  // Boost scores based on performance data
  if (context.performanceData?.thumbnailPerformance) {
    for (const variation of variations) {
      const performance = context.performanceData.thumbnailPerformance[variation.style];
      if (performance) {
        variation.score = Math.min(100, variation.score + (performance * 20));
      }
    }
  }
  
  // Sort by score (highest first)
  variations.sort((a, b) => b.score - a.score);
  
  return variations;
}

/**
 * Get best thumbnail text for context
 */
export function getBestThumbnail(context: ThumbnailContext): ThumbnailText {
  const variations = generateThumbnailVariations(context);
  return variations[0]; // Highest scoring variation
}
