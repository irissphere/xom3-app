import fs from "node:fs";
import path from "node:path";

export type OrchestrationActionStatus = "pending" | "completed" | "failed";

export type OrchestrationInstance = {
  instanceId: string;
  triggerId: string;
  tenantId: string;
  eventType: string;
  actions: {
    actionId: string;
    type: string;
    status: OrchestrationActionStatus;
    timestamp: string;
    error?: string;
    output?: any;
  }[];
  startedAt: string;
  completedAt?: string;
  error?: string;
};

const STORE_DIR = path.join(process.cwd(), ".xom3", "orchestration");
const STATE_FILE = path.join(STORE_DIR, "state.json");
const MAX_INSTANCES = 2500;

type GlobalOrchestrationState = {
  __xom3_orchestration_state_loaded__?: boolean;
  __xom3_orchestration_instances__?: OrchestrationInstance[];
  __xom3_orchestration_seq__?: number;
};

function g(): GlobalOrchestrationState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_orchestration_state_loaded__) return;
  gg.__xom3_orchestration_state_loaded__ = true;
  gg.__xom3_orchestration_instances__ = gg.__xom3_orchestration_instances__ || [];

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) gg.__xom3_orchestration_instances__ = parsed as OrchestrationInstance[];
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify((gg.__xom3_orchestration_instances__ || []).slice(0, MAX_INSTANCES), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextInstanceId() {
  const gg = g();
  gg.__xom3_orchestration_seq__ = (gg.__xom3_orchestration_seq__ || 0) + 1;
  return `orc_${Date.now()}_${gg.__xom3_orchestration_seq__}`;
}

function nextActionId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createOrchestrationInstance(input: { triggerId: string; tenantId: string; eventType: string; actionTypes: string[] }) {
  ensureLoaded();
  const now = new Date().toISOString();
  const inst: OrchestrationInstance = {
    instanceId: nextInstanceId(),
    triggerId: input.triggerId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    startedAt: now,
    actions: input.actionTypes.map((t) => ({ actionId: nextActionId(), type: t, status: "pending", timestamp: now })),
  };

  g().__xom3_orchestration_instances__!.unshift(inst);
  if (g().__xom3_orchestration_instances__!.length > MAX_INSTANCES) g().__xom3_orchestration_instances__!.pop();
  persistBestEffort();
  return inst;
}

export function patchOrchestrationAction(input: {
  instanceId: string;
  actionId: string;
  status: OrchestrationActionStatus;
  error?: string;
  output?: any;
}) {
  ensureLoaded();
  const items = g().__xom3_orchestration_instances__ || [];
  const idx = items.findIndex((i) => i.instanceId === input.instanceId);
  if (idx < 0) return null;
  const inst = items[idx]!;
  const nextActions = inst.actions.map((a) => {
    if (a.actionId !== input.actionId) return a;
    return { ...a, status: input.status, timestamp: new Date().toISOString(), error: input.error, output: input.output };
  });
  const next: OrchestrationInstance = { ...inst, actions: nextActions };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

export function completeOrchestrationInstance(instanceId: string) {
  ensureLoaded();
  const items = g().__xom3_orchestration_instances__ || [];
  const idx = items.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  const inst = items[idx]!;
  const next: OrchestrationInstance = { ...inst, completedAt: new Date().toISOString(), error: undefined };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

export function failOrchestrationInstance(instanceId: string, error: string) {
  ensureLoaded();
  const items = g().__xom3_orchestration_instances__ || [];
  const idx = items.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  const inst = items[idx]!;
  const next: OrchestrationInstance = { ...inst, completedAt: new Date().toISOString(), error };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

export function listOrchestrationInstances(q: { tenantId?: string; limit?: number } = {}) {
  ensureLoaded();
  const gg = g();
  const limit = Math.max(1, Math.min(500, Number(q.limit) || 100));
  return (gg.__xom3_orchestration_instances__ || [])
    .filter((i) => (q.tenantId ? i.tenantId === q.tenantId : true))
    .slice(0, limit);
}
