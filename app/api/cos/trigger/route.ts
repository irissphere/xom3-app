import { NextResponse } from "next/server";
import { publish } from "@/lib/sovereigns/event-bus";
import { ensureCosBound, startScene } from "@/lib/cos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  ensureCosBound();
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const mode = String(body?.mode || "event");
  const type = String(body?.type || "");
  const sceneId = typeof body?.sceneId === "string" ? body.sceneId : null;
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

  if (mode === "scene") {
    if (!sceneId) return NextResponse.json({ ok: false, error: "sceneId_required" }, { status: 400 });
    const inst = await startScene(sceneId, { sourceEvent: { type: "cos.manual.scene", payload } });
    return NextResponse.json({ ok: true, instance: inst }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!type) return NextResponse.json({ ok: false, error: "type_required" }, { status: 400 });

  const evt = publish({
    sovereign: "cockpit",
    type,
    severity: "info",
    payload,
    tags: ["cos", "trigger"],
  });

  return NextResponse.json({ ok: true, event: evt }, { headers: { "Cache-Control": "no-store" } });
}
