// Broadcast Engine - Optimization Loop: Adjustment Engine
// Makes automatic adjustments to posting frequency, timing, platform priority, content length, hook style, CTA strength, hashtag clusters, trend alignment

import { PostingStrategy, adjustStrategyForPerformance, optimizeFrequency, optimizePostingTimes } from "../adaptive-strategy";
import { PerformanceMetrics } from "../adaptive-strategy";
import { PerformanceAnalysis } from "./performance-analyzer";
import { DetectedPattern } from "./pattern-detector";

export interface Adjustment {
  id: string;
  type: "posting_frequency" | "posting_timing" | "platform_priority" | "content_length" | "hook_style" | "cta_strength" | "hashtag_clusters" | "trend_alignment";
  target: string; // Platform, content type, etc.
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number; // 0-1
  applied: boolean;
  appliedAt?: string;
}

/**
 * Adjust posting frequency
 */
export function adjustPostingFrequency(
  currentStrategy: PostingStrategy,
  analysis: PerformanceAnalysis,
  patterns: DetectedPattern[]
): Adjustment {
  const platformWinners = analysis.winners.platforms.find(p => p.platform === currentStrategy.platform);
  const platformLosers = analysis.losers.platforms.find(p => p.platform === currentStrategy.platform);
  
  let newFrequency = currentStrategy.frequency;
  let reason = "No change";
  let confidence = 0.5;
  
  if (platformWinners) {
    // Increase frequency for winning platforms
    newFrequency = Math.min(5, currentStrategy.frequency + 0.5);
    reason = `Platform ${currentStrategy.platform} is performing well (ROI: ${platformWinners.roi.toFixed(0)})`;
    confidence = 0.8;
  } else if (platformLosers) {
    // Decrease frequency for losing platforms
    newFrequency = Math.max(0.5, currentStrategy.frequency - 0.5);
    reason = `Platform ${currentStrategy.platform} is underperforming (ROI: ${platformLosers.roi.toFixed(0)})`;
    confidence = 0.7;
  }
  
  // Check for repeating patterns
  const dayPattern = patterns.find(p => 
    p.type === "repeating" && 
    p.metadata.affectedPlatforms?.includes(currentStrategy.platform)
  );
  
  if (dayPattern) {
    newFrequency = Math.min(5, newFrequency + 0.25);
    reason += ` + Pattern detected: ${dayPattern.description}`;
    confidence = Math.min(1.0, confidence + 0.1);
  }
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "posting_frequency",
    target: currentStrategy.platform,
    oldValue: currentStrategy.frequency,
    newValue: newFrequency,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Adjust posting timing
 */
export function adjustPostingTiming(
  currentStrategy: PostingStrategy,
  engagementByHour: Record<number, number>
): Adjustment {
  const optimalTimes = optimizePostingTimes(currentStrategy.optimalTimes, engagementByHour);
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "posting_timing",
    target: currentStrategy.platform,
    oldValue: currentStrategy.optimalTimes,
    newValue: optimalTimes,
    reason: "Optimized based on engagement patterns",
    confidence: 0.7,
    applied: false
  };
}

/**
 * Adjust platform priority
 */
