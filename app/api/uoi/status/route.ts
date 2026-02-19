import { NextResponse } from "next/server";
import {
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

export async function GET() {
  const startInfo = getUoiStartInfo();
  const eventLoopStatus = getEventLoopStatus();
  const signalQueue = getSignalQueueState();
  const directiveQueue = getDirectiveQueueState();
  const heartbeatLog = getHeartbeatLog(60);

  return NextResponse.json(
    {
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
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}
