// Broadcast Engine - Optimization Loop: Content Evolution Engine
// Regenerates scripts, hooks, captions, CTAs, thumbnails based on what's working, failing, trending, converting

import { generateContent } from "../content-generation";
import { getBestPerformingPatterns, getLearningMemory } from "../learning-engine";
import { ContentROI } from "../revenue-attribution/roi-calculator";
import { PerformanceAnalysis } from "./performance-analyzer";
import { DetectedPattern } from "./pattern-detector";
import { ClassifiedTrend } from "../trend-engine";
import { Platform } from "../types";

export interface ContentEvolution {
  id: string;
  originalContentId?: string;
  evolvedFrom?: string;
  topic: string;
  platform: Platform;
  changes: Array<{
    element: "script" | "hook" | "caption" | "cta" | "hashtags" | "thumbnail";
    oldValue?: string;
    newValue: string;
    reason: string;
  }>;
  confidence: number; // 0-1
  generatedAt: string;
}

/**
 * Evolve content based on winners
 */
export async function evolveContentFromWinners(
  winner: ContentROI,
  analysis: PerformanceAnalysis,
  patterns: DetectedPattern[]
): Promise<ContentEvolution> {
  const changes: ContentEvolution["changes"] = [];
  
  // Get best performing patterns
  const bestPatterns = getBestPerformingPatterns(winner.platform as Platform);
  
  // Evolve hook based on best performers
  if (bestPatterns.formats.length > 0) {
    changes.push({
      element: "hook",
      newValue: "evolved_hook", // In production, generate based on best performers
      reason: `Evolved from top-performing format: ${bestPatterns.formats[0].format}`
    });
  }
  
  // Evolve CTA based on best performers
  if (bestPatterns.ctas.length > 0) {
    changes.push({
      element: "cta",
      newValue: bestPatterns.ctas[0].cta,
      reason: `Evolved from top-performing CTA (${(bestPatterns.ctas[0].leadConversion * 100).toFixed(1)}% conversion)`
    });
  }
  
  // Evolve hashtags based on trends
  const trendPatterns = patterns.filter(p => p.type === "trend_cycle");
  if (trendPatterns.length > 0) {
    changes.push({
      element: "hashtags",
      newValue: "trending_hashtags", // In production, generate from trend patterns
      reason: `Evolved to capitalize on ${trendPatterns.length} high-performing trends`
    });
  }
  
  return {
    id: `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalContentId: winner.postId,
    topic: winner.title || "evolved_topic",
    platform: winner.platform as Platform,
    changes,
    confidence: 0.8,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Evolve content based on failures
 */
export async function evolveContentFromFailures(
  loser: ContentROI,
  analysis: PerformanceAnalysis
): Promise<ContentEvolution> {
  const changes: ContentEvolution["changes"] = [];
  
  // Get best performing patterns to learn from
  const bestPatterns = getBestPerformingPatterns(loser.platform as Platform);
  
  // Evolve hook to match winners
  if (bestPatterns.formats.length > 0) {
    changes.push({
      element: "hook",
      oldValue: "old_hook",
      newValue: "evolved_hook",
      reason: `Evolved to match top-performing format: ${bestPatterns.formats[0].format}`
    });
  }
  
  // Evolve CTA to match winners
  if (bestPatterns.ctas.length > 0) {
    changes.push({
      element: "cta",
      oldValue: "old_cta",
      newValue: bestPatterns.ctas[0].cta,
      reason: `Evolved to match top-performing CTA`
    });
  }
  
  return {
    id: `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalContentId: loser.postId,
    evolvedFrom: "failure",
    topic: loser.title || "evolved_topic",
    platform: loser.platform as Platform,
    changes,
    confidence: 0.7,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Evolve content based on trends
 */
export async function evolveContentFromTrends(
  topic: string,
  platform: Platform,
  trend: ClassifiedTrend,
  analysis: PerformanceAnalysis
): Promise<ContentEvolution> {
  const changes: ContentEvolution["changes"] = [];
  const trendLabel = (trend.signal as any)?.value || (trend.signal as any)?.keyword || (trend.signal as any)?.topic || "trend";
  
  // Evolve script to align with trend
  changes.push({
    element: "script",
    newValue: "trend_aligned_script",
    reason: `Evolved to align with ${trend.category} trend: ${trendLabel}`
  });
  
  // Evolve hook to capitalize on trend
  changes.push({
    element: "hook",
    newValue: "trend_hook",
    reason: `Evolved to capitalize on trending topic`
  });
  
  // Evolve hashtags to include trend keywords
  changes.push({
    element: "hashtags",
    newValue: "trend_hashtags",
    reason: `Evolved to include trending hashtags`
  });
  
  return {
    id: `evolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    topic,
    platform,
    changes,
    confidence: trend.opportunity / 100,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate evolved content
 */
export async function generateEvolvedContent(
  evolution: ContentEvolution,
  trend?: ClassifiedTrend
): Promise<any> {
  // Generate new content with evolved elements
  const evolvedContent = await generateContent(
    evolution.topic,
    [evolution.platform],
    {
      includeTrending: !!trend,
      trend,
      performanceData: {
        bestPerformingStyle: evolution.changes.find(c => c.element === "script")?.newValue,
        bestPerformingHook: evolution.changes.find(c => c.element === "hook")?.newValue,
        bestPerformingCTA: evolution.changes.find(c => c.element === "cta")?.newValue
      }
    }
  );
  
  return evolvedContent;
}

/**
 * Batch evolve content from analysis
 */
export async function batchEvolveContent(
  analysis: PerformanceAnalysis,
  patterns: DetectedPattern[],
  trends?: ClassifiedTrend[]
): Promise<ContentEvolution[]> {
  const evolutions: ContentEvolution[] = [];
  
  // Evolve from top winners
  for (const winner of analysis.winners.content.slice(0, 5)) {
    const evolution = await evolveContentFromWinners(winner, analysis, patterns);
    evolutions.push(evolution);
  }
  
  // Evolve from failures (learn from mistakes)
  for (const loser of analysis.losers.content.slice(0, 3)) {
    const evolution = await evolveContentFromFailures(loser, analysis);
    evolutions.push(evolution);
  }
  
  // Evolve from trends
  if (trends) {
    for (const trend of trends.slice(0, 3)) {
      const topic =
        (trend.signal as any)?.value ||
        (trend.signal as any)?.keyword ||
        (trend.signal as any)?.topic ||
        "trend_topic";
      const platform: Platform =
        (trend.signal as any)?.platform && (["youtube","tiktok","instagram","facebook","linkedin","twitter","shorts","reels"] as const).includes((trend.signal as any).platform)
          ? ((trend.signal as any).platform as Platform)
          : "instagram";
      const evolution = await evolveContentFromTrends(
        topic,
        platform,
        trend,
        analysis
      );
      evolutions.push(evolution);
    }
  }
  
  return evolutions;
}
