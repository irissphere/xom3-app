// Broadcast Engine - Optimization Loop: Performance Analyzer
// Evaluates content performance, posting performance, trend performance, agent performance

import { ContentPerformance, getBestPerformingPatterns, getLearningMemory } from "../learning-engine";
import { ContentROI, PlatformROI, TrendROI, AgentROI, FunnelEntryPointROI } from "../revenue-attribution/roi-calculator";
import { ConversionData } from "../agent-workflow/close";

export interface PerformanceAnalysis {
  winners: {
    content: ContentROI[];
    platforms: PlatformROI[];
    trends: TrendROI[];
    agents: AgentROI[];
    funnelEntryPoints: FunnelEntryPointROI[];
  };
  losers: {
    content: ContentROI[];
    platforms: PlatformROI[];
    trends: TrendROI[];
    agents: AgentROI[];
    funnelEntryPoints: FunnelEntryPointROI[];
  };
  anomalies: Array<{
    type: string;
    description: string;
    severity: "high" | "medium" | "low";
    recommendation: string;
  }>;
  opportunities: Array<{
    type: string;
    description: string;
    potentialImpact: "high" | "medium" | "low";
    recommendation: string;
  }>;
}

/**
 * Analyze content performance
 */
export function analyzeContentPerformance(
  contentROIs: ContentROI[],
  threshold: number = 100 // Minimum ROI to be a winner
): {
  winners: ContentROI[];
  losers: ContentROI[];
} {
  const winners = contentROIs.filter(r => r.roi >= threshold);
  const losers = contentROIs.filter(r => r.roi < threshold && r.roi > 0);
  
  return { winners, losers };
}

/**
 * Analyze platform performance
 */
export function analyzePlatformPerformance(
  platformROIs: PlatformROI[],
  threshold: number = 500 // Minimum ROI to be a winner
): {
  winners: PlatformROI[];
  losers: PlatformROI[];
} {
  const winners = platformROIs.filter(r => r.roi >= threshold);
  const losers = platformROIs.filter(r => r.roi < threshold && r.roi > 0);
  
  return { winners, losers };
}

/**
 * Analyze trend performance
 */
export function analyzeTrendPerformance(
  trendROIs: TrendROI[],
  threshold: number = 200 // Minimum ROI to be a winner
): {
  winners: TrendROI[];
  losers: TrendROI[];
} {
  const winners = trendROIs.filter(r => r.roi >= threshold);
  const losers = trendROIs.filter(r => r.roi < threshold && r.roi > 0);
  
  return { winners, losers };
}

/**
 * Analyze agent performance
 */
export function analyzeAgentPerformance(
  agentROIs: AgentROI[],
  threshold: number = 0.15 // Minimum conversion rate to be a winner
): {
  winners: AgentROI[];
  losers: AgentROI[];
} {
  const winners = agentROIs.filter(r => r.conversionRate >= threshold);
  const losers = agentROIs.filter(r => r.conversionRate < threshold && r.conversionRate > 0);
  
  return { winners, losers };
}

/**
 * Analyze funnel performance
 */
export function analyzeFunnelPerformance(
  funnelROIs: FunnelEntryPointROI[],
  threshold: number = 0.1 // Minimum conversion rate to be a winner
): {
  winners: FunnelEntryPointROI[];
  losers: FunnelEntryPointROI[];
} {
  const winners = funnelROIs.filter(r => r.conversionRate >= threshold);
  const losers = funnelROIs.filter(r => r.conversionRate < threshold && r.conversionRate > 0);
  
  return { winners, losers };
}

/**
 * Detect anomalies
 */
