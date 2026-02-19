import { NextResponse } from "next/server";
import { cosCrews, ensureCosBound, getCosStatus } from "@/lib/cos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  ensureCosBound();
  return NextResponse.json({ ok: true, crews: cosCrews, status: getCosStatus() }, { headers: { "Cache-Control": "no-store" } });
}
