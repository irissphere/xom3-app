// Broadcast Engine - Adaptive Strategy API
// GET /api/broadcast/strategy - Get optimized posting strategy

import { NextResponse } from "next/server";
import { buildAdaptiveStrategy, getRecommendedTopics } from "@/lib/broadcast/adaptive-strategy";
import { detectAllTrends } from "@/lib/broadcast/trend-detection";
import { getLearningMemory, getLearningInsights } from "@/lib/broadcast/learning-engine";

export async function GET(req: Request) {
  try {
    // Get current trends
    const { platforms: platformTrends } = await detectAllTrends();
    
    // Get performance metrics (in production, fetch from database)
    // For now, use learning memory
    const learningMemory = getLearningMemory();
    const performanceMetrics = learningMemory.platformPerformance.map(p => ({
      platform: p.platform,
      reach: p.totalReach,
      engagement: p.totalReach * p.avgEngagementRate,
      engagementRate: p.avgEngagementRate,
      leads: p.totalLeads,
      leadConversionRate: p.avgLeadConversion,
      trendAlignment: p.trendAlignment,
      lastUpdated: p.lastUpdated
    }));
    
    // Build adaptive strategy
    const strategy = await buildAdaptiveStrategy(platformTrends, performanceMetrics);
    
    // Get recommended topics
    const { crossPlatform } = await detectAllTrends();
    const recommendedTopics = getRecommendedTopics(platformTrends, crossPlatform);
    
    // Get learning insights
    const insights = getLearningInsights();
    
    return NextResponse.json({
      success: true,
      strategy: {
        platforms: strategy.platforms,
        topPriority: strategy.platforms[0]?.platform,
        lastOptimized: strategy.lastOptimized
      },
      recommendedTopics,
      insights,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Strategy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Force strategy optimization
    const { platforms: platformTrends } = await detectAllTrends();
    
    const learningMemory = getLearningMemory();
    const performanceMetrics = learningMemory.platformPerformance.map(p => ({
      platform: p.platform,
      reach: p.totalReach,
      engagement: p.totalReach * p.avgEngagementRate,
      engagementRate: p.avgEngagementRate,
      leads: p.totalLeads,
      leadConversionRate: p.avgLeadConversion,
      trendAlignment: p.trendAlignment,
      lastUpdated: p.lastUpdated
    }));
    
    const strategy = await buildAdaptiveStrategy(platformTrends, performanceMetrics);
    
    return NextResponse.json({
      success: true,
      message: "Strategy optimized",
      strategy: {
        platforms: strategy.platforms,
        topPriority: strategy.platforms[0]?.platform
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Optimize strategy error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
