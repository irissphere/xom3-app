import fs from "fs";
import path from "path";
import type { OutboundItem } from "./types";

const MAX_ITEMS = 4000;
const storeDir = path.join(process.cwd(), ".xom3", "gtm-outbound");
const filePath = path.join(storeDir, "outbound-items.json");

type GlobalLedger = {
  __xom3_gtm_outbound_loaded__?: boolean;
  __xom3_gtm_outbound_items__?: OutboundItem[];
};

function g(): GlobalLedger {
  return globalThis as any;
}

function load(): OutboundItem[] {
  const gg = g();
  if (gg.__xom3_gtm_outbound_loaded__ && Array.isArray(gg.__xom3_gtm_outbound_items__)) {
    return gg.__xom3_gtm_outbound_items__!;
  }
  gg.__xom3_gtm_outbound_loaded__ = true;
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      gg.__xom3_gtm_outbound_items__ = Array.isArray(parsed) ? (parsed as OutboundItem[]) : [];
    } else {
      gg.__xom3_gtm_outbound_items__ = [];
    }
  } catch {
    gg.__xom3_gtm_outbound_items__ = [];
  }
  return gg.__xom3_gtm_outbound_items__!;
}

function save(items: OutboundItem[]) {
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    fs.writeFileSync(filePath, JSON.stringify(items.slice(-MAX_ITEMS), null, 2), "utf-8");
  } catch {
    // ignore (disk persistence is best-effort in dev)
  }
}

function nextId() {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `gtm_out_${Date.now()}_${rnd}`;
}

export function insertOutboundItems(newItems: Omit<OutboundItem, "id" | "createdAt" | "updatedAt">[]) {
  const items = load();
  const nowIso = new Date().toISOString();
  const created: OutboundItem[] = newItems.map((n) => ({
    ...n,
    id: nextId(),
    createdAt: nowIso,
    updatedAt: nowIso,
  }));
  items.push(...created);
  if (items.length > MAX_ITEMS) {
    items.splice(0, items.length - MAX_ITEMS);
  }
  save(items);
  return created;
}

export function updateOutboundItem(id: string, patch: Partial<OutboundItem>) {
  const items = load();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const updated: OutboundItem = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
  items[idx] = updated;
  save(items);
  return updated;
}

export function getOutboundItem(id: string) {
  const items = load();
  return items.find((i) => i.id === id) || null;
}

export function listOutboundItems(limit = 50) {
  const items = load();
  const lim = Math.max(1, Math.min(300, Number(limit) || 50));
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, lim);
}

export function getOutboundQueueCounts() {
  const items = load();
  let queued = 0;
  let sending = 0;
  let sent = 0;
  let failed = 0;
  for (const item of items) {
    if (item.status === "queued") queued++;
    else if (item.status === "sending") sending++;
    else if (item.status === "sent") sent++;
    else if (item.status === "failed") failed++;
  }
  return { total: items.length, queued, sending, sent, failed };
}

export function listDueOutboundItems(nowMs: number, limit = 10) {
  const items = load();
  const lim = Math.max(1, Math.min(50, Number(limit) || 10));
  const due = items
    .filter((i) => (i.status === "queued" || i.status === "sending") && Date.parse(i.scheduledAt) <= nowMs)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
    .slice(0, lim);
  return due;
}
