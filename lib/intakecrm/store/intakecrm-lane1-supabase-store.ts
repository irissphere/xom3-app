import type { IntakeCrmAuditEvent, IntakeCrmLead, IntakeCrmTask, IntakeCrmTaskStatus } from "../types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const SUPABASE_TABLES = {
  leads: "intakecrm_leads",
  tasks: "intakecrm_tasks",
  audit: "intakecrm_audit",
};

function supabaseEnabled() {
  return String(process.env.INTAKECRM_SUPABASE_ENABLED || "").trim().toLowerCase() === "true";
}

export function intakecrmSupabaseEnabled() {
  return supabaseEnabled();
}

function mapLeadPayload(lead: IntakeCrmLead) {
  return {
    lead_id: lead.leadId,
    tenant: lead.tenant,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    posture: lead.posture,
    assigned_to: lead.assignedTo,
    tags: lead.tags || [],
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
    last_intake_at: lead.lastIntakeAt,
    dedupe_key: lead.dedupeKey,
    intake_timestamp: lead.timestamp,
  };
}

function mapLeadRow(row: any): IntakeCrmLead {
  return {
    leadId: row.lead_id,
    tenant: row.tenant,
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    source: row.source ?? null,
    posture: row.posture,
    assignedTo: row.assigned_to ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastIntakeAt: row.last_intake_at,
    dedupeKey: row.dedupe_key,
    timestamp: typeof row.intake_timestamp === "number" ? row.intake_timestamp : Number(row.intake_timestamp) || Date.now(),
  };
}

function mapTaskPayload(task: IntakeCrmTask) {
  return {
    task_id: task.taskId,
    tenant: task.tenant,
    lead_id: task.leadId,
    type: task.type,
    due_at: task.dueAt,
    assigned_to: task.assignedTo,
    status: task.status,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
    overdue_at: task.overdueAt,
    overdue_signal_at: task.overdueSignalAt,
    notes: task.notes,
  };
}

function mapTaskRow(row: any): IntakeCrmTask {
  return {
    taskId: row.task_id,
    tenant: row.tenant,
    leadId: row.lead_id,
    type: row.type,
    dueAt: row.due_at,
    assignedTo: row.assigned_to ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    overdueAt: row.overdue_at ?? null,
    overdueSignalAt: row.overdue_signal_at ?? null,
    notes: row.notes ?? null,
  };
}

function mapAuditPayload(event: IntakeCrmAuditEvent) {
  return {
    audit_id: event.auditId,
    tenant: event.tenant,
    actor_role: event.actor.role,
    actor_id: event.actor.id,
    actor_label: event.actor.label,
    action: event.action,
    entity_type: event.entity.type,
    entity_id: event.entity.id,
    at: event.at,
    payload: event.payload || null,
  };
}

function mapAuditRow(row: any): IntakeCrmAuditEvent {
  return {
    auditId: row.audit_id,
    tenant: row.tenant,
    actor: {
      role: row.actor_role,
      id: row.actor_id ?? null,
      label: row.actor_label ?? null,
    },
    action: row.action,
    entity: {
      type: row.entity_type,
      id: row.entity_id,
    },
    at: row.at,
    payload: row.payload ?? undefined,
  };
}

export async function listIntakecrmLeadsSupabase(tenant: string): Promise<IntakeCrmLead[]> {
  if (!supabaseEnabled()) return [];
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.leads)
      .select("*")
      .eq("tenant", tenant)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) {
      console.warn("[INTAKECRM] Supabase lead list failed:", error.message);
      return [];
    }
    return Array.isArray(data) ? data.map(mapLeadRow) : [];
  } catch (err) {
    console.warn("[INTAKECRM] Supabase lead list error:", err);
    return [];
  }
}

export async function getIntakecrmLeadSupabase(tenant: string, leadId: string): Promise<IntakeCrmLead | null> {
  if (!supabaseEnabled()) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.leads)
      .select("*")
      .eq("tenant", tenant)
      .eq("lead_id", leadId)
      .maybeSingle();
    if (error) {
      console.warn("[INTAKECRM] Supabase lead get failed:", error.message);
      return null;
    }
    return data ? mapLeadRow(data) : null;
  } catch (err) {
    console.warn("[INTAKECRM] Supabase lead get error:", err);
    return null;
  }
}

