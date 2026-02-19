import fs from "node:fs";
import path from "node:path";

export type RevenueLoopTriggerType = "lead_created" | "lead_contacted" | "task_completed" | "task_overdue" | "lead_closed";
export type RevenueLoopPlatformTarget = "x" | "linkedin" | "instagram";

export type RevenueLoopTrigger = {
  triggerId: string;
  type: RevenueLoopTriggerType;
  platformTargets: RevenueLoopPlatformTarget[];
  templateId: string;
  enabled: boolean;
};

const STORE_DIR = path.join(process.cwd(), ".xom3", "revenue-loop");
const TRIGGERS_FILE = path.join(STORE_DIR, "triggers.json");

export function getDefaultRevenueLoopTriggers(): RevenueLoopTrigger[] {
  return [
    {
      triggerId: "revloop_lead_created",
      type: "lead_created",
      platformTargets: ["x", "linkedin"],
      templateId: "lead_created",
      enabled: true,
    },
    {
      triggerId: "revloop_task_completed",
      type: "task_completed",
      platformTargets: ["x"],
      templateId: "task_completed",
      enabled: true,
    },
    {
      triggerId: "revloop_lead_closed",
      type: "lead_closed",
      platformTargets: ["linkedin"],
      templateId: "lead_closed",
      enabled: true,
    },
    {
      triggerId: "revloop_task_overdue",
      type: "task_overdue",
      platformTargets: ["linkedin"],
      templateId: "task_overdue",
      enabled: false,
    },
  ];
}

type TriggersDoc = {
  version: 1;
  byTenant: Record<string, RevenueLoopTrigger[]>;
};

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
}

function readDocBestEffort(): TriggersDoc {
  ensureDir();
  try {
    if (!fs.existsSync(TRIGGERS_FILE)) return { version: 1, byTenant: {} };
    const raw = fs.readFileSync(TRIGGERS_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && parsed.version === 1 && parsed.byTenant && typeof parsed.byTenant === "object") {
      return parsed as TriggersDoc;
    }
    return { version: 1, byTenant: {} };
  } catch {
    return { version: 1, byTenant: {} };
  }
}

function writeDocBestEffort(doc: TriggersDoc) {
  ensureDir();
  try {
    fs.writeFileSync(TRIGGERS_FILE, JSON.stringify(doc, null, 2), "utf8");
  } catch {
    // best-effort
  }
}

export function listRevenueLoopTriggers(tenantId: string): RevenueLoopTrigger[] {
  const doc = readDocBestEffort();
  const existing = doc.byTenant[tenantId];
  if (Array.isArray(existing) && existing.length > 0) return existing;
  const defaults = getDefaultRevenueLoopTriggers();
  doc.byTenant[tenantId] = defaults;
  writeDocBestEffort(doc);
  return defaults;
}

export function updateRevenueLoopTrigger(
  tenantId: string,
  input: { triggerId: string; patch: Partial<Pick<RevenueLoopTrigger, "enabled" | "platformTargets" | "templateId">> }
) {
  const doc = readDocBestEffort();
  const current = Array.isArray(doc.byTenant[tenantId]) && doc.byTenant[tenantId]!.length > 0 ? doc.byTenant[tenantId]! : getDefaultRevenueLoopTriggers();
  const idx = current.findIndex((t) => t.triggerId === input.triggerId);
  if (idx < 0) return { ok: false as const, error: "trigger_not_found" as const, triggers: current };

  const next: RevenueLoopTrigger = {
    ...current[idx]!,
    ...input.patch,
    triggerId: current[idx]!.triggerId,
    type: current[idx]!.type,
  };

  const nextList = current.slice();
  nextList.splice(idx, 1, next);

  doc.byTenant[tenantId] = nextList;
  writeDocBestEffort(doc);

  return { ok: true as const, triggers: nextList };
}
