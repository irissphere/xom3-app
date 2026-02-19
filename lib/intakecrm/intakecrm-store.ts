import type { IntakeCrmAuditEvent, IntakeCrmLead, IntakeCrmTask, IntakeCrmTaskStatus, IntakeCrmTaskType } from "./types";
import {
  intakecrmSupabaseEnabled,
  listIntakecrmAuditSupabase,
  listIntakecrmLeadsSupabase,
  listIntakecrmTasksSupabase,
  getIntakecrmLeadSupabase,
  findIntakecrmLeadByDedupeKeySupabase,
  insertIntakecrmAuditSupabase,
  patchIntakecrmTaskSupabase,
  upsertIntakecrmLeadSupabase,
  upsertIntakecrmTaskSupabase,
} from "./store/intakecrm-lane1-supabase-store";

type GlobalIntakecrmStore = {
  __xom3_intakecrm_leads__?: IntakeCrmLead[];
  __xom3_intakecrm_tasks__?: IntakeCrmTask[];
  __xom3_intakecrm_audit__?: IntakeCrmAuditEvent[];
};

function g(): GlobalIntakecrmStore {
  return globalThis as any;
}

export const intakecrmLeads: IntakeCrmLead[] = (g().__xom3_intakecrm_leads__ = g().__xom3_intakecrm_leads__ || []);
export const intakecrmTasks: IntakeCrmTask[] = (g().__xom3_intakecrm_tasks__ = g().__xom3_intakecrm_tasks__ || []);
export const intakecrmAudit: IntakeCrmAuditEvent[] = (g().__xom3_intakecrm_audit__ = g().__xom3_intakecrm_audit__ || []);

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeEmail(email: string | null): string | null {
  const s = (email || "").trim().toLowerCase();
  return s ? s : null;
}

