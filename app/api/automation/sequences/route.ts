import { NextResponse } from "next/server";
import { emitSignal } from "@/lib/uoi/signals";
import { listSequences, createSequence, updateSequence, type AutomationStep } from "@/lib/automation/sequence-store";
import { getTenantKey } from "@/lib/system/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTenantId(req: Request): string {
  const url = new URL(req.url);
  return url.searchParams.get("tenant") || req.headers.get("x-tenant-id") || req.headers.get("x-xom3-tenant") || getTenantKey();
}

function normalizeText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function normalizeSteps(v: unknown): AutomationStep[] {
  if (!Array.isArray(v)) return [];
  const steps: AutomationStep[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const kind = (raw as any).kind;
    if (kind === "wait") {
      const minutes = Number((raw as any).minutes);
      if (Number.isFinite(minutes) && minutes > 0 && minutes <= 60 * 24 * 30) {
        steps.push({ kind: "wait", minutes: Math.round(minutes) });
      }
    } else if (kind === "send_email") {
      const subject = normalizeText((raw as any).subject) || "";
      const body = normalizeText((raw as any).body) || "";
      if (subject || body) steps.push({ kind: "send_email", subject, body });
    } else if (kind === "send_sms") {
      const body = normalizeText((raw as any).body) || "";
      if (body) steps.push({ kind: "send_sms", body });
    }
  }
  return steps;
}

export async function GET(req: Request) {
  const tenantId = resolveTenantId(req);
  const items = listSequences(tenantId);
  return NextResponse.json({ ok: true, tenantId, items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const tenantId = resolveTenantId(req);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const sequenceId = normalizeText(body?.sequenceId);
  const name = normalizeText(body?.name);
  const triggerKind = normalizeText(body?.trigger?.kind) as "lead_created" | "lead_status_changed" | null;
  const enabled = Boolean(body?.enabled);
  const steps = normalizeSteps(body?.steps);

  if (!name) return NextResponse.json({ ok: false, error: "missing_name" }, { status: 400 });
  if (!triggerKind || (triggerKind !== "lead_created" && triggerKind !== "lead_status_changed")) {
    return NextResponse.json({ ok: false, error: "invalid_trigger" }, { status: 400 });
  }
  if (steps.length === 0) return NextResponse.json({ ok: false, error: "missing_steps" }, { status: 400 });

  const trigger = { kind: triggerKind };

  const seq = sequenceId
    ? updateSequence(tenantId, sequenceId, { name, trigger, enabled, steps })
    : createSequence(tenantId, { name, trigger, enabled, steps });

  if (!seq) return NextResponse.json({ ok: false, error: "sequence_save_failed" }, { status: 500 });

  emitSignal({
    source: "automation",
    type: "automation.sequence.saved",
    priority: "low",
    payload: { tenantId, sequenceId: seq.sequenceId, enabled: seq.enabled },
  });

  return NextResponse.json({ ok: true, tenantId, sequence: seq }, { headers: { "Cache-Control": "no-store" } });
}

















