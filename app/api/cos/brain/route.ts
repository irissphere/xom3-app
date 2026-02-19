import { NextResponse } from "next/server";
import { ensureCosBrainBound, evaluateCosBrain, getBrainContext } from "@/lib/cos/brain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureCosBrainBound();
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh");
  if (refresh === "1") await evaluateCosBrain();
  return NextResponse.json({ ok: true, context: getBrainContext() }, { headers: { "Cache-Control": "no-store" } });
}
