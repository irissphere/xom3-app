import { NextResponse } from "next/server";
import { ensureCosBound, getSceneInstance, advanceSceneInstance } from "@/lib/cos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  ensureCosBound();
  const { id } = await ctx.params;
  const inst = getSceneInstance(String(id || ""));
  if (!inst) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, instance: inst }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  ensureCosBound();
  const { id } = await ctx.params;
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (body?.action === "advance") {
    const next = await advanceSceneInstance(String(id || ""));
    return NextResponse.json({ ok: true, instance: next }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: false, error: "unsupported_action" }, { status: 400 });
}
