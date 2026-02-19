// Broadcast Engine - Revenue Attribution Engine
// The value core that answers: "Which content makes us money?"

import { RevenueEvent, trackRevenueEvent, mapRevenueToConversion, RevenueAttribution, calculateAttributedRevenue } from "./revenue-attribution/revenue-tracker";
import { 
  calculateContentROI, 
  calculatePlatformROI, 
  calculateTrendROI, 
  calculateAgentROI, 
  calculateFunnelEntryPointROI,
  ContentROI,
  PlatformROI,
  TrendROI,
  AgentROI,
  FunnelEntryPointROI
} from "./revenue-attribution/roi-calculator";
import { feedAllROIToEngines } from "./revenue-attribution/optimization-feedback";
import { ConversionData } from "./agent-workflow/close";
import { LeadObject } from "./funnel-modules/lead-intake";

export interface RevenueAttributionResult {
  revenueId: string;
  attribution: RevenueAttribution;
  contentROI?: ContentROI;
  platformROI?: PlatformROI;
  trendROI?: TrendROI;
  agentROI?: AgentROI;
  funnelROI?: FunnelEntryPointROI;
}

/**
 * Attribute revenue to broadcast content
 */
export async function attributeRevenue(
  revenue: RevenueEvent,
  conversion: ConversionData,
  lead: LeadObject
): Promise<RevenueAttributionResult> {
  // Map revenue to conversion
  const attribution = mapRevenueToConversion(revenue, conversion);
  
  // Calculate ROI for content
  const contentROI = calculateContentROI(
    attribution.postId || "",
    attribution.platform,
    [attribution],
    [conversion],
    {} // In production, fetch engagement data
  );
  
  // Calculate ROI for platform
  const platformROI = calculatePlatformROI(
    attribution.platform,
    [attribution],
    [conversion],
    [{ postId: attribution.postId || "", views: 0, engagement: 0 }]
  );
  
  // Calculate ROI for trend (if applicable)
  let trendROI: TrendROI | undefined;
  if (attribution.trendId) {
    trendROI = calculateTrendROI(
      attribution.trendId,
      "breakout", // In production, get from trend data
      [attribution],
      [conversion],
      [{ postId: attribution.postId || "" }]
    );
  }
  
  // Calculate ROI for agent
  const agentROI = calculateAgentROI(
    revenue.agentId,
    [conversion],
    [attribution]
  );
  
  // Calculate ROI for funnel entry point
  const funnelROI = calculateFunnelEntryPointROI(
    conversion.entryPoint,
    [conversion],
    [attribution]
  );
  
  return {
    revenueId: revenue.id,
    attribution,
    contentROI,
    platformROI,
    trendROI,
    agentROI,
    funnelROI
  };
}

/**
 * Process revenue event and attribute to broadcast content
 */
export async function processRevenueEvent(
  clientId: string,
  agentId: string,
  amount: number,
  source: RevenueEvent["source"],
  conversion: ConversionData,
  lead: LeadObject,
  metadata?: {
    planType?: string;
    commissionRate?: number;
    invoiceId?: string;
    billingRecordId?: string;
    hpeStage?: string;
  }
): Promise<RevenueAttributionResult> {
  // Track revenue event
  const revenue = await trackRevenueEvent(
    clientId,
    agentId,
    amount,
    source,
    metadata
  );
  
  // Attribute revenue
  const result = await attributeRevenue(revenue, conversion, lead);
  
  // Feed ROI back into engines
  if (result.contentROI && result.platformROI && result.agentROI && result.funnelROI) {
    await feedAllROIToEngines(
      [result.contentROI],
      [result.platformROI],
      result.trendROI ? [result.trendROI] : [],
      [result.agentROI],
      [result.funnelROI]
    );
  }
  
  return result;
}

/**
 * Get revenue attribution summary
 */
export function getRevenueAttributionSummary(
  attributions: RevenueAttribution[]
): {
  totalRevenue: number;
  totalAttributedRevenue: number;
  byPlatform: Record<string, number>;
  byPost: Record<string, number>;
  byTrend: Record<string, number>;
  byAgent: Record<string, number>;
  byEntryPoint: Record<string, number>;
} {
  const totalRevenue = attributions.reduce((sum, a) => sum + a.amount, 0);
  
  // Calculate attributed revenue using weights
  const totalAttributedRevenue = attributions.reduce((sum, a) => {
    let attribution = 0;
    
    attribution += a.amount * a.attribution.firstTouch.weight;
    attribution += a.amount * a.attribution.leadTouch.weight;
    attribution += a.amount * a.attribution.funnelTouch.weight;
    attribution += a.amount * a.attribution.closeTouch.weight;
    
    if (a.attribution.trendTouch) {
      attribution += a.amount * a.attribution.trendTouch.weight;
    }
    
    return sum + attribution;
  }, 0);
  
  // Breakdown by platform
  const byPlatform: Record<string, number> = {};
  for (const a of attributions) {
    if (!byPlatform[a.platform]) {
      byPlatform[a.platform] = 0;
    }
    byPlatform[a.platform] += a.amount * (
      a.attribution.firstTouch.weight +
      a.attribution.leadTouch.weight +
      a.attribution.funnelTouch.weight +
      a.attribution.closeTouch.weight
    );
  }
  
  // Breakdown by post
  const byPost: Record<string, number> = {};
  for (const a of attributions) {
    const postId = a.postId || "unknown";
    if (!byPost[postId]) {
      byPost[postId] = 0;
    }
    byPost[postId] += a.amount * (
      (a.attribution.firstTouch.postId === postId ? a.attribution.firstTouch.weight : 0) +
      (a.attribution.leadTouch.postId === postId ? a.attribution.leadTouch.weight : 0) +
      (a.attribution.funnelTouch.postId === postId ? a.attribution.funnelTouch.weight : 0) +
      (a.attribution.closeTouch.postId === postId ? a.attribution.closeTouch.weight : 0)
    );
  }
  
  // Breakdown by trend
  const byTrend: Record<string, number> = {};
  for (const a of attributions) {
    if (a.trendId) {
      if (!byTrend[a.trendId]) {
        byTrend[a.trendId] = 0;
      }
      byTrend[a.trendId] += a.amount * (a.attribution.trendTouch?.weight || 0);
    }
  }
  
  // Breakdown by agent
  const byAgent: Record<string, number> = {};
  for (const a of attributions) {
    if (!byAgent[a.agentId]) {
      byAgent[a.agentId] = 0;
    }
    byAgent[a.agentId] += a.amount;
  }
  
  // Breakdown by entry point
  const byEntryPoint: Record<string, number> = {};
  for (const a of attributions) {
    const entryPoint = a.funnelPath[0]?.stage || "unknown";
    if (!byEntryPoint[entryPoint]) {
      byEntryPoint[entryPoint] = 0;
    }
    byEntryPoint[entryPoint] += a.amount;
  }
  
  return {
    totalRevenue,
    totalAttributedRevenue,
    byPlatform,
    byPost,
    byTrend,
    byAgent,
    byEntryPoint
  };
}

/**
 * Get content ROI ranking
 */
export function getContentROIRanking(
  contentROIs: ContentROI[],
  limit: number = 20
): ContentROI[] {
  return contentROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
}

/**
 * Get platform ROI ranking
 */
export function getPlatformROIRanking(
  platformROIs: PlatformROI[],
  limit: number = 10
): PlatformROI[] {
  return platformROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
}

/**
 * Get trend ROI ranking
 */
export function getTrendROIRanking(
  trendROIs: TrendROI[],
  limit: number = 10
): TrendROI[] {
  return trendROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, limit);
}
