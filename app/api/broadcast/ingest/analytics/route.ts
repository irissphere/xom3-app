// Broadcast Engine - Analytics Ingestion API
// POST /api/broadcast/ingest/analytics - Scrape and ingest analytics

import { NextResponse } from "next/server";
import { scrapeAnalytics } from "@/lib/broadcast/scraping-engine";
import { storeRawSignal } from "@/lib/broadcast/signal-store";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { postId, platform } = body;
    
    if (!postId || !platform) {
      return NextResponse.json(
        { error: "postId and platform are required" },
        { status: 400 }
      );
    }
    
    // Scrape analytics
    const metrics = await scrapeAnalytics(postId, platform as Platform);
    
    // Store raw analytics
    storeRawSignal(platform, {
      type: "analytics",
      postId,
      metrics,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      postId,
      platform,
      metrics: {
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves,
        views: metrics.views,
        follows: metrics.follows,
        mentions: metrics.mentions,
        dms: metrics.dms,
        replies: metrics.replies,
        watchTime: (metrics as any).watchTime,
        averageWatchPercentage: (metrics as any).averageWatchPercentage,
        retentionCurve: (metrics as any).retentionCurve,
        lastScrapedAt: metrics.lastScrapedAt
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Analytics ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
