import { NextResponse } from "next/server";
import { getSystemSovereignLog, getSystemSovereignStatus } from "@/lib/system/system-sovereign";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam) || 60)) : 60;

  const status = getSystemSovereignStatus();
  const log = getSystemSovereignLog(limit);

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      ...status,
      log,
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
