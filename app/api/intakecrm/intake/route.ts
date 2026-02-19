import { NextResponse } from "next/server";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { findLeadByEmailOrPhone, createLead, updateLead, appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";
import { createDefaultTasksForLead } from "@/lib/intakecrm/tasks/create-default-tasks";
import { emitIntakecrmSignal } from "@/lib/intakecrm/intakecrm-signal-emitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : undefined;
}

function normalizeEmail(v: unknown): string | undefined {
  const s = normalizeText(v);
  return s ? s.toLowerCase() : undefined;
}

function normalizePhone(v: unknown): string | undefined {
  const s = normalizeText(v);
  if (!s) return undefined;
  const digits = s.replace(/[^\d+]/g, "");
  return digits || undefined;
}

export async function POST(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(ctx.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const tenantId = ctx.tenant;
    const name = normalizeText(body?.name);
    const email = normalizeEmail(body?.email);
    const phone = normalizePhone(body?.phone);
    const source = normalizeText(body?.source);
    const tags = Array.isArray(body?.tags) ? body.tags : [];

    if (!email && !phone) return NextResponse.json({ ok: false, error: "missing_contact" }, { status: 400 });

    const existing = await findLeadByEmailOrPhone(tenantId, email, phone);
    const isCreate = !existing;

    const lead = isCreate
      ? createLead(tenantId, { name, email, phone, source, posture: "new", tags })
      : updateLead(tenantId, existing.leadId, {
          name: name ?? existing.name,
          email: email ?? existing.email,
          phone: phone ?? existing.phone,
          source: source ?? existing.source,
          tags: tags.length ? Array.from(new Set([...(existing.tags || []), ...tags])) : existing.tags,
        })!;

    // Timeline: intake + lead created/updated
    appendTimelineEvent(tenantId, lead.leadId, { type: "intakecrm.intake.received", payload: { source: lead.source } });
    appendTimelineEvent(tenantId, lead.leadId, { type: isCreate ? "intakecrm.lead.created" : "intakecrm.lead.updated", payload: {} });

    // Signals
    emitIntakecrmSignal({ tenantId, type: "intakecrm.intake.received", priority: "low", payload: { leadId: lead.leadId, source: lead.source } });
    emitIntakecrmSignal({
      tenantId,
      type: isCreate ? "intakecrm.lead.created" : "intakecrm.lead.updated",
      priority: isCreate ? "medium" : "low",
      payload: { leadId: lead.leadId },
    });

    const tasksCreated = isCreate ? createDefaultTasksForLead({ tenantId, lead }) : [];

    return NextResponse.json(
      {
        ok: true,
        tenantId,
        lead,
        action: isCreate ? "created" : "updated",
        tasksCreated,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "intake_failed";
    const status = msg === "missing_contact" ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
