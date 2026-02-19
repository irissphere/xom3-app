import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { ensureHandlersInitialized, createDirective, executeDirectiveNow } from "@/lib/uoi";
import type { SovereignEvent } from "@/lib/sovereigns/event-bus";
import type { RitualDefinition, RitualRun, RitualStep, RitualStepRun } from "./types";
import { registerCanonicalRituals } from "./canon";
import { sovereigns } from "@/lib/sovereigns/registry";

const rituals = new Map<string, RitualDefinition>();
const runs: RitualRun[] = [];

const MAX_RUNS = 120;

let runSeq = 0;
function nextRunId() {
  runSeq += 1;
  return `rit_${Date.now()}_${runSeq}`;
}

function pushRun(run: RitualRun) {
  runs.unshift(run);
  if (runs.length > MAX_RUNS) runs.pop();
}

let canonLoaded = false;
function ensureCanonLoaded() {
  if (canonLoaded) return;
  canonLoaded = true;
  registerCanonicalRituals(registerRitual);
}

export function registerRitual(def: RitualDefinition) {
  rituals.set(def.key, def);
}

export function getRituals(): RitualDefinition[] {
  ensureCanonLoaded();
  return Array.from(rituals.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function getRitualRuns(limit: number = 50): RitualRun[] {
  return runs.slice(0, Math.max(1, Math.min(200, limit)));
}

export function getRitualRun(id: string): RitualRun | null {
  return runs.find((r) => r.id === id) || null;
}

type TriggerSource = {
  type: RitualRun["source"]["type"];
  eventId?: string;
};

function publishRitualEvent(type: string, severity: "info" | "warning" | "error", payload: Record<string, any>, parentEventId?: string) {
  // SK-1: route through kernel sovereign instance (still publishes identical event shapes).
  sovereigns.rituals.publish(type, severity, payload, { tags: ["ritual"], parentEventId });
}

function publishRitualReflex(type: string, payload: Record<string, any>, parentEventId?: string) {
  sovereigns.rituals.publish(type, "info", payload, { tags: ["ritual", "reflex"], parentEventId });
}

async function executeStep(step: RitualStep, run: RitualRun, stepRun: RitualStepRun, sourceEventId?: string) {
  if (step.kind === "uoi.directive") {
    ensureHandlersInitialized();
    const directiveType = step.params.directiveType as any;
    const target = String(step.params.target || "operator");
    const reason = String(step.params.reason || `Ritual ${run.ritualKey}`);
    const directive = createDirective(directiveType, target, { ritual: run.ritualKey, runId: run.id, ...step.params.metadata }, reason);
    await executeDirectiveNow(directive);
    return;
  }

  if (step.kind === "broadcast.enqueue") {
    enqueueBroadcast({
      channel: step.params.channel || "internal",
      priority: step.params.priority || "low",
      title: step.params.title,
      body: step.params.body,
      metadata: { ritual: run.ritualKey, runId: run.id, ...step.params.metadata },
    });
    return;
  }

  if (step.kind === "sovereign.sync") {
    const mode = step.params?.mode || "pulse";
    if (mode === "broadcast-sync") {
      publishRitualEvent(
        "broadcast.sync",
        "info",
        { ritual: run.ritualKey, runId: run.id, ...step.params?.payload },
        sourceEventId
      );
      return;
    }

    // Default: emit a sync.pulse (constellation alignment reflex will do the rest).
    sovereigns.sync.publish(
      "sync.pulse",
      "info",
      { ritual: run.ritualKey, runId: run.id, ...step.params?.payload },
      { tags: ["ritual", "pulse", "reflex"], parentEventId: sourceEventId }
    );
    return;
  }

  // custom steps are intentionally rejected until a concrete handler registry exists.
  throw new Error("unsupported_ritual_step_kind");
}

export async function triggerRitual(
  ritualKey: string,
  options?: {
    source?: TriggerSource;
    sourceEvent?: SovereignEvent;
  }
): Promise<RitualRun> {
  ensureCanonLoaded();
  const def = rituals.get(ritualKey);
  if (!def) {
    const missing: RitualRun = {
      id: nextRunId(),
      ritualKey,
      status: "failed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      source: options?.source,
      steps: [],
    };
    pushRun(missing);
    publishRitualEvent("ritual.failed", "error", { ritualKey, runId: missing.id, error: "ritual_not_found" }, options?.sourceEvent?.id);
    return missing;
  }

  const stepRuns: RitualStepRun[] = def.steps.map((s, idx) => ({ index: idx, kind: s.kind, status: "pending" }));
  const run: RitualRun = {
    id: nextRunId(),
    ritualKey: def.key,
    status: "running",
    startedAt: new Date().toISOString(),
    source: options?.source,
    steps: stepRuns,
  };

  pushRun(run);

  const parentEventId = options?.sourceEvent?.id;
  if (options?.source?.type === "reflex") {
    publishRitualReflex("ritual.started", { ritualKey: def.key, runId: run.id }, parentEventId);
  } else {
    publishRitualEvent("ritual.started", "info", { ritualKey: def.key, runId: run.id }, parentEventId);
  }

  for (let idx = 0; idx < def.steps.length; idx += 1) {
    const step = def.steps[idx];
    const sr = stepRuns[idx];
    sr.status = "running";
    sr.startedAt = new Date().toISOString();
    try {
      await executeStep(step, run, sr, parentEventId);
      sr.status = "completed";
      sr.completedAt = new Date().toISOString();
      publishRitualEvent(
        "ritual.step.completed",
        "info",
        { ritualKey: def.key, runId: run.id, step: idx, kind: sr.kind },
        parentEventId
      );
    } catch (err) {
      sr.status = "failed";
      sr.completedAt = new Date().toISOString();
      sr.error = err instanceof Error ? err.message : "step_error";
      run.status = "failed";
      run.completedAt = new Date().toISOString();
      publishRitualEvent(
        "ritual.step.failed",
        "error",
        { ritualKey: def.key, runId: run.id, step: idx, kind: sr.kind, error: sr.error },
        parentEventId
      );
      publishRitualEvent("ritual.failed", "error", { ritualKey: def.key, runId: run.id }, parentEventId);
      return run;
    }
  }

  run.status = "completed";
  run.completedAt = new Date().toISOString();
  publishRitualEvent("ritual.completed", "info", { ritualKey: def.key, runId: run.id }, parentEventId);
  return run;
}
