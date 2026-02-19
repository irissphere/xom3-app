import fs from "node:fs";
import path from "node:path";
import type { OrchestrationTrigger } from "../orchestration-types";
import { getDefaultOrchestrationTriggers } from "../orchestration-registry";

const STORE_DIR = path.join(process.cwd(), ".xom3", "orchestration");
const TRIGGERS_FILE = path.join(STORE_DIR, "triggers.json");

type Stored = Record<string, OrchestrationTrigger[]>;

type GlobalTriggersState = {
  __xom3_orchestration_triggers_loaded__?: boolean;
  __xom3_orchestration_triggers__?: Stored;
};

function g(): GlobalTriggersState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_orchestration_triggers_loaded__) return;
  gg.__xom3_orchestration_triggers_loaded__ = true;
  gg.__xom3_orchestration_triggers__ = gg.__xom3_orchestration_triggers__ || {};

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(TRIGGERS_FILE)) return;
    const raw = fs.readFileSync(TRIGGERS_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") gg.__xom3_orchestration_triggers__ = parsed as Stored;
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(gg.__xom3_orchestration_triggers__ || {}, null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function sanitizeTrigger(t: OrchestrationTrigger): OrchestrationTrigger {
  return {
    triggerId: String(t.triggerId || ""),
    source: t.source,
    eventType: String(t.eventType || ""),
    enabled: Boolean(t.enabled),
    actions: Array.isArray(t.actions) ? t.actions : [],
    conditions: Array.isArray(t.conditions) ? t.conditions : undefined,
  };
}

function seedTenantIfMissing(tenantId: string) {
  ensureLoaded();
  const gg = g();
  if (gg.__xom3_orchestration_triggers__![tenantId]) return;
  gg.__xom3_orchestration_triggers__![tenantId] = getDefaultOrchestrationTriggers().map(sanitizeTrigger);
  persistBestEffort();
}

export function listOrchestrationTriggers(tenantId: string) {
  seedTenantIfMissing(tenantId);
  return (g().__xom3_orchestration_triggers__![tenantId] || []).map(sanitizeTrigger);
}

export function updateOrchestrationTrigger(tenantId: string, input: { triggerId: string; patch: Partial<OrchestrationTrigger> }) {
  seedTenantIfMissing(tenantId);
  const gg = g();
  const items = gg.__xom3_orchestration_triggers__![tenantId] || [];
  const idx = items.findIndex((t) => t.triggerId === input.triggerId);
  if (idx < 0) return { ok: false as const, error: "trigger_not_found", triggers: items.map(sanitizeTrigger) };

  const prev = items[idx]!;
  const patch = input.patch || {};
  const next: OrchestrationTrigger = sanitizeTrigger({
    ...prev,
    ...patch,
    triggerId: prev.triggerId,
    source: (patch.source as any) || prev.source,
    eventType: patch.eventType ? String(patch.eventType) : prev.eventType,
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : prev.enabled,
    actions: Array.isArray((patch as any).actions) ? (patch as any).actions : prev.actions,
    conditions: Array.isArray((patch as any).conditions) ? (patch as any).conditions : prev.conditions,
  } as any);

  items.splice(idx, 1, next);
  gg.__xom3_orchestration_triggers__![tenantId] = items;
  persistBestEffort();
  return { ok: true as const, triggers: items.map(sanitizeTrigger) };
}
