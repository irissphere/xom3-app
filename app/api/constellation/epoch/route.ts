import { NextResponse } from "next/server";
import { getCurrentEpoch, updateEpoch } from "@/lib/constellation/epochs";

export const dynamic = "force-dynamic";

export async function GET() {
  // Evaluate on read so the epoch stays fresh.
  const snapshot = updateEpoch("api_read");
  return NextResponse.json(
    { ok: true, ...snapshot, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
