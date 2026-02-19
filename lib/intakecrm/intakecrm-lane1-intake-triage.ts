import { Buffer } from "buffer";
import { emitSignal } from "@/lib/uoi/signals";
import { logEvent } from "@/lib/uoi/store";
import { createPost } from "@/lib/social/store";
import { emitPostCreated, emitPostScheduled } from "@/lib/social/signals";
import type { IntakeCrmActor } from "./intakecrm-tenant-boundary";
import type { IntakeCrmIntakePayload, IntakeCrmIntakeResult } from "./types";
import {
  computeDedupeKey,
  findIntakecrmLeadByDedupeKey,
  normalizeEmail,
  normalizePhone,
  upsertIntakecrmLead,
  addIntakecrmAuditEvent,
} from "./intakecrm-store";
import { createDefaultTasksForNewLead } from "./intakecrm-lane2-followups-tasks";

function normalizeText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function normalizeTags(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function stableLeadId(tenant: string, dedupeKey: string): string {
  // Deterministic enough for v1 (keeps duplicates from exploding the store)
  const base = `${tenant}:${dedupeKey}`.replace(/[^\w|:.-]/g, "");
  return `lead_${Buffer.from(base).toString("base64url").slice(0, 22)}`;
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

function maybeEnqueueSocialLoop(input: {
  tenant: string;
  leadId: string;
  leadName: string | null;
  source: string | null;
}) {
  const enabled = String(process.env.ENABLE_INTAKECRM_SOCIAL_LOOP || "").trim().toLowerCase() === "true";
  if (!enabled) return;

  const platform = (process.env.INTAKECRM_SOCIAL_PLATFORM || "linkedin").trim();
  const template =
    (process.env.INTAKECRM_SOCIAL_LEAD_CREATED_TEMPLATE || "").trim() ||
    "New intake received for {{tenant}}. Lead: {{leadName}} · {{leadId}}";

  const content = renderTemplate(template, {
    tenant: input.tenant,
    leadId: input.leadId,
    leadName: input.leadName || "Unknown",
    source: input.source || "unknown",
  });

  const scheduledAt = (process.env.INTAKECRM_SOCIAL_SCHEDULE_MINUTES || "").trim();
  const scheduleMinutes = scheduledAt ? Number(scheduledAt) : 0;
  const scheduledIso =
    Number.isFinite(scheduleMinutes) && scheduleMinutes > 0 ? new Date(Date.now() + scheduleMinutes * 60_000).toISOString() : undefined;

  const post = createPost({
    platform: platform as any,
    content,
    status: scheduledIso ? "scheduled" : "draft",
    scheduledAt: scheduledIso,
    clientId: input.tenant,
    clientName: input.tenant,
    campaignId: "intakecrm-lead-created",
    createdBy: "system",
  });

  emitPostCreated(post);
  if (post.status === "scheduled") emitPostScheduled(post);
}

export async function handleIntakecrmLane1Intake(input: {
  tenant: string;
  actor: IntakeCrmActor;
  payload: IntakeCrmIntakePayload;
}): Promise<IntakeCrmIntakeResult> {
  const tenant = input.tenant;
  const actor = input.actor;
  const payload = input.payload || ({} as any);

  const name = normalizeText(payload.name);
  const email = normalizeEmail(normalizeText(payload.email));
  const phone = normalizePhone(normalizeText(payload.phone));
  const source = normalizeText(payload.source);
  const assignedTo = normalizeText(payload.assignedTo);
  const tags = normalizeTags(payload.tags);
  const timestamp = Number.isFinite(payload.timestamp as any) ? Number(payload.timestamp) : Date.now();

  const dedupeKey = computeDedupeKey({ email, phone });
  if (dedupeKey === "e:|p:") {
    throw new Error("missing_contact");
  }

  const existing = await findIntakecrmLeadByDedupeKey(tenant, dedupeKey);
  const leadId = normalizeText(payload.leadId) || existing?.leadId || stableLeadId(tenant, dedupeKey);

  const isDuplicate = Boolean(existing && existing.leadId !== leadId);
  const isUpdate = Boolean(existing && existing.leadId === leadId);

  const posture = isDuplicate ? "duplicate" : isUpdate ? "updated" : "new";

  const lead = upsertIntakecrmLead({
    tenant,
    leadId,
    dedupeKey,
    name: name ?? existing?.name ?? null,
    email: email ?? existing?.email ?? null,
    phone: phone ?? existing?.phone ?? null,
    source: source ?? existing?.source ?? null,
    timestamp,
    posture,
    assignedTo: assignedTo ?? existing?.assignedTo ?? null,
    tags,
  });

  emitSignal({
    source: "intakecrm",
    type: "intakecrm.intake.received",
    priority: "low",
    payload: { tenant, leadId: lead.leadId, dedupeKey, source: lead.source, posture },
  });

  if (posture === "new") {
    emitSignal({
      source: "intakecrm",
      type: "intakecrm.lead.created",
      priority: "medium",
      payload: { tenant, leadId: lead.leadId },
    });
  } else if (posture === "updated") {
    emitSignal({
      source: "intakecrm",
      type: "intakecrm.lead.updated",
      priority: "low",
      payload: { tenant, leadId: lead.leadId },
    });
  } else if (posture === "duplicate") {
    emitSignal({
      source: "intakecrm",
      type: "intakecrm.lead.duplicate",
      priority: "low",
      payload: { tenant, leadId: lead.leadId },
    });
  }

  // Audit trail (domain-local + operator timeline)
  addIntakecrmAuditEvent({
    auditId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenant,
    actor,
    action: "intake_received",
    entity: { type: "lead", id: lead.leadId },
    at: new Date().toISOString(),
    payload: { posture, source: lead.source },
  });

  logEvent({
    type: "activation",
    source: actor.role === "agent" ? "agent" : "operator",
    description: `intakecrm intake: ${lead.name || lead.email || lead.phone || lead.leadId}`,
    metadata: { tenant, leadId: lead.leadId, posture },
  });

  const tasksCreated = posture === "new" ? createDefaultTasksForNewLead({ tenant, lead, actor }) : [];

  if (posture === "new") {
    maybeEnqueueSocialLoop({ tenant, leadId: lead.leadId, leadName: lead.name, source: lead.source });
  }

  return {
    ok: true,
    lead,
    action: posture === "new" ? "created" : posture === "updated" ? "updated" : "duplicate",
    tasksCreated,
  };
}
