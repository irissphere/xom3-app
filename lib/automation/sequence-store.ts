import fs from "node:fs";
import path from "node:path";

export type AutomationStep =
  | { kind: "wait"; minutes: number }
  | { kind: "send_email"; subject: string; body: string }
  | { kind: "send_sms"; body: string };

export type AutomationSequence = {
  sequenceId: string;
  tenantId: string;
  name: string;
  trigger: { kind: "lead_created" | "lead_status_changed" };
  enabled: boolean;
  steps: AutomationStep[];
  createdAt: string;
  updatedAt: string;
};

const STORE_DIR = path.join(process.cwd(), ".xom3", "automation");
const SEQUENCES_FILE = path.join(STORE_DIR, "sequences.json");
const MAX_SEQUENCES = 2000;

type GlobalState = {
  __xom3_automation_sequences_loaded__?: boolean;
  __xom3_automation_sequences__?: AutomationSequence[];
  __xom3_automation_sequence_seq__?: number;
};

function g(): GlobalState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_automation_sequences_loaded__) return;
  gg.__xom3_automation_sequences_loaded__ = true;
  gg.__xom3_automation_sequences__ = gg.__xom3_automation_sequences__ || [];

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(SEQUENCES_FILE)) return;
    const raw = fs.readFileSync(SEQUENCES_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) gg.__xom3_automation_sequences__ = parsed as AutomationSequence[];
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(
      SEQUENCES_FILE,
      JSON.stringify((gg.__xom3_automation_sequences__ || []).slice(0, MAX_SEQUENCES), null, 2),
      "utf8"
    );
  } catch {
    // best-effort
  }
}

function nextSequenceId() {
  const gg = g();
  gg.__xom3_automation_sequence_seq__ = (gg.__xom3_automation_sequence_seq__ || 0) + 1;
  return `seq_${Date.now()}_${gg.__xom3_automation_sequence_seq__}`;
}

export function listSequences(tenantId: string): AutomationSequence[] {
  ensureLoaded();
  return (g().__xom3_automation_sequences__ || []).filter((s) => s.tenantId === tenantId);
}

export function getSequenceById(tenantId: string, sequenceId: string): AutomationSequence | null {
  ensureLoaded();
  return (g().__xom3_automation_sequences__ || []).find((s) => s.tenantId === tenantId && s.sequenceId === sequenceId) || null;
}

export function createSequence(tenantId: string, data: { name: string; trigger: AutomationSequence["trigger"]; steps: AutomationStep[]; enabled: boolean }): AutomationSequence {
  ensureLoaded();
  const now = new Date().toISOString();
  const seq: AutomationSequence = {
    sequenceId: nextSequenceId(),
    tenantId,
    name: data.name,
    trigger: data.trigger,
    enabled: data.enabled,
    steps: data.steps,
    createdAt: now,
    updatedAt: now,
  };
  g().__xom3_automation_sequences__!.unshift(seq);
  if (g().__xom3_automation_sequences__!.length > MAX_SEQUENCES) g().__xom3_automation_sequences__!.pop();
  persistBestEffort();
  return seq;
}

export function updateSequence(tenantId: string, sequenceId: string, patch: Partial<Omit<AutomationSequence, "tenantId" | "sequenceId" | "createdAt">>): AutomationSequence | null {
  ensureLoaded();
  const items = g().__xom3_automation_sequences__ || [];
  const idx = items.findIndex((s) => s.tenantId === tenantId && s.sequenceId === sequenceId);
  if (idx < 0) return null;
  const prev = items[idx]!;
  const next: AutomationSequence = {
    ...prev,
    ...patch,
    tenantId: prev.tenantId,
    sequenceId: prev.sequenceId,
    createdAt: prev.createdAt,
    updatedAt: new Date().toISOString(),
  };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

















