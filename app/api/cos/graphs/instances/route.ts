import { NextResponse } from "next/server";
import { ensureCosGraphBound, listGraphInstances, getCosGraphStatus } from "@/lib/cos/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureCosGraphBound();
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(300, Number(limitParam) || 120)) : 120;
  const instances = listGraphInstances(limit);
  return NextResponse.json({ ok: true, instances, count: instances.length, status: getCosGraphStatus() }, { headers: { "Cache-Control": "no-store" } });
}
