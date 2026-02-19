import { publish, subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { cosScenes, getScene } from "./cos-scenes";
import { getCrew } from "./cos-crews";
import type { CosScene, CosSceneInstance, CosSceneStep } from "./cos-types";
import { createSceneInstance, getSceneInstance, listRunningInstances, updateSceneInstance } from "./cos-state";
import { cosSceneCompleted, cosSceneFailed, cosScenePaused, cosSceneStarted, cosSceneStepCompleted } from "./cos-signals";

type GlobalGuard = {
  __xom3_cos_bound__?: boolean;
  __xom3_cos_unsub__?: (() => void) | null;
  __xom3_cos_timer__?: NodeJS.Timeout | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function matchTrigger(scene: CosScene, event: { type: string; payload?: any }) {
  return scene.triggers.some((t) => t.eventType === event.type);
}

async function runStep(step: CosSceneStep, inst: CosSceneInstance) {
  const now = Date.now();

  if (step.type === "emitSignal") {
    publish({
      sovereign: "cockpit",
      type: String(step.params?.type || "cos.emit"),
      severity: "info",
      payload: step.params?.payload || {},
      tags: ["cos"],
      parentEventId: inst.context?.trigger?.payload?.eventId,
    });
    return { ok: true, output: { emitted: step.params?.type } };
  }

  if (step.type === "startRitual") {
    const ritualKey = String(step.params?.ritualKey || "");
    if (!ritualKey) return { ok: false, error: "ritualKey_required" };
    const { triggerRitual } = await import("@/lib/rituals/engine");
    const run = await triggerRitual(ritualKey, { source: { type: "operator" } });
    return { ok: true, output: { ritualKey, runId: run.id, status: run.status } };
  }

  if (step.type === "startCampaign") {
    const campaignId = String(step.params?.campaignId || "");
    if (!campaignId) return { ok: false, error: "campaignId_required" };
    const subject = inst.context.subject || { type: "generic", id: inst.instanceId };
    const { getGtmCampaignById, ingestCampaignEntry, ensureGtmCampaignsBound } = await import("@/lib/gtm/campaigns");
    ensureGtmCampaignsBound();
    const campaign = getGtmCampaignById(campaignId);
    if (!campaign) return { ok: false, error: "campaign_not_found" };
    const trig = campaign.entryTriggers[0] || { eventType: "contactCreated", source: "manual" };
    const result = ingestCampaignEntry({
      eventType: trig.eventType as any,
      source: trig.source as any,
      subjectType: subject.type as any,
      subjectId: subject.id,
      at: now,
      payload: { cos: true, sceneId: inst.sceneId, instanceId: inst.instanceId },
    });
    return { ok: true, output: { campaignId, startedCount: result.startedCount } };
  }

  if (step.type === "enqueueOutbound") {
    const platforms = Array.isArray(step.params?.platforms) ? step.params!.platforms : ["generic"];
    const text = String(step.params?.text || "");
    const persona = String(step.params?.persona || "broadcast");
    const cloneVoice = String(step.params?.cloneVoice || "operator_plain");
    const scheduleMode = (step.params?.scheduleMode === "schedule" ? "schedule" : "sendNow") as "sendNow" | "schedule";
    const scheduledAt = typeof step.params?.scheduledAt === "string" ? step.params?.scheduledAt : undefined;
    const { enqueueOutboundItem } = await import("@/lib/gtm/outbound");
    const enq = enqueueOutboundItem({
      platforms,
      content: { text, mediaRef: null },
      persona,
      cloneVoice,
      intent: "gtm",
      scheduleMode,
      scheduledAt,
    } as any);
    return { ok: true, output: { count: enq.count, itemIds: enq.items.map((i) => i.id) } };
  }

  if (step.type === "setHudState") {
    const state = String(step.params?.state || "default");
    publish({ sovereign: "cockpit", type: "cos.hud.state", severity: "info", payload: { state, instanceId: inst.instanceId }, tags: ["cos", "hud"] });
    return { ok: true, output: { state } };
  }

  if (step.type === "setEpoch") {
    const epochId = String(step.params?.epochId || "");
    publish({ sovereign: "cockpit", type: "cos.epoch.requested", severity: "info", payload: { epochId, instanceId: inst.instanceId }, tags: ["cos", "epoch"] });
    // Best-effort: re-run epoch inference with COS reason (does not force epoch).
    try {
      const { updateEpoch } = await import("@/lib/constellation/epochs");
      updateEpoch(`cos:setEpoch:${epochId}`);
    } catch {
      // ignore
    }
    return { ok: true, output: { epochId } };
  }

  if (step.type === "waitForDuration") {
    const durationMs = Math.max(0, Number(step.params?.durationMs || 0));
    return { ok: true, output: { wait: "duration", durationMs }, wait: { kind: "duration" as const, untilAt: now + durationMs } };
  }

  if (step.type === "waitForEvent") {
    const eventType = String(step.params?.eventType || "");
    if (!eventType) return { ok: false, error: "eventType_required" };
    return { ok: true, output: { wait: "event", eventType }, wait: { kind: "event" as const, eventType } };
  }

  if (step.type === "runSubscene") {
    const sceneId = String(step.params?.sceneId || "");
    if (!sceneId) return { ok: false, error: "sceneId_required" };
    const sub = await startScene(sceneId, { sourceEvent: { type: "cos.subscene", payload: { parent: inst.instanceId } } });
    return { ok: true, output: { subsceneInstanceId: sub.instanceId } };
  }

  return { ok: false, error: "unsupported_step_type" };
}

export async function advanceSceneInstance(instanceId: string) {
  const inst = getSceneInstance(instanceId);
  if (!inst) return null;
  if (inst.status !== "running") return inst;
  const scene = getScene(inst.sceneId);
  if (!scene) return inst;

  const stepIndex = inst.currentStepIndex;
  const step = scene.steps[stepIndex];
  if (!step) {
    const done = updateSceneInstance(instanceId, { status: "completed", completedAt: Date.now() });
    if (done) cosSceneCompleted(inst.sceneId, instanceId);
    return done;
  }

  const nextSteps = inst.steps.slice();
  const stepState = nextSteps[stepIndex];
  if (!stepState) return inst;
  stepState.status = "running";
  stepState.startedAt = Date.now();
  updateSceneInstance(instanceId, { steps: nextSteps });

  try {
    const result = await runStep(step, inst);
    stepState.status = "completed";
    stepState.completedAt = Date.now();
    stepState.output = result.output;
    cosSceneStepCompleted(instanceId, step.stepId);

    const nextPatch: Partial<CosSceneInstance> = {
      steps: nextSteps,
      currentStepIndex: stepIndex + 1,
      waitingFor: undefined,
    };

    if ((result as any).wait) {
      const wait = (result as any).wait as CosSceneInstance["waitingFor"];
      nextPatch.status = "paused";
      nextPatch.waitingFor = wait;
      updateSceneInstance(instanceId, nextPatch);
      cosScenePaused(inst.sceneId, instanceId, wait.kind === "duration" ? "waitForDuration" : "waitForEvent");
      if (wait.kind === "duration" && typeof wait.untilAt === "number") {
        armTimer();
      }
      return getSceneInstance(instanceId);
    }

    const updated = updateSceneInstance(instanceId, nextPatch);
    // Continue immediately until a wait or completion.
    return updated ? await advanceSceneInstance(instanceId) : updated;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "step_failed";
    stepState.status = "failed";
    stepState.completedAt = Date.now();
    stepState.error = msg;
    const failed = updateSceneInstance(instanceId, { status: "failed", lastError: { at: Date.now(), message: msg }, steps: nextSteps });
    cosSceneFailed(inst.sceneId, instanceId, msg);
    return failed;
  }
}

export async function startScene(sceneId: string, input?: { sourceEvent?: { type: string; payload?: any; source?: string } }) {
  const scene = getScene(sceneId);
  if (!scene) throw new Error("scene_not_found");
  const crew = getCrew(scene.crewId);
  const now = Date.now();

  const inst = createSceneInstance({
    sceneId: scene.id,
    crewId: scene.crewId,
    status: "running",
    startedAt: now,
    currentStepIndex: 0,
    context: {
      subject: input?.sourceEvent?.payload?.subject,
      trigger: { eventType: input?.sourceEvent?.type || "manual", source: input?.sourceEvent?.source, at: now, payload: input?.sourceEvent?.payload },
      metadata: { crew: crew?.members || [] },
    },
    steps: scene.steps.map((s) => ({ stepId: s.stepId, type: s.type, status: "pending" })),
  });

  cosSceneStarted(scene.id, inst.instanceId);
  await advanceSceneInstance(inst.instanceId);
  return getSceneInstance(inst.instanceId)!;
}

function armTimer() {
  const gg = g();
  if (gg.__xom3_cos_timer__) return;

  const running = listRunningInstances();
  const now = Date.now();
  const nextDue = running
    .filter((i) => i.status === "paused" && i.waitingFor?.kind === "duration" && typeof i.waitingFor.untilAt === "number")
    .sort((a, b) => (a.waitingFor!.untilAt! - b.waitingFor!.untilAt!))[0];
  if (!nextDue) return;
  const delay = Math.max(0, Math.min(60 * 60 * 1000, nextDue.waitingFor!.untilAt! - now));
  gg.__xom3_cos_timer__ = setTimeout(() => {
    gg.__xom3_cos_timer__ = null;
    void resumeDueScenes().catch(() => {});
  }, delay);
}

async function resumeDueScenes() {
  const now = Date.now();
  const running = listRunningInstances();
  const due = running.filter((i) => i.status === "paused" && i.waitingFor?.kind === "duration" && (i.waitingFor.untilAt || 0) <= now);
  for (const inst of due) {
    updateSceneInstance(inst.instanceId, { status: "running", waitingFor: undefined });
    await advanceSceneInstance(inst.instanceId);
  }
  armTimer();
}

function maybeResumeOnEvent(event: SovereignEvent) {
  const waiting = listRunningInstances().filter((i) => i.status === "paused" && i.waitingFor?.kind === "event" && i.waitingFor.eventType === event.type);
  if (waiting.length === 0) return;
  for (const inst of waiting) {
    updateSceneInstance(inst.instanceId, { status: "running", waitingFor: undefined, context: { ...inst.context, flags: { ...(inst.context.flags || {}), lastEvent: event.type } } });
    void advanceSceneInstance(inst.instanceId).catch(() => {});
  }
}

export function ensureCosBound() {
  const gg = g();
  if (gg.__xom3_cos_bound__) return;
  gg.__xom3_cos_bound__ = true;

  gg.__xom3_cos_unsub__ = subscribe((event) => {
    try {
      // Resume scenes waiting for events
      maybeResumeOnEvent(event);

      // Start scenes on triggers
      for (const scene of cosScenes) {
        if (!matchTrigger(scene, { type: event.type, payload: event.payload })) continue;
        void startScene(scene.id, { sourceEvent: { type: event.type, payload: { ...event.payload, eventId: event.id } } }).catch(() => {});
      }
    } catch {
      // passive lane
    }
  });

  armTimer();
}

export function getCosStatus() {
  const gg = g();
  return { bound: Boolean(gg.__xom3_cos_bound__), running: listRunningInstances().length };
}
