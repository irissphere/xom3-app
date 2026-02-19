import fs from "node:fs";
import path from "node:path";

export type RevenueLoopState = {
  tenantId: string;
  lastTriggeredAt: string;
  lastTriggerType: string;
  lastPostId?: string;
  lastError?: string;
};

const STORE_DIR = path.join(process.cwd(), ".xom3", "revenue-loop");
const STATE_FILE = path.join(STORE_DIR, "state.json");

type StateDoc = {
  version: 1;
  byTenant: Record<string, RevenueLoopState>;
};

function ensureDir() {
  if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
}

function readDocBestEffort(): StateDoc {
  ensureDir();
  try {
    if (!fs.existsSync(STATE_FILE)) return { version: 1, byTenant: {} };
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object" && parsed.version === 1 && parsed.byTenant && typeof parsed.byTenant === "object") {
      return parsed as StateDoc;
    }
    return { version: 1, byTenant: {} };
  } catch {
    return { version: 1, byTenant: {} };
  }
}

function writeDocBestEffort(doc: StateDoc) {
  ensureDir();
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(doc, null, 2), "utf8");
  } catch {
    // best-effort
  }
}

export function getRevenueLoopState(tenantId: string): RevenueLoopState {
  const doc = readDocBestEffort();
  const existing = doc.byTenant[tenantId];
  if (existing && typeof existing === "object") return existing;
  const init: RevenueLoopState = {
    tenantId,
    lastTriggeredAt: new Date(0).toISOString(),
    lastTriggerType: "none",
  };
  doc.byTenant[tenantId] = init;
  writeDocBestEffort(doc);
  return init;
}

export function patchRevenueLoopState(tenantId: string, patch: Partial<Omit<RevenueLoopState, "tenantId">>) {
  const doc = readDocBestEffort();
  const current = doc.byTenant[tenantId] || {
    tenantId,
    lastTriggeredAt: new Date(0).toISOString(),
    lastTriggerType: "none",
  };
  const next: RevenueLoopState = {
    ...current,
    ...patch,
    tenantId,
  };
  doc.byTenant[tenantId] = next;
  writeDocBestEffort(doc);
  return next;
}