export async function findIntakecrmLeadByDedupeKeySupabase(
  tenant: string,
  dedupeKey: string
): Promise<IntakeCrmLead | null> {
  if (!supabaseEnabled()) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.leads)
      .select("*")
      .eq("tenant", tenant)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (error) {
      console.warn("[INTAKECRM] Supabase lead dedupe lookup failed:", error.message);
      return null;
    }
    return data ? mapLeadRow(data) : null;
  } catch (err) {
    console.warn("[INTAKECRM] Supabase lead dedupe lookup error:", err);
    return null;
  }
}

export async function listIntakecrmTasksSupabase(
  tenant: string,
  filters?: { leadId?: string; status?: IntakeCrmTaskStatus }
): Promise<IntakeCrmTask[]> {
  if (!supabaseEnabled()) return [];
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    let query = supabase.from(SUPABASE_TABLES.tasks).select("*").eq("tenant", tenant);
    if (filters?.leadId) {
      query = query.eq("lead_id", filters.leadId);
    }
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    const { data, error } = await query.order("due_at", { ascending: true }).limit(500);
    if (error) {
      console.warn("[INTAKECRM] Supabase task list failed:", error.message);
      return [];
    }
    return Array.isArray(data) ? data.map(mapTaskRow) : [];
  } catch (err) {
    console.warn("[INTAKECRM] Supabase task list error:", err);
    return [];
  }
}

export async function listIntakecrmAuditSupabase(tenant: string, limit: number): Promise<IntakeCrmAuditEvent[]> {
  if (!supabaseEnabled()) return [];
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from(SUPABASE_TABLES.audit)
      .select("*")
      .eq("tenant", tenant)
      .order("at", { ascending: false })
      .limit(limit);
    if (error) {
      console.warn("[INTAKECRM] Supabase audit list failed:", error.message);
      return [];
    }
    return Array.isArray(data) ? data.map(mapAuditRow) : [];
  } catch (err) {
    console.warn("[INTAKECRM] Supabase audit list error:", err);
    return [];
  }
}

export async function upsertIntakecrmLeadSupabase(lead: IntakeCrmLead) {
  if (!supabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.leads)
      .upsert(mapLeadPayload(lead), { onConflict: "lead_id" });
    if (error) {
      console.warn("[INTAKECRM] Supabase lead upsert failed:", error.message);
    }
  } catch (err) {
    console.warn("[INTAKECRM] Supabase lead upsert error:", err);
  }
}

export async function upsertIntakecrmTaskSupabase(task: IntakeCrmTask) {
  if (!supabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from(SUPABASE_TABLES.tasks)
      .upsert(mapTaskPayload(task), { onConflict: "task_id" });
    if (error) {
      console.warn("[INTAKECRM] Supabase task upsert failed:", error.message);
    }
  } catch (err) {
    console.warn("[INTAKECRM] Supabase task upsert error:", err);
  }
}

export async function patchIntakecrmTaskSupabase(task: IntakeCrmTask) {
  if (!supabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const payload = mapTaskPayload(task);

    const { error } = await supabase
      .from(SUPABASE_TABLES.tasks)
      .update(payload)
      .eq("task_id", task.taskId);
    if (error) {
      console.warn("[INTAKECRM] Supabase task patch failed:", error.message);
    }
  } catch (err) {
    console.warn("[INTAKECRM] Supabase task patch error:", err);
  }
}

export async function insertIntakecrmAuditSupabase(event: IntakeCrmAuditEvent) {
  if (!supabaseEnabled()) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  try {
    const { error } = await supabase.from(SUPABASE_TABLES.audit).insert(mapAuditPayload(event));
    if (error) {
      console.warn("[INTAKECRM] Supabase audit insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[INTAKECRM] Supabase audit insert error:", err);
  }
}
