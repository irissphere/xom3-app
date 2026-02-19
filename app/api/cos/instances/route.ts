import { NextResponse } from "next/server";
import { ensureCosBound, listSceneInstances, getCosStatus } from "@/lib/cos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureCosBound();
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(300, Number(limitParam) || 120)) : 120;
  const instances = listSceneInstances(limit);
  return NextResponse.json({ ok: true, instances, count: instances.length, status: getCosStatus() }, { headers: { "Cache-Control": "no-store" } });
}
