import { NextResponse } from "next/server";
import { ensureCosGraphBound, getCosGraphStatus, cosSceneGraphs } from "@/lib/cos/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  ensureCosGraphBound();
  return NextResponse.json({ ok: true, graphs: cosSceneGraphs, status: getCosGraphStatus() }, { headers: { "Cache-Control": "no-store" } });
}
