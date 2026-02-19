import { NextResponse } from "next/server";
import { getRecentOutboundItems } from "@/lib/gtm/outbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(200, Number(limitParam) || 50)) : 50;

  const items = getRecentOutboundItems(limit);
  return NextResponse.json({ ok: true, items, count: items.length }, { headers: { "Cache-Control": "no-store" } });
}
