import { NextResponse } from "next/server";
import { appendExecution, guardrails, loadExecutions, loadState } from "@/lib/system/xom3-autonomous-store";
import { computeAdaptiveThresholds } from "@/app/xom3/autonomy/thresholds";

// STRIKE 12: execution channel (stubbed behavior, real logging + guardrails)
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const agent = String(body?.agent || "").trim();
  const action = String(body?.action || "").trim();
  const target = String(body?.target || "").trim();
  const reason = String(body?.reason || "").trim();
  const consensus = body?.consensus && typeof body.consensus === "object" ? body.consensus : undefined;

  if (!agent || !action || !target || !reason) {
    return NextResponse.json({ ok: false, error: "missing_agent_action_target_reason" }, { status: 400 });
  }

  const state = loadState();
  const recent = loadExecutions().slice(-200);

  const thresholds = computeAdaptiveThresholds({ executions: recent, log: [] });
  const g = guardrails(recent, { action, target }, { cooldownMs: thresholds.restartCooldownMs, conflictWindowMs: 10_000 });
  const executed = state.enabled && g.allowed;

  const entry = {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    agent,
    action,
    target,
    reason,
    executed,
    skipped: !executed,
    skipReason: executed ? null : (state.enabled ? g.reason || "blocked" : "autonomy_disabled"),
    consensus,
  };

  appendExecution(entry);

  return NextResponse.json(
    {
      ok: true,
      executed: entry.executed,
      skipped: entry.skipped,
      skipReason: entry.skipReason,
      entry,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
