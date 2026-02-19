import type { CosBrainRoutingContext } from "./cos-brain-types";

type GlobalBrainState = {
  __xom3_cos_brain_loaded__?: boolean;
  __xom3_cos_brain_ctx__?: CosBrainRoutingContext | null;
};

function g(): GlobalBrainState {
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
  const dir = path.join(process.cwd(), ".xom3", "cos", "brain");
  const file = path.join(dir, "posture.json");
  return { dir, file };
}

function emptyCtx(): CosBrainRoutingContext {
  return {
    lastEvaluationAt: null,
    sceneWeights: {},
    graphWeights: {},
    routingHints: {},
    posture: null,
    activePolicies: [],
  };
}

export function getBrainContext(): CosBrainRoutingContext {
  const gg = g();
  if (gg.__xom3_cos_brain_ctx__) return gg.__xom3_cos_brain_ctx__!;
  if (gg.__xom3_cos_brain_loaded__) return gg.__xom3_cos_brain_ctx__ || emptyCtx();
  gg.__xom3_cos_brain_loaded__ = true;

  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(file)) {
      gg.__xom3_cos_brain_ctx__ = emptyCtx();
      return gg.__xom3_cos_brain_ctx__!;
    }
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw || "{}");
    gg.__xom3_cos_brain_ctx__ = { ...emptyCtx(), ...(parsed as any) };
    return gg.__xom3_cos_brain_ctx__!;
  } catch {
    gg.__xom3_cos_brain_ctx__ = emptyCtx();
    return gg.__xom3_cos_brain_ctx__!;
  }
}

export function setBrainContext(next: CosBrainRoutingContext) {
  const gg = g();
  gg.__xom3_cos_brain_ctx__ = next;
  try {
    const fs = getFs();
    const { dir, file } = storeFile();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // best-effort
  }
}
