import fs from "node:fs";
import path from "node:path";
import type { Task } from "./intakecrm-task-types";

const STORE_DIR = path.join(process.cwd(), ".xom3", "intakecrm");
const TASKS_FILE = path.join(STORE_DIR, "tasks.json");
const MAX_TASKS = 50000;

type GlobalTaskState = {
  __xom3_intakecrm_tasks_loaded__?: boolean;
  __xom3_intakecrm_tasks__?: Task[];
  __xom3_intakecrm_task_seq__?: number;
};

function g(): GlobalTaskState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_intakecrm_tasks_loaded__) return;
  gg.__xom3_intakecrm_tasks_loaded__ = true;
  gg.__xom3_intakecrm_tasks__ = gg.__xom3_intakecrm_tasks__ || [];

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(TASKS_FILE)) return;
    const raw = fs.readFileSync(TASKS_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) gg.__xom3_intakecrm_tasks__ = parsed as Task[];
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(TASKS_FILE, JSON.stringify((gg.__xom3_intakecrm_tasks__ || []).slice(0, MAX_TASKS), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextTaskId() {
  const gg = g();
  gg.__xom3_intakecrm_task_seq__ = (gg.__xom3_intakecrm_task_seq__ || 0) + 1;
  return `task_${Date.now()}_${gg.__xom3_intakecrm_task_seq__}`;
}

export function createTask(tenantId: string, data: Omit<Task, "taskId" | "tenantId" | "createdAt"> & Partial<Pick<Task, "createdAt">>) {
  ensureLoaded();
  const now = new Date().toISOString();
  const task: Task = {
    ...data,
    taskId: nextTaskId(),
    tenantId,
    createdAt: data.createdAt || now,
  };
  g().__xom3_intakecrm_tasks__!.unshift(task);
  if (g().__xom3_intakecrm_tasks__!.length > MAX_TASKS) g().__xom3_intakecrm_tasks__!.pop();
  persistBestEffort();
  return task;
}

export function getTasksByTenant(tenantId: string) {
  ensureLoaded();
  return (g().__xom3_intakecrm_tasks__ || []).filter((t) => t.tenantId === tenantId);
}

export function getTasksByLead(tenantId: string, leadId: string) {
  ensureLoaded();
  return (g().__xom3_intakecrm_tasks__ || []).filter((t) => t.tenantId === tenantId && t.leadId === leadId);
}

export function getTaskById(tenantId: string, taskId: string) {
  ensureLoaded();
  return (g().__xom3_intakecrm_tasks__ || []).find((t) => t.tenantId === tenantId && t.taskId === taskId) || null;
}

export function updateTask(tenantId: string, taskId: string, patch: Partial<Task>) {
  ensureLoaded();
  const items = g().__xom3_intakecrm_tasks__ || [];
  const idx = items.findIndex((t) => t.tenantId === tenantId && t.taskId === taskId);
  if (idx < 0) return null;
  const prev = items[idx]!;
  const next: Task = { ...prev, ...patch, tenantId: prev.tenantId, taskId: prev.taskId };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

export function listTenantIdsFromTasks(): string[] {
  ensureLoaded();
  const set = new Set<string>();
  for (const t of g().__xom3_intakecrm_tasks__ || []) set.add(t.tenantId);
  return Array.from(set.values());
}
