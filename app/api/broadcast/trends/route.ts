// Broadcast Engine - Trend Detection API
// GET /api/broadcast/trends - Get current trends across platforms

import { NextResponse } from "next/server";
import { detectAllTrends, detectYouTubeTrends, detectTikTokTrends, detectInstagramTrends } from "@/lib/broadcast/trend-detection";
import { processTrends, getRecommendedTopics, getRecommendedHashtags } from "@/lib/broadcast/trend-engine";
import { Platform } from "@/lib/broadcast/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");
    const type = searchParams.get("type"); // "all" | "youtube" | "tiktok" | "instagram"
    
    if (platform) {
      // Get trends for specific platform
      let trends;
      
      switch (platform as Platform) {
        case "youtube":
          trends = await detectYouTubeTrends();
          break;
        case "tiktok":
          trends = await detectTikTokTrends();
          break;
        case "instagram":
          trends = await detectInstagramTrends();
          break;
        default:
          return NextResponse.json(
            { error: `Unsupported platform: ${platform}` },
            { status: 400 }
          );
      }
      
      return NextResponse.json({
        success: true,
        platform: trends.platform,
        trends,
        lastUpdated: trends.lastUpdated
      });
    }
    
    // Check if we want processed trends (classified and actionable)
    const processed = searchParams.get("processed") === "true";
    
    if (processed) {
      // Get processed trends (classified, scored, actionable)
      const { trends, actions, hseState } = await processTrends();
      
      return NextResponse.json({
        success: true,
        trends: {
          total: trends.length,
          items: trends.map(t => ({
            id: t.id,
            category: t.category,
            value: "value" in t.signal ? t.signal.value : t.signal.keyword,
            velocity: t.velocity,
            volume: t.volume,
            momentum: t.momentum,
            relevance: t.relevance,
            opportunity: t.opportunity,
            platforms: t.platforms
          })),
          byCategory: {
            breakout: trends.filter(t => t.category === "breakout").length,
            sustained: trends.filter(t => t.category === "sustained").length,
            seasonal: trends.filter(t => t.category === "seasonal").length,
            micro: trends.filter(t => t.category === "micro").length
          }
        },
        actions: {
          total: actions.length,
          items: actions
        },
        recommendations: {
          topics: getRecommendedTopics(trends, 10),
          hashtags: getRecommendedHashtags(trends, 20)
        },
        hseState,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get all trends (raw)
    const { platforms, crossPlatform } = await detectAllTrends();
    
    return NextResponse.json({
      success: true,
      platforms: platforms.map(p => ({
        platform: p.platform,
        topics: p.topics.length,
        keywords: p.keywords.length,
        hashtags: p.hashtags.length,
        lastUpdated: p.lastUpdated
      })),
      crossPlatform: {
        signals: crossPlatform.length,
        items: crossPlatform.slice(0, 20) // Top 20 cross-platform signals
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Trends error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Force refresh trends
    const { platforms, crossPlatform } = await detectAllTrends();
    
    return NextResponse.json({
      success: true,
      message: "Trends refreshed",
      platforms: platforms.length,
      crossPlatform: crossPlatform.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Refresh trends error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
