import { NextResponse } from "next/server";
import { publish } from "@/lib/sovereigns/event-bus";
import { ensureCosGraphBound, startGraph } from "@/lib/cos/graph";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  ensureCosGraphBound();
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const mode = String(body?.mode || "event");
  const graphId = typeof body?.graphId === "string" ? body.graphId : null;
  const type = String(body?.type || "");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

  if (mode === "graph") {
    if (!graphId) return NextResponse.json({ ok: false, error: "graphId_required" }, { status: 400 });
    const inst = await startGraph(graphId, { subject: payload?.subject, flags: payload?.flags });
    return NextResponse.json({ ok: true, instance: inst }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!type) return NextResponse.json({ ok: false, error: "type_required" }, { status: 400 });
  const evt = publish({ sovereign: "cockpit", type, severity: "info", payload, tags: ["cos", "graph", "trigger"] });
  return NextResponse.json({ ok: true, event: evt }, { headers: { "Cache-Control": "no-store" } });
}
