export { gtmCampaigns, getGtmCampaignById } from "./gtm-campaign-registry";
export { ingestCampaignEntry, ensureGtmCampaignsBound } from "./gtm-campaign-engine";
export {
  listCampaignInstances,
  listCampaignInstancesForSubject,
  getCampaignInstance,
} from "./gtm-campaign-state";
import { listCampaignInstances as _listCampaignInstances } from "./gtm-campaign-state";
import { getGtmCampaignById } from "./gtm-campaign-registry";
export type {
  GtmCampaign,
  GtmCampaignStep,
  GtmCampaignEntryEvent,
  GtmCampaignInstance,
  GtmCampaignEntryEventType,
  GtmCampaignEntrySource,
} from "./gtm-campaign-types";

export function getCampaignSummary() {
  const instances = _listCampaignInstances(500);
  const byCampaign = new Map<
    string,
    { campaignId: string; campaignName: string; totalCount: number; activeCount: number; completedCount: number; cancelledCount: number }
  >();

  for (const inst of instances) {
    const existing =
      byCampaign.get(inst.campaignId) ??
      (() => {
        const c = getGtmCampaignById(inst.campaignId);
        const row = {
          campaignId: inst.campaignId,
          campaignName: c?.name || inst.campaignId,
          totalCount: 0,
          activeCount: 0,
          completedCount: 0,
          cancelledCount: 0,
        };
        byCampaign.set(inst.campaignId, row);
        return row;
      })();

    existing.totalCount++;
    if (inst.status === "active") existing.activeCount++;
    else if (inst.status === "completed") existing.completedCount++;
    else if (inst.status === "cancelled") existing.cancelledCount++;
  }

  return Array.from(byCampaign.values()).sort((a, b) => b.activeCount - a.activeCount);
}
