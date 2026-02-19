// Broadcast Engine - Revenue Attribution: Optimization Feedback
// Feeds revenue intelligence back into Trend Engine, Content Engine, Auto-Posting Engine, Lead Engine, Funnel Engine

import { ContentROI, PlatformROI, TrendROI, AgentROI, FunnelEntryPointROI } from "./roi-calculator";
import { recordContentPerformance } from "../learning-engine";
import { ContentPerformance } from "../learning-engine";

/**
 * Feed content ROI back into Content Engine
 */
export async function feedContentROIToContentEngine(
  contentROIs: ContentROI[]
): Promise<void> {
  // Get top performing content
  const topPerformers = contentROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);
  
  // Record performance for learning engine
  for (const roi of topPerformers) {
    const performance: ContentPerformance = {
      contentId: roi.postId,
      platform: roi.platform as any,
      reach: roi.totalViews,
      engagement: roi.totalEngagement,
      leads: roi.totalLeads,
      conversionRate: roi.conversionRate,
      timestamp: new Date().toISOString(),
      metadata: {
        format: "video", // In production, get from post data
        captionStyle: "trend_aligned", // In production, get from post data
        hashtags: [], // In production, get from post data
        cta: "", // In production, get from post data
        topics: [] // In production, get from post data
      }
    };
    
    recordContentPerformance(performance);
  }
  
  // Emit signal for content optimization
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "content_roi_analyzed",
    payload: {
      topPerformers: topPerformers.map(r => ({
        postId: r.postId,
        platform: r.platform,
        roi: r.roi,
        conversionRate: r.conversionRate,
        revenuePerView: r.revenuePerView
      }))
    },
    priority: "medium"
  });
}

/**
 * Feed platform ROI back into Auto-Posting Engine
 */
export async function feedPlatformROIToAutoPostingEngine(
  platformROIs: PlatformROI[]
): Promise<void> {
  // Get top performing platforms
  const topPlatforms = platformROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);
  
  // Emit signal for posting strategy optimization
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "platform_roi_analyzed",
    payload: {
      topPlatforms: topPlatforms.map(r => ({
        platform: r.platform,
        roi: r.roi,
        conversionRate: r.conversionRate,
        revenuePerPost: r.revenuePerPost,
        recommendation: "increase_posting" // In production, calculate recommendation
      }))
    },
    priority: "medium"
  });
}

/**
 * Feed trend ROI back into Trend Engine
 */
export async function feedTrendROIToTrendEngine(
  trendROIs: TrendROI[]
): Promise<void> {
  // Get top performing trends
  const topTrends = trendROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);
  
  // Emit signal for trend optimization
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "trend_roi_analyzed",
    payload: {
      topTrends: topTrends.map(r => ({
        trendId: r.trendId,
        trendType: r.trendType,
        roi: r.roi,
        conversionRate: r.conversionRate,
        revenuePerPost: r.revenuePerPost,
        recommendation: "capitalize" // In production, calculate recommendation
      }))
    },
    priority: "medium"
  });
}

/**
 * Feed agent ROI back into Agent Assignment
 */
export async function feedAgentROIToAgentAssignment(
  agentROIs: AgentROI[]
): Promise<void> {
  // Get top performing agents
  const topAgents = agentROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 10);
  
  // Emit signal for agent assignment optimization
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_roi_analyzed",
    payload: {
      topAgents: topAgents.map(r => ({
        agentId: r.agentId,
        roi: r.roi,
        conversionRate: r.conversionRate,
        avgRevenuePerLead: r.avgRevenuePerLead,
        recommendation: "prioritize" // In production, calculate recommendation
      }))
    },
    priority: "medium"
  });
}

/**
 * Feed funnel ROI back into Funnel Engine
 */
export async function feedFunnelROIToFunnelEngine(
  funnelROIs: FunnelEntryPointROI[]
): Promise<void> {
  // Get top performing entry points
  const topEntryPoints = funnelROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);
  
  // Emit signal for funnel optimization
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "funnel_roi_analyzed",
    payload: {
      topEntryPoints: topEntryPoints.map(r => ({
        entryPoint: r.entryPoint,
        roi: r.roi,
        conversionRate: r.conversionRate,
        avgRevenuePerLead: r.avgRevenuePerLead,
        recommendation: "optimize" // In production, calculate recommendation
      }))
    },
    priority: "medium"
  });
}

/**
 * Feed all ROI data back into all engines
 */
export async function feedAllROIToEngines(
  contentROIs: ContentROI[],
  platformROIs: PlatformROI[],
  trendROIs: TrendROI[],
  agentROIs: AgentROI[],
  funnelROIs: FunnelEntryPointROI[]
): Promise<void> {
  await Promise.all([
    feedContentROIToContentEngine(contentROIs),
    feedPlatformROIToAutoPostingEngine(platformROIs),
    feedTrendROIToTrendEngine(trendROIs),
    feedAgentROIToAgentAssignment(agentROIs),
    feedFunnelROIToFunnelEngine(funnelROIs)
  ]);
}
