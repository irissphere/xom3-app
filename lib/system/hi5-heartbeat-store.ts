import fs from "fs";
import path from "path";

export type HeartbeatKind = "workflow" | "scraper";

export type HeartbeatStatus = "healthy" | "degraded" | "error" | "unknown";

export type HeartbeatEntry = {
  key: string; // stable key like "lead_intake" or "linkedin"
  label?: string;
  status: HeartbeatStatus;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastError?: string | null;
  updatedAt: string;
};

export type HeartbeatSnapshot = {
  kind: HeartbeatKind;
  tenant: string;
  entries: Record<string, HeartbeatEntry>;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");

function filePath(kind: HeartbeatKind, tenant: string): string {
  return path.join(DATA_DIR, `hi5-${tenant}-${kind}-heartbeat.json`);
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadHeartbeat(kind: HeartbeatKind, tenant: string): HeartbeatSnapshot {
  ensureDir();
  const fp = filePath(kind, tenant);
  try {
    if (fs.existsSync(fp)) {
      const raw = fs.readFileSync(fp, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.kind === kind && parsed.tenant === tenant && parsed.entries) return parsed;
    }
  } catch {
    // ignore and fall back to empty snapshot
  }
  return { kind, tenant, entries: {}, updatedAt: new Date().toISOString() };
}

export function saveHeartbeat(snapshot: HeartbeatSnapshot): void {
  ensureDir();
  const fp = filePath(snapshot.kind, snapshot.tenant);
  fs.writeFileSync(fp, JSON.stringify(snapshot, null, 2));
}

export function upsertHeartbeatEntry(
  kind: HeartbeatKind,
  tenant: string,
  key: string,
  update: Partial<HeartbeatEntry> & { status: HeartbeatStatus }
): HeartbeatSnapshot {
  const snap = loadHeartbeat(kind, tenant);
  const existing = snap.entries[key];
  const now = new Date().toISOString();

  snap.entries[key] = {
    key,
    label: update.label ?? existing?.label ?? key,
    status: update.status,
    lastRunAt: update.lastRunAt ?? existing?.lastRunAt ?? null,
    lastSuccessAt: update.lastSuccessAt ?? existing?.lastSuccessAt ?? null,
    lastErrorAt: update.lastErrorAt ?? existing?.lastErrorAt ?? null,
    lastError: update.lastError ?? existing?.lastError ?? null,
    updatedAt: now,
  };

  snap.updatedAt = now;
  saveHeartbeat(snap);
  return snap;
}
