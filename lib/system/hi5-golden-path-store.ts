import fs from "fs";
import path from "path";

export type GoldenStep =
  | "lead_received"
  | "lead_enriched"
  | "rfq_generated"
  | "vendor_contacted"
  | "response_positioned"
  | "completed"
  | "error";

export type GoldenPathRecord = {
  id: string;
  tenant: string;
  createdAt: string;
  updatedAt: string;

  // Lead identity
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  source?: string | null;

  // Pipeline
  step: GoldenStep;
  leadStatus?: string | null;
  rfqStatus?: string | null;
  responseStatus?: string | null;
  assignedVendor?: string | null;

  lastError?: string | null;
  hi5Data?: any;
};

type StoreShape = {
  tenant: string;
  updatedAt: string;
  records: Record<string, GoldenPathRecord>;
  recent: string[]; // record ids, newest-first
};

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(tenant: string): string {
  return path.join(DATA_DIR, `hi5-${tenant}-golden-path.json`);
}

export function loadGoldenPath(tenant: string): StoreShape {
  ensureDir();
  const fp = filePath(tenant);
  try {
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tenant === tenant && parsed.records) return parsed;
    }
  } catch {
    // ignore
  }
  return { tenant, updatedAt: new Date().toISOString(), records: {}, recent: [] };
}

export function saveGoldenPath(store: StoreShape) {
  ensureDir();
  store.updatedAt = new Date().toISOString();
  const fp = filePath(store.tenant);
  fs.writeFileSync(fp, JSON.stringify(store, null, 2));
}

function newId(): string {
  return `gp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createGoldenLead(tenant: string, input: Partial<GoldenPathRecord>): GoldenPathRecord {
  const store = loadGoldenPath(tenant);
  const now = new Date().toISOString();
  const id = newId();
  const rec: GoldenPathRecord = {
    id,
    tenant,
    createdAt: now,
    updatedAt: now,
    name: input.name ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    company: input.company ?? null,
    message: input.message ?? null,
    source: input.source ?? null,
    step: "lead_received",
    leadStatus: "received",
    rfqStatus: null,
    responseStatus: null,
    assignedVendor: null,
    lastError: null,
    hi5Data: input.hi5Data,
  };
  store.records[id] = rec;
  store.recent = [id, ...store.recent.filter(x => x !== id)].slice(0, 50);
  saveGoldenPath(store);
  return rec;
}

export function updateGoldenRecord(
  tenant: string,
  id: string,
  patch: Partial<GoldenPathRecord> & { step?: GoldenStep }
): GoldenPathRecord | null {
  const store = loadGoldenPath(tenant);
  const existing = store.records[id];
  if (!existing) return null;
  const now = new Date().toISOString();
  const next: GoldenPathRecord = {
    ...existing,
    ...patch,
    updatedAt: now,
  };
  store.records[id] = next;
  store.recent = [id, ...store.recent.filter(x => x !== id)].slice(0, 50);
  saveGoldenPath(store);
  return next;
}

export function listRecentGolden(tenant: string, limit = 10): GoldenPathRecord[] {
  const store = loadGoldenPath(tenant);
  return store.recent.slice(0, limit).map(id => store.records[id]).filter(Boolean);
}
