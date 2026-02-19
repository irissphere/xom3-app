import { NextResponse } from "next/server";
import { flushSignals, flushDirectives, getSignalQueueState, getDirectiveQueueState } from "@/lib/uoi";

export const dynamic = "force-dynamic";

export async function POST() {
  const flushedSignals = flushSignals();
  const flushedDirectives = flushDirectives();

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      flushed: {
        signals: flushedSignals,
        directives: flushedDirectives,
      },
      queues: {
        signals: getSignalQueueState(),
        directives: getDirectiveQueueState(),
      },
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
