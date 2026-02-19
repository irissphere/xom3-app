import { NextResponse } from "next/server";
import { getSyncPulseStatus, getSyncPulseLog } from "@/lib/sovereigns/sync-pulse";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, status: getSyncPulseStatus(), log: getSyncPulseLog(120) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