export function normalizePhone(phone: string | null): string | null {
  const raw = (phone || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.length ? digits : null;
}

export function computeDedupeKey(input: { email: string | null; phone: string | null }): string {
  const e = normalizeEmail(input.email);
  const p = normalizePhone(input.phone);
  return `e:${e || ""}|p:${p || ""}`;
}

export async function listIntakecrmLeads(tenant: string): Promise<IntakeCrmLead[]> {
  if (intakecrmSupabaseEnabled()) {
    const rows = await listIntakecrmLeadsSupabase(tenant);
    if (rows.length) return rows;
  }
  return intakecrmLeads.filter((l) => l.tenant === tenant);
}

export async function getIntakecrmLead(tenant: string, leadId: string): Promise<IntakeCrmLead | null> {
  if (intakecrmSupabaseEnabled()) {
    const row = await getIntakecrmLeadSupabase(tenant, leadId);
    if (row) return row;
  }
  return intakecrmLeads.find((l) => l.tenant === tenant && l.leadId === leadId) || null;
}

export async function findIntakecrmLeadByDedupeKey(tenant: string, dedupeKey: string): Promise<IntakeCrmLead | null> {
  if (intakecrmSupabaseEnabled()) {
    const row = await findIntakecrmLeadByDedupeKeySupabase(tenant, dedupeKey);
    if (row) return row;
  }
  return intakecrmLeads.find((l) => l.tenant === tenant && l.dedupeKey === dedupeKey) || null;
}

export function upsertIntakecrmLead(input: {
  tenant: string;
  dedupeKey: string;
  leadId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  timestamp: number;
  assignedTo: string | null;
  tags: string[];
  posture: IntakeCrmLead["posture"];
  createdAt?: string;
  updatedAt?: string;
}): IntakeCrmLead {
  const existingIdx = intakecrmLeads.findIndex((l) => l.tenant === input.tenant && l.leadId === input.leadId);
  const now = nowIso();

  if (existingIdx >= 0) {
    const prev = intakecrmLeads[existingIdx]!;
    const next: IntakeCrmLead = {
      ...prev,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: input.source,
      timestamp: input.timestamp,
      posture: input.posture,
      assignedTo: input.assignedTo,
      tags: Array.from(new Set([...(prev.tags || []), ...(input.tags || [])])).filter(Boolean),
      dedupeKey: input.dedupeKey || prev.dedupeKey,
      updatedAt: now,
      lastIntakeAt: now,
    };
    intakecrmLeads.splice(existingIdx, 1, next);
    if (intakecrmSupabaseEnabled()) {
      void upsertIntakecrmLeadSupabase(next);
    }
    return next;
  }

  const lead: IntakeCrmLead = {
    leadId: input.leadId,
    tenant: input.tenant,
    name: input.name,
    email: input.email,
    phone: input.phone,
    source: input.source,
    timestamp: input.timestamp,
    posture: input.posture,
    assignedTo: input.assignedTo,
    tags: Array.from(new Set(input.tags || [])).filter(Boolean),
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
    lastIntakeAt: now,
    dedupeKey: input.dedupeKey,
  };

  intakecrmLeads.unshift(lead);
  if (intakecrmSupabaseEnabled()) {
    void upsertIntakecrmLeadSupabase(lead);
  }
  return lead;
}

export async function listIntakecrmTasks(
  tenant: string,
  filters?: { leadId?: string; status?: IntakeCrmTaskStatus }
): Promise<IntakeCrmTask[]> {
  if (intakecrmSupabaseEnabled()) {
    const rows = await listIntakecrmTasksSupabase(tenant, filters);
    if (rows.length) return rows;
  }
  return intakecrmTasks
    .filter((t) => t.tenant === tenant)
    .filter((t) => (filters?.leadId ? t.leadId === filters.leadId : true))
    .filter((t) => (filters?.status ? t.status === filters.status : true))
    .slice()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export function getIntakecrmTask(tenant: string, taskId: string): IntakeCrmTask | null {
  return intakecrmTasks.find((t) => t.tenant === tenant && t.taskId === taskId) || null;
}

export function createIntakecrmTask(input: {
  tenant: string;
  leadId: string;
  type: IntakeCrmTaskType;
  dueAt: string;
  assignedTo: string | null;
  notes?: string | null;
}): IntakeCrmTask {
  const now = nowIso();
  const task: IntakeCrmTask = {
    taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenant: input.tenant,
    leadId: input.leadId,
    type: input.type,
    dueAt: input.dueAt,
    assignedTo: input.assignedTo,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    overdueAt: null,
    overdueSignalAt: null,
    notes: input.notes ?? null,
  };
  intakecrmTasks.unshift(task);
  if (intakecrmSupabaseEnabled()) {
    void upsertIntakecrmTaskSupabase(task);
  }
  return task;
}

export function patchIntakecrmTask(
  tenant: string,
  taskId: string,
  patch: Partial<Pick<IntakeCrmTask, "assignedTo" | "status" | "completedAt" | "overdueAt" | "overdueSignalAt" | "notes" | "dueAt">>
): IntakeCrmTask | null {
  const idx = intakecrmTasks.findIndex((t) => t.tenant === tenant && t.taskId === taskId);
  if (idx < 0) return null;
  const prev = intakecrmTasks[idx]!;
  const next: IntakeCrmTask = { ...prev, ...patch, updatedAt: nowIso() };
  intakecrmTasks.splice(idx, 1, next);
  if (intakecrmSupabaseEnabled()) {
    void patchIntakecrmTaskSupabase(next);
  }
  return next;
}

export function addIntakecrmAuditEvent(event: IntakeCrmAuditEvent): IntakeCrmAuditEvent {
  intakecrmAudit.unshift(event);
  if (intakecrmSupabaseEnabled()) {
    void insertIntakecrmAuditSupabase(event);
  }
  return event;
}

export async function listIntakecrmAudit(tenant: string, limit: number = 50): Promise<IntakeCrmAuditEvent[]> {
  if (intakecrmSupabaseEnabled()) {
    const rows = await listIntakecrmAuditSupabase(tenant, Math.max(1, Math.min(limit, 250)));
    if (rows.length) return rows;
  }
  return intakecrmAudit.filter((e) => e.tenant === tenant).slice(0, Math.max(1, Math.min(limit, 250)));
}
