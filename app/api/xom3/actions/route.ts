import { NextResponse } from "next/server";

const OPERATOR_ACTIONS = [
  "refresh_all",
  "reset_errors",
  "restart_workflows",
  "restart_scrapers",
  "flush_pipeline",
  "toggle_autonomous_mode",
  "broadcast_command",
  "ping_sovereigns",
  "ping_agents",
  // STRIKE 8: sovereign-scoped verbs
  "sovereign_status",
  "restart_sovereign",
  "flush_sovereign",
  // STRIKE 14: meta-commands (advisory; compute client-side for now)
  "autonomy_meta",
  // STRIKE 15: orchestration commands (advisory; compute client-side for now)
  "orchestration",
] as const;

type OperatorAction = (typeof OPERATOR_ACTIONS)[number];

// STRIKE 7: verbs first, behavior later.
export async function GET() {
  return NextResponse.json(
    { ok: true, actions: OPERATOR_ACTIONS },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action || "").trim();
  const payload = body?.payload ?? null;

  if (!action) {
    return NextResponse.json({ ok: false, error: "missing_action" }, { status: 400 });
  }

  const recognized = (OPERATOR_ACTIONS as readonly string[]).includes(action);

  // NOTE: No destructive behavior is implemented in Strike 7.
  // This endpoint only acknowledges operator verbs and returns a structured response.
  const response = {
    ok: true,
    action: action as OperatorAction | string,
    recognized,
    accepted: true,
    message: recognized
      ? `Action accepted: ${action}`
      : `Action accepted (unrecognized verb): ${action}`,
    payloadEcho: payload,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}
