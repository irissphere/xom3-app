import { NextResponse } from "next/server";
import { enqueueOutboundItem } from "@/lib/gtm/outbound";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  try {
    const result = enqueueOutboundItem(body);
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "enqueue_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}
