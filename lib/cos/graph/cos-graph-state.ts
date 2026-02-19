import type { CosGraphInstance } from "./cos-graph-types";

const MAX_INSTANCES = 900;

type GlobalCosGraphState = {
  __xom3_cos_graph_loaded__?: boolean;
  __xom3_cos_graph_instances__?: CosGraphInstance[];
  __xom3_cos_graph_seq__?: number;
};

function g(): GlobalCosGraphState {
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
  const file = path.join(dir, "graphs.json");
  return { dir, file };
}

function load(): CosGraphInstance[] {
  const gg = g();
  if (gg.__xom3_cos_graph_loaded__ && Array.isArray(gg.__xom3_cos_graph_instances__)) return gg.__xom3_cos_graph_instances__!;
  gg.__xom3_cos_graph_loaded__ = true;
  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
      gg.__xom3_cos_graph_instances__ = [];
      return gg.__xom3_cos_graph_instances__!;
    }
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw || "[]");
    gg.__xom3_cos_graph_instances__ = Array.isArray(parsed) ? (parsed as CosGraphInstance[]) : [];
  } catch {
    gg.__xom3_cos_graph_instances__ = [];
  }
  return gg.__xom3_cos_graph_instances__!;
}

function save(instances: CosGraphInstance[]) {
  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(instances.slice(0, MAX_INSTANCES), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextId() {
  const gg = g();
  gg.__xom3_cos_graph_seq__ = (gg.__xom3_cos_graph_seq__ || 0) + 1;
  return `cosg_${Date.now()}_${gg.__xom3_cos_graph_seq__}`;
}

export function createGraphInstance(input: Omit<CosGraphInstance, "instanceId">) {
  const instances = load();
  const inst: CosGraphInstance = { ...input, instanceId: nextId() };
  instances.unshift(inst);
  if (instances.length > MAX_INSTANCES) instances.splice(MAX_INSTANCES);
  save(instances);
  return inst;
}

export function updateGraphInstance(instanceId: string, patch: Partial<CosGraphInstance>) {
  const instances = load();
  const idx = instances.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  instances[idx] = { ...instances[idx], ...patch };
  save(instances);
  return instances[idx];
}

export function getGraphInstance(instanceId: string) {
  return load().find((i) => i.instanceId === instanceId) || null;
}

export function listGraphInstances(limit = 120) {
  const lim = Math.max(1, Math.min(600, Number(limit) || 120));
  return load().slice(0, lim);
}
