import { NextResponse } from "next/server";
import { cosScenes, ensureCosBound, getCosStatus } from "@/lib/cos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  ensureCosBound();
  return NextResponse.json({ ok: true, scenes: cosScenes, status: getCosStatus() }, { headers: { "Cache-Control": "no-store" } });
}
