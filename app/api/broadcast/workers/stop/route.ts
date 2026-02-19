// Broadcast Engine - Stop Workers API
// POST /api/broadcast/workers/stop - Stop all workers

import { NextResponse } from "next/server";
import { getWorkerManager } from "@/lib/broadcast/queue/worker-manager";

export async function POST(req: Request) {
  try {
    const workerManager = getWorkerManager();
    await workerManager.stopAll();
    
    return NextResponse.json({
      success: true,
      message: "All workers stopped"
    });
  } catch (error: any) {
    console.error("[Broadcast API] Stop workers error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
