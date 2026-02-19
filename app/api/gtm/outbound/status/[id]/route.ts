import { NextResponse } from "next/server";
import { getOutboundItemStatus } from "@/lib/gtm/outbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const item = getOutboundItemStatus(String(id || ""));
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, item }, { headers: { "Cache-Control": "no-store" } });
}
