import { NextResponse } from "next/server";
import { ensureGtmFunnelsBound, getFunnelEntityState } from "@/lib/gtm/funnels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ entityId: string }> }) {
  ensureGtmFunnelsBound();
  const { entityId } = await ctx.params;
  const url = new URL(req.url);
  const funnelId = url.searchParams.get("funnelId") || undefined;
  const state = getFunnelEntityState(String(entityId || ""), funnelId);
  if (!state) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, state }, { headers: { "Cache-Control": "no-store" } });
}
