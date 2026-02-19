import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const memory = await import("@/lib/constellation/memory");
  const { runPredictiveEngine } = await import("@/lib/constellation/prediction");

  const signals = await runPredictiveEngine({
    sovereignHealth: memory.sovereignHealthMemory.getAll(),
    sovereignPosture: memory.sovereignPostureMemory.getAll(),
  });

  return NextResponse.json(
    { signals, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
