import { createSovereign } from "./kernel";

async function syncTick() {
  const { syncPulseTick } = await import("@/lib/sovereigns/sync-pulse");
  return syncPulseTick();
}

async function systemTick() {
  const { systemHeartbeatTick } = await import("@/lib/system/system-sovereign");
  return systemHeartbeatTick();
}

async function broadcastTick() {
  const { broadcastQueueTick } = await import("@/lib/broadcast/broadcast-sovereign");
  return broadcastQueueTick();
}

async function uoiTick() {
  const { uoiHeartbeatTick } = await import("@/lib/uoi/event-loop");
  return uoiHeartbeatTick();
}

export const sovereigns = {
  sync: createSovereign({
    id: "sync",
    label: "Sync Sovereign",
    tick: syncTick,
    intervalMs: 5000,
    onError: () => {},
  }),
  rituals: createSovereign({
    id: "rituals",
    label: "Ritual Sovereign",
  }),
  system: createSovereign({
    id: "system",
    label: "System Sovereign",
    tick: systemTick,
    intervalMs: 5000,
    onError: () => {},
  }),
  broadcast: createSovereign({
    id: "broadcast",
    label: "Broadcast Sovereign",
    tick: broadcastTick,
    intervalMs: 5000,
    onError: () => {},
  }),
  uoi: createSovereign({
    id: "uoi",
    label: "UOI Sovereign",
    tick: uoiTick,
    intervalMs: 5000,
    onError: () => {},
  }),
  hse: createSovereign({
    id: "hse",
    label: "HSE Sovereign",
  }),
} as const;

export function getSovereign(id: string) {
  return (sovereigns as any)[id];
}

export function getAllSovereigns() {
  return Object.values(sovereigns);
}

export async function startSovereign(id: keyof typeof sovereigns, options?: { intervalMs?: number }) {
  if (id === "system" && typeof options?.intervalMs === "number") {
    const { setSystemHeartbeatIntervalMs } = await import("@/lib/system/system-sovereign");
    setSystemHeartbeatIntervalMs(options.intervalMs);
  }
  if (id === "broadcast" && typeof options?.intervalMs === "number") {
    const { setBroadcastIntervalMs } = await import("@/lib/broadcast/broadcast-sovereign");
    setBroadcastIntervalMs(options.intervalMs);
  }
  if (id === "uoi" && typeof options?.intervalMs === "number") {
    const { setUoiIntervalMs } = await import("@/lib/uoi/event-loop");
    setUoiIntervalMs(options.intervalMs);
  }
  await sovereigns[id].start(options);
}
