// Broadcast Engine - DMs Ingestion API
// POST /api/broadcast/ingest/dms - Scrape and ingest DMs

import { NextResponse } from "next/server";
import { scrapeDMs } from "@/lib/broadcast/scraping-engine";
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
    
    // Scrape DMs
    const dms = await scrapeDMs(platform as Platform, since);
    
    // Store raw signals
    for (const dm of dms) {
      storeRawSignal(platform, dm);
    }
    
    // Normalize signals
    const normalized = batchNormalizeSignals(platform as Platform, dms, "dm");
    
    // Store normalized signals
    for (const signal of normalized) {
      storeNormalizedSignal(signal);
    }
    
    return NextResponse.json({
      success: true,
      platform,
      dms: {
        raw: dms.length,
        normalized: normalized.length,
        items: normalized.slice(0, 50)
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] DMs ingestion error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
