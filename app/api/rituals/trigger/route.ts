import { NextResponse } from "next/server";
import { triggerRitual } from "@/lib/rituals/engine";
import { publish } from "@/lib/sovereigns/event-bus";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const ritualKey =
    typeof body?.ritualKey === "string"
      ? body.ritualKey
      : typeof body?.ritualId === "string"
        ? body.ritualId
        : null;
  if (!ritualKey) {
    return NextResponse.json({ ok: false, error: "ritualKey_required" }, { status: 400 });
  }

  const reason = typeof body?.reason === "string" ? body.reason : null;

  // Additive: emit an operator request signal (does not affect ritual logic).
  const sourceEvent = publish({
    sovereign: "cockpit",
    type: "operator.ritual.requested",
    severity: "info",
    payload: { ritualKey, reason },
    tags: ["operator", "ritual"],
  });

  const run = await triggerRitual(ritualKey, { source: { type: "operator", eventId: sourceEvent.id }, sourceEvent });
  if (run.status === "failed" && run.steps.length === 0) {
    return NextResponse.json({ ok: false, error: "ritual_not_found", run }, { status: 404 });
  }

  return NextResponse.json({ ok: true, run }, { headers: { "Cache-Control": "no-store" } });
}
