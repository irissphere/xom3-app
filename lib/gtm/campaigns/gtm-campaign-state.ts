import fs from "fs";
import path from "path";
import type { GtmCampaignInstance } from "./gtm-campaign-types";

const MAX_INSTANCES = 2000;
const storeDir = path.join(process.cwd(), ".xom3", "gtm-campaigns");
const filePath = path.join(storeDir, "campaign-instances.json");

type GlobalCampaignState = {
  __xom3_gtm_campaigns_loaded__?: boolean;
  __xom3_gtm_campaign_instances__?: GtmCampaignInstance[];
  __xom3_gtm_campaign_seq__?: number;
};

function g(): GlobalCampaignState {
  return globalThis as any;
}

function load(): GtmCampaignInstance[] {
  const gg = g();
  if (gg.__xom3_gtm_campaigns_loaded__ && Array.isArray(gg.__xom3_gtm_campaign_instances__)) {
    return gg.__xom3_gtm_campaign_instances__!;
  }
  gg.__xom3_gtm_campaigns_loaded__ = true;
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      gg.__xom3_gtm_campaign_instances__ = Array.isArray(parsed) ? (parsed as GtmCampaignInstance[]) : [];
    } else {
      gg.__xom3_gtm_campaign_instances__ = [];
    }
  } catch {
    gg.__xom3_gtm_campaign_instances__ = [];
  }
  return gg.__xom3_gtm_campaign_instances__!;
}

function save(instances: GtmCampaignInstance[]) {
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    fs.writeFileSync(filePath, JSON.stringify(instances.slice(-MAX_INSTANCES), null, 2), "utf-8");
  } catch {
    // best-effort
  }
}

function nextInstanceId() {
  const gg = g();
  gg.__xom3_gtm_campaign_seq__ = (gg.__xom3_gtm_campaign_seq__ || 0) + 1;
  return `gtm_cmp_${Date.now()}_${gg.__xom3_gtm_campaign_seq__}`;
}

export function createCampaignInstance(input: Omit<GtmCampaignInstance, "instanceId">) {
  const instances = load();
  const inst: GtmCampaignInstance = { ...input, instanceId: nextInstanceId() };
  instances.push(inst);
  if (instances.length > MAX_INSTANCES) instances.splice(0, instances.length - MAX_INSTANCES);
  save(instances);
  return inst;
}

export function updateCampaignInstance(instanceId: string, patch: Partial<GtmCampaignInstance>) {
  const instances = load();
  const idx = instances.findIndex((i) => i.instanceId === instanceId);
  if (idx < 0) return null;
  instances[idx] = { ...instances[idx], ...patch };
  save(instances);
  return instances[idx];
}

export function getCampaignInstance(instanceId: string) {
  return load().find((i) => i.instanceId === instanceId) || null;
}

export function listCampaignInstances(limit = 200) {
  const lim = Math.max(1, Math.min(500, Number(limit) || 200));
  return [...load()].sort((a, b) => b.startedAt - a.startedAt).slice(0, lim);
}

export function listCampaignInstancesForSubject(subjectId: string) {
  return load().filter((i) => i.subjectId === subjectId).sort((a, b) => b.startedAt - a.startedAt);
}

export function findCampaignStepByOutboundItemId(outboundItemId: string) {
  for (const inst of load()) {
    for (const step of inst.steps) {
      if (Array.isArray(step.outboundItemIds) && step.outboundItemIds.includes(outboundItemId)) {
        return { instance: inst, stepId: step.stepId };
      }
    }
  }
  return null;
}
