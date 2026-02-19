import type { SovereignEvent, SovereignId } from "@/lib/sovereigns/event-bus";
import { subscribe, getSovereignEventHistory } from "@/lib/sovereigns/event-bus";
import { getPersona } from "@/lib/sovereigns/personas";
import { getCurrentEpoch } from "@/lib/constellation/epochs";
import { canTriggerChain, addActiveRun, nextReflexChainRunId, updateRun } from "./reflexChainState";
import { getReflexChainForRootType } from "./reflexChainRegistry";
import { publishReflexChainCinematic, publishReflexChainSignal } from "./reflexChainSignals";

type GlobalGuard = {
  __xom3_reflex_chains_bound__?: boolean;
  __xom3_reflex_chains_unsub__?: (() => void) | null;
};

function g(): GlobalGuard {
  return globalThis as any;
}

function tempoScale(epochId: string) {
  // Higher value => slower chain (more delay).
  switch (epochId) {
    case "stabilization":
      return 1.35;
    case "activation":
      return 1.2;
    case "gtm":
      return 0.95;
    case "ritual":
      return 0.9;
    case "operator":
      return 0.85;
    default:
      return 1.0;
  }
}

function colorForSovereign(id: SovereignId) {
  const persona = getPersona(String(id));
  return persona?.color || "rgba(148,163,184,0.85)";
}

function glyphForSovereign(id: SovereignId) {
  const persona = getPersona(String(id));
  return persona?.glyph || "\u25C9";
}

async function runChainFromRootEvent(event: SovereignEvent) {
  const chain = getReflexChainForRootType(event.type);
  if (!chain) return;

  if (!canTriggerChain(chain.id, chain.cooldownMs)) return;

  const epoch = getCurrentEpoch();
  const epochId = String(epoch.current?.id || "activation");
  const runId = nextReflexChainRunId("crx");
  const startedAt = Date.now();

  addActiveRun({
    runId,
    chainId: chain.id,
    rootEventId: event.id,
    startedAt,
    epochId,
    steps: chain.steps,
    status: "running",
  });

  const started = publishReflexChainSignal({
    type: "constellation.reflex.chain.started",
    payload: {
      chainId: chain.id,
      runId,
      rootEventId: event.id,
      rootType: event.type,
      epoch: epoch.current,
      steps: chain.steps,
      at: startedAt,
    },
    parentEventId: event.id,
  });

  const base = Math.max(60, chain.baseDelayMs);
  const stepDelay = Math.round(base * tempoScale(epochId));

  for (let i = 0; i < chain.steps.length - 1; i += 1) {
    const from = chain.steps[i];
    const to = chain.steps[i + 1];
    const delayMs = stepDelay * (i + 1);
    const intensity = Math.max(0.1, Math.min(1, chain.intensity * (1 - i * 0.07)));
    const color = colorForSovereign(to);
    const glyph = glyphForSovereign(to);

    setTimeout(() => {
      try {
        publishReflexChainSignal({
          type: "constellation.reflex.chain.propagated",
          payload: {
            chainId: chain.id,
            runId,
            stepIndex: i,
            from,
            to,
            epochId,
            at: Date.now(),
          },
          parentEventId: started.id,
        });

        publishReflexChainCinematic({
          runId,
          chainId: chain.id,
          stepIndex: i,
          from,
          to,
          color,
          glyph,
          intensity,
          delayMs,
          epochId,
          parentEventId: started.id,
        });

        updateRun(runId, { lastStepAt: Date.now() });
      } catch {
        // ignore
      }
    }, delayMs);
  }

  const totalDelay = stepDelay * (chain.steps.length - 1) + 40;
  setTimeout(() => {
    try {
      publishReflexChainSignal({
        type: "constellation.reflex.chain.completed",
        payload: { chainId: chain.id, runId, at: Date.now(), epochId },
        parentEventId: started.id,
      });
      updateRun(runId, { status: "completed" });
    } catch {
      updateRun(runId, { status: "failed" });
      publishReflexChainSignal({
        type: "constellation.reflex.chain.failed",
        severity: "warning",
        payload: { chainId: chain.id, runId, at: Date.now(), epochId },
        parentEventId: started.id,
      });
    }
  }, totalDelay);
}

function shouldHandle(event: SovereignEvent) {
  if (!event?.type) return false;
  if (String(event.type).startsWith("constellation.reflex.chain.")) return false;
  if (event.type === "reflex.chain.cinematic") return false;
  // Reflex roots are truth events that *cause* reflex handlers; we chain off them.
  return event.tags?.includes("reflex") === true;
}

export function ensureReflexChainsBound() {
  const gg = g();
  if (gg.__xom3_reflex_chains_bound__) return;
  gg.__xom3_reflex_chains_bound__ = true;

  // Backfill: only to warm the cooldown state (avoid immediate stampede on connect).
  const history = getSovereignEventHistory(120).slice().reverse();
  for (const evt of history) {
    if (!shouldHandle(evt)) continue;
    // Update cooldowns (no chain firing from backfill).
    const chain = getReflexChainForRootType(evt.type);
    if (chain) canTriggerChain(chain.id, chain.cooldownMs);
  }

  gg.__xom3_reflex_chains_unsub__ = subscribe((event) => {
    try {
      if (!shouldHandle(event)) return;
      void runChainFromRootEvent(event);
    } catch {
      // passive lane; ignore
    }
  });
}
