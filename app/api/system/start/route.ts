import { NextResponse } from "next/server";
import { getSystemSovereignLog, getSystemSovereignStatus, startSystemSovereign } from "@/lib/system/system-sovereign";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    startSystemSovereign(5000);
    const status = getSystemSovereignStatus();
    const log = getSystemSovereignLog(60);
    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        ...status,
        log,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, timestamp: new Date().toISOString(), error: error?.message || "Failed to start System Sovereign" },
      { status: 500 }
    );
  }
}
