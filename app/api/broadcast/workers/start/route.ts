// Broadcast Engine - Start Workers API
// POST /api/broadcast/workers/start - Start all workers

import { NextResponse } from "next/server";
import { getWorkerManager } from "@/lib/broadcast/queue/worker-manager";

export async function POST(req: Request) {
  try {
    const workerManager = getWorkerManager();
    await workerManager.startAll();
    
    const stats = workerManager.getStats();
    
    return NextResponse.json({
      success: true,
      message: "All workers started",
      workers: stats
    });
  } catch (error: any) {
    console.error("[Broadcast API] Start workers error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