export function adjustPlatformPriority(
  currentStrategy: PostingStrategy,
  analysis: PerformanceAnalysis
): Adjustment {
  const platformROI = analysis.winners.platforms.find(p => p.platform === currentStrategy.platform) ||
                      analysis.losers.platforms.find(p => p.platform === currentStrategy.platform);
  
  let newPriority = currentStrategy.priority;
  let reason = "No change";
  let confidence = 0.5;
  
  if (platformROI) {
    // Adjust priority based on ROI
    if (platformROI.roi > 1000) {
      newPriority = Math.min(100, currentStrategy.priority + 20);
      reason = `High ROI platform (${platformROI.roi.toFixed(0)}) - increasing priority`;
      confidence = 0.9;
    } else if (platformROI.roi < 100) {
      newPriority = Math.max(0, currentStrategy.priority - 20);
      reason = `Low ROI platform (${platformROI.roi.toFixed(0)}) - decreasing priority`;
      confidence = 0.8;
    }
  }
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "platform_priority",
    target: currentStrategy.platform,
    oldValue: currentStrategy.priority,
    newValue: newPriority,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Adjust hook style
 */
export function adjustHookStyle(
  currentStrategy: PostingStrategy,
  analysis: PerformanceAnalysis
): Adjustment {
  // In production, analyze which hook styles perform best
  // For now, switch to trending style if performance is low
  let newStyle = currentStrategy.captionStyle;
  let reason = "No change";
  let confidence = 0.5;
  
  const platformLosers = analysis.losers.content.filter(c => c.platform === currentStrategy.platform);
  if (platformLosers.length > 5) {
    newStyle = "trending";
    reason = "Low-performing content detected - switching to trending style";
    confidence = 0.6;
  }
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "hook_style",
    target: currentStrategy.platform,
    oldValue: currentStrategy.captionStyle,
    newValue: newStyle,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Adjust CTA strength
 */
export function adjustCTAStrength(
  currentStrategy: PostingStrategy,
  analysis: PerformanceAnalysis
): Adjustment {
  const platformROI = analysis.winners.platforms.find(p => p.platform === currentStrategy.platform);
  
  let newCTAStyle = currentStrategy.ctaStyle;
  let reason = "No change";
  let confidence = 0.5;
  
  if (platformROI && platformROI.conversionRate > 0.15) {
    // High conversion - use direct CTA
    newCTAStyle = "direct";
    reason = `High conversion rate (${(platformROI.conversionRate * 100).toFixed(1)}%) - using direct CTA`;
    confidence = 0.8;
  } else if (platformROI && platformROI.conversionRate < 0.05) {
    // Low conversion - use soft CTA
    newCTAStyle = "soft";
    reason = `Low conversion rate (${(platformROI.conversionRate * 100).toFixed(1)}%) - using soft CTA`;
    confidence = 0.7;
  }
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "cta_strength",
    target: currentStrategy.platform,
    oldValue: currentStrategy.ctaStyle,
    newValue: newCTAStyle,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Adjust hashtag strategy
 */
export function adjustHashtagStrategy(
  currentStrategy: PostingStrategy,
  analysis: PerformanceAnalysis,
  patterns: DetectedPattern[]
): Adjustment {
  const trendPatterns = patterns.filter(p => p.type === "trend_cycle");
  
  let newStrategy = currentStrategy.hashtagStrategy;
  let reason = "No change";
  let confidence = 0.5;
  
  if (trendPatterns.length > 0) {
    newStrategy = "trending";
    reason = `${trendPatterns.length} high-performing trends detected - switching to trending hashtags`;
    confidence = 0.8;
  }
  
  return {
    id: `adjustment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "hashtag_clusters",
    target: currentStrategy.platform,
    oldValue: currentStrategy.hashtagStrategy,
    newValue: newStrategy,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Generate all adjustments for a strategy
 */
export function generateAdjustments(
  strategy: PostingStrategy,
  analysis: PerformanceAnalysis,
  patterns: DetectedPattern[],
  engagementByHour?: Record<number, number>
): Adjustment[] {
  const adjustments: Adjustment[] = [];
  
  adjustments.push(adjustPostingFrequency(strategy, analysis, patterns));
  adjustments.push(adjustPlatformPriority(strategy, analysis));
  adjustments.push(adjustHookStyle(strategy, analysis));
  adjustments.push(adjustCTAStrength(strategy, analysis));
  adjustments.push(adjustHashtagStrategy(strategy, analysis, patterns));
  
  if (engagementByHour) {
    adjustments.push(adjustPostingTiming(strategy, engagementByHour));
  }
  
  // Filter out no-change adjustments
  return adjustments.filter(a => a.oldValue !== a.newValue);
}

/**
 * Apply adjustment
 */
export function applyAdjustment(
  strategy: PostingStrategy,
  adjustment: Adjustment
): PostingStrategy {
  const updated = { ...strategy };
  
  switch (adjustment.type) {
    case "posting_frequency":
      updated.frequency = adjustment.newValue;
      break;
    case "posting_timing":
      updated.optimalTimes = adjustment.newValue;
      break;
    case "platform_priority":
      updated.priority = adjustment.newValue;
      break;
    case "hook_style":
      updated.captionStyle = adjustment.newValue;
      break;
    case "cta_strength":
      updated.ctaStyle = adjustment.newValue;
      break;
    case "hashtag_clusters":
      updated.hashtagStrategy = adjustment.newValue;
      break;
  }
  
  updated.lastUpdated = new Date().toISOString();
  
  return updated;
}

/**
 * Apply adjustments with confidence threshold
 */
export function applyAdjustmentsWithThreshold(
  strategy: PostingStrategy,
  adjustments: Adjustment[],
  confidenceThreshold: number = 0.7
): PostingStrategy {
  let updated = { ...strategy };
  
  // Apply only high-confidence adjustments
  const highConfidenceAdjustments = adjustments.filter(a => a.confidence >= confidenceThreshold);
  
  for (const adjustment of highConfidenceAdjustments) {
    updated = applyAdjustment(updated, adjustment);
    adjustment.applied = true;
    adjustment.appliedAt = new Date().toISOString();
  }
  
  return updated;
}
