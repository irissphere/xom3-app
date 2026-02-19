// Broadcast Engine - A/B Testing Engine
// Tests different variants to optimize performance

import { Platform, BroadcastPost } from "./types";

export interface ABTest {
  id: string;
  name: string;
  variants: ABVariant[];
  platform: Platform;
  metric: "engagement" | "leads" | "conversion";
  status: "running" | "completed" | "paused";
  startDate: string;
  endDate?: string;
  winner?: string;
  confidence?: number;
}

export interface ABVariant {
  id: string;
  name: string;
  postId: string;
  reach: number;
  engagement: number;
  leads: number;
  conversionRate: number;
}

/**
 * Create A/B test
 */
export function createABTest(
  name: string,
  variants: { postId: string; name: string }[],
  platform: Platform,
  metric: ABTest["metric"] = "engagement"
): ABTest {
  return {
    id: `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    variants: variants.map(v => ({
      id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: v.name,
      postId: v.postId,
      reach: 0,
      engagement: 0,
      leads: 0,
      conversionRate: 0
    })),
    platform,
    metric,
    status: "running",
    startDate: new Date().toISOString()
  };
}

/**
 * Update variant performance
 */
export function updateVariantPerformance(
  test: ABTest,
  variantId: string,
  performance: {
    reach?: number;
    engagement?: number;
    leads?: number;
  }
): ABTest {
  const variant = test.variants.find(v => v.id === variantId);
  if (!variant) return test;
  
  if (performance.reach !== undefined) variant.reach = performance.reach;
  if (performance.engagement !== undefined) variant.engagement = performance.engagement;
  if (performance.leads !== undefined) variant.leads = performance.leads;
  
  // Calculate conversion rate
  if (variant.reach > 0) {
    variant.conversionRate = variant.leads / variant.reach;
  }
  
  return { ...test };
}

/**
 * Determine test winner
 */
export function determineWinner(test: ABTest): { winner: string; confidence: number } | null {
  if (test.variants.length < 2) return null;
  
  // Calculate metric for each variant
  const scores = test.variants.map(v => {
    switch (test.metric) {
      case "engagement":
        return v.reach > 0 ? v.engagement / v.reach : 0;
      case "leads":
        return v.leads;
      case "conversion":
        return v.conversionRate;
      default:
        return 0;
    }
  });
  
  // Find winner
  const maxScore = Math.max(...scores);
  const winnerIndex = scores.indexOf(maxScore);
  const winner = test.variants[winnerIndex];
  
  // Calculate confidence (simplified - in production, use statistical significance)
  const totalReach = test.variants.reduce((sum, v) => sum + v.reach, 0);
  const confidence = totalReach > 1000 ? 0.95 : totalReach > 500 ? 0.85 : 0.70;
  
  return {
    winner: winner.id,
    confidence
  };
}

/**
 * Complete A/B test
 */
export function completeABTest(test: ABTest): ABTest {
  const result = determineWinner(test);
  
  if (result) {
    test.winner = result.winner;
    test.confidence = result.confidence;
    test.status = "completed";
    test.endDate = new Date().toISOString();
  }
  
  return { ...test };
}

/**
 * Get test insights
 */
export function getTestInsights(test: ABTest): {
  winner?: ABVariant;
  improvement?: number;
  recommendation?: string;
} {
  if (test.status !== "completed" || !test.winner) {
    return {};
  }
  
  const winner = test.variants.find(v => v.id === test.winner);
  if (!winner) return {};
  
  // Calculate improvement over baseline (first variant)
  const baseline = test.variants[0];
  let improvement = 0;
  
  switch (test.metric) {
    case "engagement":
      improvement = baseline.reach > 0
        ? ((winner.engagement / winner.reach) - (baseline.engagement / baseline.reach)) / (baseline.engagement / baseline.reach) * 100
        : 0;
      break;
    case "leads":
      improvement = baseline.leads > 0
        ? ((winner.leads - baseline.leads) / baseline.leads) * 100
        : 0;
      break;
    case "conversion":
      improvement = baseline.conversionRate > 0
        ? ((winner.conversionRate - baseline.conversionRate) / baseline.conversionRate) * 100
        : 0;
      break;
  }
  
  return {
    winner,
    improvement,
    recommendation: improvement > 10
      ? `Use "${winner.name}" variant - ${improvement.toFixed(1)}% improvement`
      : `Results are similar - consider testing other variables`
  };
}