export function detectAnomalies(
  contentROIs: ContentROI[],
  platformROIs: PlatformROI[],
  conversions: ConversionData[]
): Array<{
  type: string;
  description: string;
  severity: "high" | "medium" | "low";
  recommendation: string;
}> {
  const anomalies: Array<{
    type: string;
    description: string;
    severity: "high" | "medium" | "low";
    recommendation: string;
  }> = [];
  
  // Detect content with high views but low conversion
  const highViewLowConversion = contentROIs.filter(r => 
    r.totalViews > 1000 && r.conversionRate < 0.01
  );
  if (highViewLowConversion.length > 0) {
    anomalies.push({
      type: "content_anomaly",
      description: `${highViewLowConversion.length} posts have high views but low conversion`,
      severity: "medium",
      recommendation: "Review CTA and hook effectiveness for these posts"
    });
  }
  
  // Detect platform with high engagement but low leads
  const highEngagementLowLeads = platformROIs.filter(r =>
    r.totalEngagement > 1000 && r.totalLeads < 10
  );
  if (highEngagementLowLeads.length > 0) {
    anomalies.push({
      type: "platform_anomaly",
      description: `${highEngagementLowLeads.length} platforms have high engagement but low leads`,
      severity: "high",
      recommendation: "Review lead detection logic for these platforms"
    });
  }
  
  // Detect conversion rate drop
  const recentConversions = conversions.filter(c => {
    const daysSince = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });
  const olderConversions = conversions.filter(c => {
    const daysSince = (Date.now() - new Date(c.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 7 && daysSince <= 30;
  });
  
  const recentRate = recentConversions.length > 0 
    ? recentConversions.filter(c => c.converted).length / recentConversions.length 
    : 0;
  const olderRate = olderConversions.length > 0
    ? olderConversions.filter(c => c.converted).length / olderConversions.length
    : 0;
  
  if (olderRate > 0 && recentRate < olderRate * 0.7) {
    anomalies.push({
      type: "conversion_drop",
      description: `Conversion rate dropped from ${(olderRate * 100).toFixed(1)}% to ${(recentRate * 100).toFixed(1)}%`,
      severity: "high",
      recommendation: "Review lead quality and agent performance"
    });
  }
  
  return anomalies;
}

/**
 * Identify opportunities
 */
export function identifyOpportunities(
  contentROIs: ContentROI[],
  platformROIs: PlatformROI[],
  trendROIs: TrendROI[]
): Array<{
  type: string;
  description: string;
  potentialImpact: "high" | "medium" | "low";
  recommendation: string;
}> {
  const opportunities: Array<{
    type: string;
    description: string;
    potentialImpact: "high" | "medium" | "low";
    recommendation: string;
  }> = [];
  
  // High-performing content that could be scaled
  const topContent = contentROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);
  
  if (topContent.length > 0) {
    opportunities.push({
      type: "content_scale",
      description: `${topContent.length} top-performing posts identified for scaling`,
      potentialImpact: "high",
      recommendation: `Create similar content and increase posting frequency for these topics`
    });
  }
  
  // High-performing platforms that could get more investment
  const topPlatforms = platformROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 3);
  
  if (topPlatforms.length > 0) {
    opportunities.push({
      type: "platform_investment",
      description: `${topPlatforms.length} high-ROI platforms identified`,
      potentialImpact: "high",
      recommendation: `Increase posting frequency and content investment for ${topPlatforms.map(p => p.platform).join(", ")}`
    });
  }
  
  // High-performing trends that could be capitalized on
  const topTrends = trendROIs
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);
  
  if (topTrends.length > 0) {
    opportunities.push({
      type: "trend_capitalization",
      description: `${topTrends.length} high-ROI trends identified`,
      potentialImpact: "medium",
      recommendation: `Create content series aligned with these trends`
    });
  }
  
  return opportunities;
}

/**
 * Perform complete performance analysis
 */
export function performPerformanceAnalysis(
  contentROIs: ContentROI[],
  platformROIs: PlatformROI[],
  trendROIs: TrendROI[],
  agentROIs: AgentROI[],
  funnelROIs: FunnelEntryPointROI[],
  conversions: ConversionData[]
): PerformanceAnalysis {
  const contentAnalysis = analyzeContentPerformance(contentROIs);
  const platformAnalysis = analyzePlatformPerformance(platformROIs);
  const trendAnalysis = analyzeTrendPerformance(trendROIs);
  const agentAnalysis = analyzeAgentPerformance(agentROIs);
  const funnelAnalysis = analyzeFunnelPerformance(funnelROIs);
  
  const anomalies = detectAnomalies(contentROIs, platformROIs, conversions);
  const opportunities = identifyOpportunities(contentROIs, platformROIs, trendROIs);
  
  return {
    winners: {
      content: contentAnalysis.winners,
      platforms: platformAnalysis.winners,
      trends: trendAnalysis.winners,
      agents: agentAnalysis.winners,
      funnelEntryPoints: funnelAnalysis.winners
    },
    losers: {
      content: contentAnalysis.losers,
      platforms: platformAnalysis.losers,
      trends: trendAnalysis.losers,
      agents: agentAnalysis.losers,
      funnelEntryPoints: funnelAnalysis.losers
    },
    anomalies,
    opportunities
  };
}
