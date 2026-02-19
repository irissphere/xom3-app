// Broadcast Engine - Comments Ingestion API
// POST /api/broadcast/ingest/comments - Scrape and ingest comments

import { NextResponse } from "next/server";
import { scrapeComments } from "@/lib/broadcast/scraping-engine";
import { batchNormalizeSignals } from "@/lib/broadcast/signal-normalizer";
import { storeNormalizedSignal, storeRawSignal } from "@/lib/broadcast/signal-store";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { postId, platform, since } = body;
    
    if (!postId || !platform) {
      return NextResponse.json(
        { error: "postId and platform are required" },
        { status: 400 }
      );
    }
    
    // Scrape comments
    const comments = await scrapeComments(postId, platform as Platform, since);
    
    // Store raw signals
    for (const comment of comments) {
      storeRawSignal(platform, comment);
    }
    
    // Normalize signals
    const normalized = batchNormalizeSignals(platform as Platform, comments, "comment");
    
    // Store normalized signals
    for (const signal of normalized) {
      storeNormalizedSignal(signal);
    }
    
    return NextResponse.json({
      success: true,
      postId,
      platform,
      comments: {
        raw: comments.length,
        normalized: normalized.length,
        items: normalized.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Comments ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
