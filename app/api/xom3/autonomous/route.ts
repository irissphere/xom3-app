import { NextResponse } from "next/server";
import {
  appendLog,
  deriveAgentModesFromLog,
  loadExecutions,
  loadLog,
  loadState,
  saveState,
  type AutonomousState,
  type AutonomousLogEntry,
} from "@/lib/system/xom3-autonomous-store";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get("limit") || "50")));

  const state = loadState();
  const log = loadLog().slice(-limit);
  const executions = loadExecutions().slice(-limit);

  return NextResponse.json(
    {
      ok: true,
      enabled: state.enabled,
      updatedAt: state.updatedAt,
      log,
      executions,
      agents: deriveAgentModesFromLog(log, state.enabled),
    },
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

  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "expected_enabled_boolean" }, { status: 400 });
  }

  const next: AutonomousState = { enabled, updatedAt: new Date().toISOString() };
  saveState(next);

  return NextResponse.json({ ok: true, enabled: next.enabled, updatedAt: next.updatedAt }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const agent = String(body?.agent || "").trim();
  const action = String(body?.action || "").trim();
  const reason = String(body?.reason || "").trim();
  const kind = String(body?.kind || "proposal").trim();
  const context = body?.context && typeof body.context === "object" ? body.context : undefined;

  if (!agent || !action || !reason) {
    return NextResponse.json({ ok: false, error: "missing_agent_action_reason" }, { status: 400 });
  }

  const entry: AutonomousLogEntry = {
    id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    agent,
    kind: kind === "report" ? "report" : "proposal",
    action,
    reason,
    context,
  };

  appendLog(entry);
  return NextResponse.json({ ok: true, entry }, { headers: { "Cache-Control": "no-store" } });
}
