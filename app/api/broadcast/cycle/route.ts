// Broadcast Engine - Complete Cycle API
// POST /api/broadcast/cycle - Run complete broadcast cycle

import { NextResponse } from "next/server";
import { runBroadcastCycle } from "@/lib/broadcast/orchestrator";
import { emitSignal } from "@/lib/uoi/signals";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const skipSteps = body.skipSteps || []; // ["scraping", "leadDetection", "funnelIntegration"]
    
    const cycleStart = Date.now();
    
    // Run complete cycle
    const results = await runBroadcastCycle();
    
    const cycleTime = Date.now() - cycleStart;
    
    // Emit signal
    emitSignal({
      source: "broadcast_engine",
      type: "cycle_completed",
      payload: {
        cycleTime,
        scraping: results.scraping,
        leadDetection: {
          count: results.leadDetection.length
        },
        funnelIntegration: results.funnelIntegration
      },
      priority: "medium"
    });
    
    return NextResponse.json({
      success: true,
      cycle: {
        timestamp: new Date().toISOString(),
        cycleTime,
        results
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] Cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Return cycle status/history
    // In production, fetch from database
    
    return NextResponse.json({
      success: true,
      status: "ready",
      lastCycle: null,
      nextCycle: null
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get cycle status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
