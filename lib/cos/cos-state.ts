import type { CosSceneInstance } from "./cos-types";

const MAX_INSTANCES = 1200;

type GlobalCosState = {
  __xom3_cos_loaded__?: boolean;
  __xom3_cos_instances__?: CosSceneInstance[];
  __xom3_cos_seq__?: number;
};

function g(): GlobalCosState {
  return globalThis as any;
}

function getFs() {
  return require("fs") as typeof import("fs");
}
function getPath() {
  return require("path") as typeof import("path");
}

function storeFile() {
  const path = getPath();
  const dir = path.join(process.cwd(), ".xom3", "cos");
  const file = path.join(dir, "scenes.json");
  return { dir, file };
}

function load(): CosSceneInstance[] {
  const gg = g();
  if (gg.__xom3_cos_loaded__ && Array.isArray(gg.__xom3_cos_instances__)) return gg.__xom3_cos_instances__!;
  gg.__xom3_cos_loaded__ = true;
  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
      gg.__xom3_cos_instances__ = [];
      return gg.__xom3_cos_instances__!;
    }
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw || "[]");
    gg.__xom3_cos_instances__ = Array.isArray(parsed) ? (parsed as CosSceneInstance[]) : [];
  } catch {
    gg.__xom3_cos_instances__ = [];
  }
  return gg.__xom3_cos_instances__!;
}

function save(instances: CosSceneInstance[]) {
  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(instances.slice(-MAX_INSTANCES), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextInstanceId() {
  const gg = g();
  gg.__xom3_cos_seq__ = (gg.__xom3_cos_seq__ || 0) + 1;
  return `cos_${Date.now()}_${gg.__xom3_cos_seq__}`;
}

export function createSceneInstance(input: Omit<CosSceneInstance, "instanceId">) {
  const instances = load();
  const inst: CosSceneInstance = { ...input, instanceId: nextInstanceId() };
  instances.unshift(inst);
  if (instances.length > MAX_INSTANCES) instances.splice(MAX_INSTANCES);
  save(instances);
  return inst;
}

export function updateSceneInstance(instanceId: string, patch: Partial<CosSceneInstance>) {
  const instances = load();
  const idx = instances.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  instances[idx] = { ...instances[idx], ...patch };
  save(instances);
  return instances[idx];
}

export function getSceneInstance(instanceId: string) {
  return load().find((i) => i.instanceId === instanceId) || null;
}

export function listSceneInstances(limit = 120) {
  const lim = Math.max(1, Math.min(600, Number(limit) || 120));
  return load().slice(0, lim);
}

export function listRunningInstances() {
  return load().filter((i) => i.status === "running" || i.status === "paused");
}
