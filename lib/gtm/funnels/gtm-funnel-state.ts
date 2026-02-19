import fs from "fs";
import path from "path";
import type { GtmFunnelEntityState } from "./gtm-funnel-types";

const MAX_ENTITIES = 4000;
const storeDir = path.join(process.cwd(), ".xom3", "gtm-funnels");
const filePath = path.join(storeDir, "funnel-entities.json");

type GlobalFunnelState = {
  __xom3_gtm_funnels_loaded__?: boolean;
  __xom3_gtm_funnel_entities__?: GtmFunnelEntityState[];
};

function g(): GlobalFunnelState {
  return globalThis as any;
}

function load(): GtmFunnelEntityState[] {
  const gg = g();
  if (gg.__xom3_gtm_funnels_loaded__ && Array.isArray(gg.__xom3_gtm_funnel_entities__)) {
    return gg.__xom3_gtm_funnel_entities__!;
  }
  gg.__xom3_gtm_funnels_loaded__ = true;
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      gg.__xom3_gtm_funnel_entities__ = Array.isArray(parsed) ? (parsed as GtmFunnelEntityState[]) : [];
    } else {
      gg.__xom3_gtm_funnel_entities__ = [];
    }
  } catch {
    gg.__xom3_gtm_funnel_entities__ = [];
  }
  return gg.__xom3_gtm_funnel_entities__!;
}

function save(entities: GtmFunnelEntityState[]) {
  fs.mkdirSync(storeDir, { recursive: true });
  try {
    fs.writeFileSync(filePath, JSON.stringify(entities.slice(-MAX_ENTITIES), null, 2), "utf-8");
  } catch {
    // best-effort
  }
}

export function upsertFunnelEntityState(next: GtmFunnelEntityState) {
  const entities = load();
  const idx = entities.findIndex((e) => e.entityId === next.entityId && e.funnelId === next.funnelId);
  if (idx >= 0) entities[idx] = next;
  else entities.push(next);
  if (entities.length > MAX_ENTITIES) entities.splice(0, entities.length - MAX_ENTITIES);
  save(entities);
  return next;
}

export function getFunnelEntityState(entityId: string, funnelId?: string) {
  const entities = load();
  if (funnelId) return entities.find((e) => e.entityId === entityId && e.funnelId === funnelId) || null;
  return entities.find((e) => e.entityId === entityId) || null;
}

export function listFunnelEntities(limit = 300) {
  const lim = Math.max(1, Math.min(800, Number(limit) || 300));
  return [...load()].sort((a, b) => b.enteredAt - a.enteredAt).slice(0, lim);
}
