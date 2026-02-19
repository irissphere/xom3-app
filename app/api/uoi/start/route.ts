import { NextResponse } from "next/server";
import {
  ensureUoiStarted,
  getEventLoopStatus,
  getHeartbeatLog,
  getUoiStartInfo,
  getSignalQueueState,
  getDirectiveQueueState,
} from "@/lib/uoi";

export const dynamic = "force-dynamic";

function buildPosture(input: { running: boolean; lastError: string | null }) {
  if (input.lastError) return "error";
  if (input.running) return "running";
  return "idle";
}

function buildStatus() {
  const startInfo = getUoiStartInfo();
  const eventLoopStatus = getEventLoopStatus();
  const signalQueue = getSignalQueueState();
  const directiveQueue = getDirectiveQueueState();
  const heartbeatLog = getHeartbeatLog(60);

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    posture: buildPosture({
      running: eventLoopStatus.running,
      lastError: eventLoopStatus.lastError,
    }),
    startInfo,
    eventLoopStatus,
    queues: {
      signals: signalQueue,
      directives: directiveQueue,
    },
    heartbeatLog,
    lastTick: eventLoopStatus.lastTickAt,
  };
}

export async function POST() {
  try {
    ensureUoiStarted();
    return NextResponse.json(buildStatus(), {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error?.message || "Failed to start UOI",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(buildStatus(), {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
