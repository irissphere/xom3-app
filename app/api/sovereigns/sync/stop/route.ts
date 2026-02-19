import { NextResponse } from "next/server";
import { sovereigns } from "@/lib/sovereigns/registry";
import { getSyncPulseStatus, getSyncPulseLog } from "@/lib/sovereigns/sync-pulse";

export const dynamic = "force-dynamic";

export async function POST() {
  await sovereigns.sync.stop();
  return NextResponse.json(
    { ok: true, status: getSyncPulseStatus(), log: getSyncPulseLog(80) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
