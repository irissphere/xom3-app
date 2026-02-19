// Broadcast Engine - Mentions Ingestion API
// POST /api/broadcast/ingest/mentions - Scrape and ingest mentions

import { NextResponse } from "next/server";
import { scrapeMentions } from "@/lib/broadcast/scraping-engine";
import { batchNormalizeSignals } from "@/lib/broadcast/signal-normalizer";
import { storeNormalizedSignal, storeRawSignal } from "@/lib/broadcast/signal-store";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const { platform, since } = body;
    
    if (!platform) {
      return NextResponse.json(
        { error: "platform is required" },
        { status: 400 }
      );
    }
    
    // Scrape mentions
    const mentions = await scrapeMentions(platform as Platform, since);
    
    // Store raw signals
    for (const mention of mentions) {
      storeRawSignal(platform, mention);
    }
    
    // Normalize signals
    const normalized = batchNormalizeSignals(platform as Platform, mentions, "mention");
    
    // Store normalized signals
    for (const signal of normalized) {
      storeNormalizedSignal(signal);
    }
    
    return NextResponse.json({
      success: true,
      platform,
      mentions: {
        raw: mentions.length,
        normalized: normalized.length,
        items: normalized.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Mentions ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
