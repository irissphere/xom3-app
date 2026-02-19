// Broadcast Engine - Worker Stats API
// GET /api/broadcast/workers/stats - Get worker and queue stats

import { NextResponse } from "next/server";
import { getWorkerManager } from "@/lib/broadcast/queue/worker-manager";
import { getAllQueueStats } from "@/lib/broadcast/queue/queue-store";

export async function GET(req: Request) {
  try {
    const workerManager = getWorkerManager();
    const workerStats = workerManager.getStats();
    const queueStats = getAllQueueStats();
    
    return NextResponse.json({
      success: true,
      workers: workerStats,
      queues: queueStats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[Broadcast API] Worker stats error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
