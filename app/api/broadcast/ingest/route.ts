// Broadcast Engine - Scraping & Ingestion Engine API
// POST /api/broadcast/ingest - Scrape engagement from platforms

import { NextResponse } from "next/server";
import { scrapePostEngagement } from "@/lib/broadcast/scraping-engine";
import { ingestPlatformSignals, batchIngestPlatformSignals, getIngestionStats } from "@/lib/broadcast/ingestion-orchestrator";
import { updatePostEngagement, getPost } from "@/lib/broadcast/store";
import { getNormalizedSignals } from "@/lib/broadcast/signal-store";
import { emitSignal } from "@/lib/uoi/signals";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Option 1: Ingest specific post
    if (body.postId) {
      const postId = body.postId;
      const platform = body.platform as Platform;
      const since = body.since; // ISO timestamp
      
      if (!platform) {
        return NextResponse.json(
          { error: "platform is required when postId is provided" },
          { status: 400 }
        );
      }
      
      // Get post
      const post = getPost(postId);
      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }
      
      // Ingest signals
      const result = await ingestPlatformSignals(platform, {
        postId,
        since
      });
      
      // Update post engagement metrics
      const { engagements } = await scrapePostEngagement(postId, platform, since);
      const { metrics } = await scrapePostEngagement(postId, platform);
      
      updatePostEngagement(postId, {
        ...metrics,
        lastScrapedAt: new Date().toISOString()
      });
      
      return NextResponse.json({
        success: true,
        ingestion: result,
        engagements: {
          count: engagements.length,
          items: engagements.slice(0, 50)
        },
        metrics
      });
    }
    
    // Option 2: Batch ingest from multiple platforms
    if (body.platforms && Array.isArray(body.platforms)) {
      const platforms = body.platforms as Platform[];
      const postIds = body.postIds || {};
      const since = body.since;
      
      const results = await batchIngestPlatformSignals(platforms, {
        postIds,
        since
      });
      
      return NextResponse.json({
        success: true,
        results,
        totalSignals: results.reduce((sum, r) => sum + r.signalsIngested, 0),
        totalLeads: results.reduce((sum, r) => sum + r.leadsDetected, 0)
      });
    }
    
    return NextResponse.json(
      { error: "postId or platforms array is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Broadcast API] Ingest error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const platform = searchParams.get("platform");
    const since = searchParams.get("since");
    const stats = searchParams.get("stats") === "true";
    
    // Get ingestion statistics
    if (stats) {
      const statistics = getIngestionStats({
        platform: platform as Platform | undefined,
        since: since || undefined
      });
      
      return NextResponse.json({
        success: true,
        statistics
      });
    }
    
    // Get normalized signals
    if (platform) {
      const signals = getNormalizedSignals({
        platform: platform as Platform,
        since: since || undefined,
        limit: 100
      });
      
      return NextResponse.json({
        success: true,
        signals,
        count: signals.length
      });
    }
    
    // Get post engagement
    if (postId) {
      const post = getPost(postId);
      if (!post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        post: {
          id: post.id,
          engagement: post.engagement,
          platforms: post.platforms
        }
      });
    }
    
    return NextResponse.json(
      { error: "postId, platform, or stats=true is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Broadcast API] Get ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
