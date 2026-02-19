// Broadcast Engine - Trends Ingestion API
// POST /api/broadcast/ingest/trends - Ingest trending data

import { NextResponse } from "next/server";
import { detectAllTrends } from "@/lib/broadcast/trend-detection";
import { storeTrendSignal } from "@/lib/broadcast/signal-store";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { platform } = body;
    
    // Detect trends
    const { platforms: platformTrends, crossPlatform } = await detectAllTrends();
    
    // Store trend signals
    for (const trends of platformTrends) {
      for (const topic of trends.topics) {
        storeTrendSignal({
          platform: trends.platform,
          type: "topic",
          value: topic.value,
          velocity: topic.velocity,
          trend: topic.trend
        });
      }
      
      for (const keyword of trends.keywords) {
        storeTrendSignal({
          platform: trends.platform,
          type: "keyword",
          value: keyword.value,
          velocity: keyword.velocity,
          trend: keyword.trend
        });
      }
      
      for (const hashtag of trends.hashtags) {
        storeTrendSignal({
          platform: trends.platform,
          type: "hashtag",
          value: hashtag.value,
          velocity: hashtag.velocity,
          trend: hashtag.trend
        });
      }
    }
    
    // Store cross-platform signals
    for (const signal of crossPlatform) {
      storeTrendSignal({
        platform: "cross_platform",
        type: "cross_platform_signal",
        keyword: signal.keyword,
        platforms: signal.platforms,
        velocity: signal.velocity
      });
    }
    
    return NextResponse.json({
      success: true,
      trends: {
        platforms: platformTrends.map(p => ({
          platform: p.platform,
          topics: p.topics.length,
          keywords: p.keywords.length,
          hashtags: p.hashtags.length
        })),
        crossPlatform: crossPlatform.length,
        totalTrends: platformTrends.reduce((sum, p) => 
          sum + p.topics.length + p.keywords.length + p.hashtags.length, 0
        )
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Trends ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
