import { NextResponse } from "next/server";
import { ensureCosGraphBound, getGraphInstance } from "@/lib/cos/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  ensureCosGraphBound();
  const { id } = await ctx.params;
  const inst = getGraphInstance(String(id || ""));
  if (!inst) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, instance: inst }, { headers: { "Cache-Control": "no-store" } });
}
