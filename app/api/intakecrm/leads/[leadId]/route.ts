import { NextResponse } from "next/server";
import { emitSignal } from "@/lib/uoi/signals";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getLeadById, updateLead, appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";
import { getTasksByLead } from "@/lib/intakecrm/tasks/intakecrm-task-store";
import type { LeadPosture } from "@/lib/intakecrm/intakecrm-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function normalizeTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function normalizePosture(v: unknown): LeadPosture | null {
  const s = normalizeText(v);
  if (!s) return null;
  const allowed: LeadPosture[] = ["new", "working", "closed"];
  return allowed.includes(s as LeadPosture) ? (s as LeadPosture) : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const lead = await getLeadById(c.tenant, leadId);
  if (!lead) return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404 });
  const tasks = getTasksByLead(c.tenant, leadId);
  return NextResponse.json({ ok: true, tenantId: c.tenant, lead, tasks }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(c.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const existing = await getLeadById(c.tenant, leadId);
  if (!existing) return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const posture = normalizePosture(body?.posture);
  const assignedTo = normalizeText(body?.assignedTo);
  const tags = normalizeTags(body?.tags);

  const name = normalizeText(body?.name);
  const email = normalizeText(body?.email);
  const phone = normalizeText(body?.phone);

  const validPostures: ("new" | "working" | "closed")[] = ["new", "working", "closed"];
  const postureValue = posture && validPostures.includes(posture as any) ? (posture as "new" | "working" | "closed") : existing.posture;

  const next = updateLead(c.tenant, leadId, {
    name: name ?? existing.name,
    email: email ?? existing.email,
    phone: phone ?? existing.phone,
    posture: postureValue,
    assignedTo: assignedTo ?? existing.assignedTo,
    tags: tags.length ? tags : existing.tags,
  });
  if (!next) return NextResponse.json({ ok: false, error: "lead_update_failed" }, { status: 500 });

  emitSignal({
    source: "intakecrm",
    type: "intakecrm.lead.patched",
    priority: "low",
    payload: { tenantId: c.tenant, leadId: next.leadId },
  });

  appendTimelineEvent(c.tenant, next.leadId, { type: "intakecrm.lead.updated", payload: { patched: true } });

  return NextResponse.json({ ok: true, tenantId: c.tenant, lead: next }, { headers: { "Cache-Control": "no-store" } });
}
