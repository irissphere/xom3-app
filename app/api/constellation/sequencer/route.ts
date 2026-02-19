import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const memory = await import("@/lib/constellation/memory");
  const { buildTimeline, buildPlaybackFrames } = await import("@/lib/constellation/sequencer");

  const snapshot = {
    sovereignPosture: memory.sovereignPostureMemory.getAll(),
    sovereignHealth: memory.sovereignHealthMemory.getAll(),
    events: memory.eventMemory.getAll(),
    reflexes: memory.reflexMemory.getAll(),
    rituals: memory.ritualMemory.getAll(),
  };

  const timeline = buildTimeline(snapshot as any);
  const frames = buildPlaybackFrames(timeline);

  return NextResponse.json(
    { frames, frameCount: frames.length, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
