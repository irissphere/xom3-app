import fs from "node:fs";
import path from "node:path";
import type { SignalQuery, SignalRecord, SignalSeverity } from "./signal-types";

const STORE_DIR = path.join(process.cwd(), ".xom3", "signals");
const STORE_FILE = path.join(STORE_DIR, "signals.json");
const MAX_SIGNALS = 5000;

type GlobalSignalsState = {
  __xom3_signals_loaded__?: boolean;
  __xom3_signals__?: SignalRecord[];
  __xom3_signals_seq__?: number;
};

function g(): GlobalSignalsState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_signals_loaded__) return;
  gg.__xom3_signals_loaded__ = true;
  gg.__xom3_signals__ = gg.__xom3_signals__ || [];

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) gg.__xom3_signals__ = parsed as SignalRecord[];
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify((gg.__xom3_signals__ || []).slice(0, MAX_SIGNALS), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextSignalId() {
  const gg = g();
  gg.__xom3_signals_seq__ = (gg.__xom3_signals_seq__ || 0) + 1;
  return `sig_${Date.now()}_${gg.__xom3_signals_seq__}`;
}

export function recordSignal(input: {
  tenantId: string;
  type: string;
  severity: SignalSeverity;
  payload: any;
  timestamp?: string;
}): SignalRecord {
  ensureLoaded();
  const gg = g();
  const rec: SignalRecord = {
    signalId: nextSignalId(),
    tenantId: input.tenantId,
    type: input.type,
    severity: input.severity,
    timestamp: input.timestamp || new Date().toISOString(),
    payload: input.payload,
  };
  gg.__xom3_signals__!.unshift(rec);
  if (gg.__xom3_signals__!.length > MAX_SIGNALS) gg.__xom3_signals__!.pop();
  persistBestEffort();
  return rec;
}

export function listSignals(q: SignalQuery = {}): SignalRecord[] {
  ensureLoaded();
  const gg = g();
  const limit = Math.max(1, Math.min(500, Number(q.limit) || 100));
  return (gg.__xom3_signals__ || [])
    .filter((s) => (q.tenantId ? s.tenantId === q.tenantId : true))
    .filter((s) => (q.prefix ? String(s.type).startsWith(q.prefix) : true))
    .filter((s) => (q.severity ? s.severity === q.severity : true))
    .slice(0, limit);
}

export function getSignalsCounts(q: Omit<SignalQuery, "severity" | "limit"> = {}) {
  ensureLoaded();
  const gg = g();
  const items = (gg.__xom3_signals__ || [])
    .filter((s) => (q.tenantId ? s.tenantId === q.tenantId : true))
    .filter((s) => (q.prefix ? String(s.type).startsWith(q.prefix) : true));

  const counts = { total: items.length, info: 0, warning: 0, error: 0 };
  for (const s of items) {
    if (s.severity === "info") counts.info += 1;
    else if (s.severity === "warning") counts.warning += 1;
    else if (s.severity === "error") counts.error += 1;
  }
  return counts;
}
