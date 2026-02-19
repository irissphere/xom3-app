import { NextRequest, NextResponse } from "next/server";
import {
  dispatchMessage,
  getBroadcastLog,
  getBroadcastQueue,
  getBroadcastStatus,
  startBroadcastSovereign,
  flushBroadcastQueue,
} from "@/lib/broadcast/broadcast-sovereign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || "next";

    if (mode === "start") {
      startBroadcastSovereign(5000);
      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          status: getBroadcastStatus(),
          queue: getBroadcastQueue(80),
          log: getBroadcastLog(60),
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    if (mode === "flush") {
      const flushed = flushBroadcastQueue();
      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          flushed,
          status: getBroadcastStatus(),
          queue: getBroadcastQueue(80),
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    if (mode === "id" && body?.id) {
      const result = await dispatchMessage(String(body.id));
      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
          result,
          status: getBroadcastStatus(),
          queue: getBroadcastQueue(80),
          log: getBroadcastLog(60),
        },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      );
    }

    // Default: dispatch next queued message (if any)
    const next = getBroadcastQueue(500).items.find((m: any) => m.status === "queued");
    const result = next ? await dispatchMessage(next.id) : null;

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        result,
        status: getBroadcastStatus(),
        queue: getBroadcastQueue(80),
        log: getBroadcastLog(60),
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, timestamp: new Date().toISOString(), error: error?.message || "dispatch_failed" },
      { status: 500 }
    );
  }
}
