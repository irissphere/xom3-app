import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const memory = await import("@/lib/constellation/memory");
  memory.ensureConstellationMemoryBound();

  return NextResponse.json(
    {
      sovereignPosture: memory.sovereignPostureMemory.getAll(),
      sovereignHealth: memory.sovereignHealthMemory.getAll(),
      events: memory.eventMemory.getAll(),
      reflexes: memory.reflexMemory.getAll(),
      rituals: memory.ritualMemory.getAll(),
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
