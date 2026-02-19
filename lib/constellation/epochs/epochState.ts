import { publish } from "@/lib/sovereigns/event-bus";
import { determineEpoch } from "./epochEngine";
import { deriveEpochContext } from "./epochSignals";
import type { ConstellationEpoch } from "./epochRegistry";

export type EpochSnapshot = {
  current: ConstellationEpoch;
  last: ConstellationEpoch | null;
  changedAt: number | null;
  reason?: string;
};

type GlobalEpochState = {
  snapshot: EpochSnapshot | null;
};

function gs(): GlobalEpochState {
  const g = globalThis as any;
  if (!g.__xom3_epoch_state__) {
    g.__xom3_epoch_state__ = { snapshot: null } satisfies GlobalEpochState;
  }
  return g.__xom3_epoch_state__ as GlobalEpochState;
}

function persistBestEffort(snapshot: EpochSnapshot) {
  if (typeof window !== "undefined") return;
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const dir = path.join(process.cwd(), ".xom3", "constellation-memory");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `epoch.json`);
    fs.writeFileSync(file, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function hydrateBestEffort(): EpochSnapshot | null {
  if (typeof window !== "undefined") return null;
  try {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const file = path.join(process.cwd(), ".xom3", "constellation-memory", "epoch.json");
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.current?.id) return null;
    return parsed as EpochSnapshot;
  } catch {
    return null;
  }
}

export function updateEpoch(reason?: string): EpochSnapshot {
  const g = gs();
  if (!g.snapshot) {
    const disk = hydrateBestEffort();
    if (disk) g.snapshot = disk;
  }

  const ctx = deriveEpochContext();
  const next = determineEpoch(ctx);
  const prev = g.snapshot?.current || null;

  if (!g.snapshot) {
    g.snapshot = { current: next, last: null, changedAt: Date.now(), reason: reason || "init" };
    persistBestEffort(g.snapshot);
    return g.snapshot;
  }

  if (prev && prev.id === next.id) {
    return g.snapshot;
  }

  const changedAt = Date.now();
  g.snapshot = {
    current: next,
    last: prev,
    changedAt,
    reason: reason || "inferred",
  };
  persistBestEffort(g.snapshot);

  // CE-1: epoch changes are additive constellation signals.
  const evt = publish({
    sovereign: "cockpit",
    type: "constellation.epoch.changed",
    severity: "info",
    payload: {
      from: prev,
      to: next,
      changedAt,
      reason: g.snapshot.reason,
      context: ctx,
    },
    tags: ["epoch", "constellation"],
  });

  // OET-1: transition ceremony (fire-and-forget).
  void import("@/lib/constellation/epochTransitions")
    .then(({ runEpochTransition }) => runEpochTransition({ from: prev, to: next, changedAt, reason: g.snapshot?.reason, sourceEventId: evt.id }))
    .catch(() => {});

  return g.snapshot;
}

export function getCurrentEpoch(): EpochSnapshot {
  const g = gs();
  if (!g.snapshot) {
    const disk = hydrateBestEffort();
    if (disk) g.snapshot = disk;
  }
  return g.snapshot || updateEpoch("bootstrap");
}
