import fs from "fs";
import path from "path";

export type AutonomousLogEntry = {
  id: string;
  at: number;
  agent: string;
  kind: "proposal" | "report";
  action: string;
  reason: string;
  context?: Record<string, any>;
};

export type AutonomousExecutionEntry = {
  id: string;
  at: number;
  agent: string;
  action: string;
  target: string;
  reason: string;
  executed: boolean;
  skipped?: boolean;
  skipReason?: string | null;
  consensus?: {
    voters?: string[];
    votes?: number;
  };
};

export type AutonomousState = {
  enabled: boolean;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_PATH = path.join(DATA_DIR, "xom3-autonomous-state.json");
const LOG_PATH = path.join(DATA_DIR, "xom3-autonomous-log.json");
const EXEC_PATH = path.join(DATA_DIR, "xom3-autonomous-executions.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadState(): AutonomousState {
  ensureDir();
  try {
    if (fs.existsSync(STATE_PATH)) {
      const raw = fs.readFileSync(STATE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed?.enabled === "boolean" && typeof parsed?.updatedAt === "string") return parsed;
    }
  } catch {
    // ignore
  }
  return { enabled: false, updatedAt: new Date().toISOString() };
}

export function saveState(state: AutonomousState) {
  ensureDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function loadLog(): AutonomousLogEntry[] {
  ensureDir();
  try {
    if (fs.existsSync(LOG_PATH)) {
      const raw = fs.readFileSync(LOG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function appendLog(entry: AutonomousLogEntry, cap = 500) {
  const log = loadLog();
  log.push(entry);
  const capped = log.length > cap ? log.slice(-cap) : log;
  ensureDir();
  fs.writeFileSync(LOG_PATH, JSON.stringify(capped, null, 2));
}

export function loadExecutions(): AutonomousExecutionEntry[] {
  ensureDir();
  try {
    if (fs.existsSync(EXEC_PATH)) {
      const raw = fs.readFileSync(EXEC_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function appendExecution(entry: AutonomousExecutionEntry, cap = 500) {
  const exec = loadExecutions();
  exec.push(entry);
  const capped = exec.length > cap ? exec.slice(-cap) : exec;
  ensureDir();
  fs.writeFileSync(EXEC_PATH, JSON.stringify(capped, null, 2));
}

export function deriveAgentModesFromLog(entries: AutonomousLogEntry[], enabled: boolean) {
  const latestByAgent: Record<string, AutonomousLogEntry> = {};
  for (const e of entries) latestByAgent[e.agent] = e;

  const agents: Record<
    string,
    { mode: "idle" | "observing" | "proposing" | "executing"; lastAt?: number; lastAction?: string; lastReason?: string }
  > = {};

  for (const [agent, last] of Object.entries(latestByAgent)) {
    agents[agent] = {
      mode: enabled ? (last.kind === "proposal" ? "proposing" : "executing") : "idle",
      lastAt: last.at,
      lastAction: last.action,
      lastReason: last.reason,
    };
  }

  return agents;
}

export function guardrails(
  recent: AutonomousExecutionEntry[],
  candidate: { action: string; target: string },
  opts?: { cooldownMs?: number; conflictWindowMs?: number }
): { allowed: boolean; reason?: string } {
  const cooldownMs = opts?.cooldownMs ?? 60_000;
  const conflictWindowMs = opts?.conflictWindowMs ?? 10_000;
  const now = Date.now();

  const same = recent
    .slice()
    .reverse()
    .find((e) => e.action === candidate.action && e.target === candidate.target && e.executed);
  if (same && now - same.at < cooldownMs) return { allowed: false, reason: "cooldown" };

  const conflict = recent
    .slice()
    .reverse()
    .find((e) => e.target === candidate.target && e.executed && now - e.at < conflictWindowMs && e.action !== candidate.action);
  if (conflict) return { allowed: false, reason: "conflict_window" };

  return { allowed: true };
}
