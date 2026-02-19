// Broadcast Engine - Learning Engine API
// GET /api/broadcast/learn - Get learning insights

import { NextResponse } from "next/server";
import { getLearningInsights, getBestPerformingPatterns, getPlatformRecommendations, getLearningMemory } from "@/lib/broadcast/learning-engine";
import { ContentPerformance } from "@/lib/broadcast/learning-engine";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    
    const insights = getLearningInsights();
    const patterns = getBestPerformingPatterns(platform as any);
    const platforms = getPlatformRecommendations();
    
    return NextResponse.json({
      success: true,
      insights,
      patterns: {
        formats: patterns.formats,
        topics: patterns.topics,
        ctas: patterns.ctas
      },
      platforms,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Learn error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Record content performance
    const { recordContentPerformance, learnFromBatch } = await import("@/lib/broadcast/learning-engine");
    
    if (body.performance) {
      // Single performance record
      recordContentPerformance(body.performance as ContentPerformance);
    } else if (body.performances && Array.isArray(body.performances)) {
      // Batch performance records
      learnFromBatch(body.performances as ContentPerformance[]);
    } else {
      return NextResponse.json(
        { error: "performance or performances array is required" },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Performance recorded",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Record performance error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
