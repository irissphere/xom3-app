import { NextResponse } from "next/server";
import { getRitualRuns } from "@/lib/rituals/engine";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam) || 60)) : 60;

  return NextResponse.json(
    { ok: true, runs: getRitualRuns(limit) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
