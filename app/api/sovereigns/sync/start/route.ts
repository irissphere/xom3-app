import { NextResponse } from "next/server";
import { startSovereign, sovereigns } from "@/lib/sovereigns/registry";
import { getSyncPulseStatus, getSyncPulseLog } from "@/lib/sovereigns/sync-pulse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const intervalMs = typeof body?.intervalMs === "number" ? body.intervalMs : 5000;
  await startSovereign("sync", { intervalMs });

  return NextResponse.json(
    { ok: true, status: getSyncPulseStatus(), log: getSyncPulseLog(80) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  // Idempotent start via GET for quick cockpit ignition (truthful: does not restart if already running).
  await startSovereign("sync", { intervalMs: 5000 });
  return NextResponse.json(
    { ok: true, status: getSyncPulseStatus(), log: getSyncPulseLog(80) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
