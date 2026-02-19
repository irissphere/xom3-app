// Broadcast Engine - Orchestrator
// Coordinates all four engines

import { ScrapedEngagement, LeadSignal, DetectedLead } from "./types";
import { scrapePostEngagement } from "./scraping-engine";
import { batchDetectLeads } from "./lead-detection-engine";
import { batchIntegrateLeads } from "./funnel-engine";
import { listPosts, updatePostEngagement } from "./store";
import { emitSignal } from "@/lib/uoi/signals";

/**
 * Run scraping cycle for all active posts
 */
export async function runScrapingCycle(): Promise<{
  postsScraped: number;
  engagementsFound: number;
  errors: string[];
}> {
  const activePosts = listPosts({ status: "posted" });
  const errors: string[] = [];
  let engagementsFound = 0;
  
  for (const post of activePosts) {
    for (const platform of post.platforms) {
      try {
        const { engagements, metrics } = await scrapePostEngagement(
          post.id,
          platform,
          post.engagement?.lastScrapedAt
        );
        
        // Update post engagement metrics
        updatePostEngagement(post.id, {
          ...metrics,
          lastScrapedAt: new Date().toISOString()
        });
        
        engagementsFound += engagements.length;
        
        // Emit signal for new engagements
        if (engagements.length > 0) {
          emitSignal({
            source: "broadcast_engine",
            type: "engagement_scraped",
            payload: {
              postId: post.id,
              platform,
              count: engagements.length
            },
            priority: "low"
          });
        }
      } catch (error: any) {
        errors.push(`Failed to scrape ${post.id} on ${platform}: ${error.message}`);
      }
    }
  }
  
  return {
    postsScraped: activePosts.length,
    engagementsFound,
    errors
  };
}

/**
 * Run lead detection cycle
 */
export async function runLeadDetectionCycle(
  engagements: ScrapedEngagement[]
): Promise<LeadSignal[]> {
  if (engagements.length === 0) {
    return [];
  }
  
  // Get engagement history for context
  // In production, fetch from database
  const engagementHistory: ScrapedEngagement[] = [];
  
  const leads = batchDetectLeads(engagements, {});
  
  // Emit signal for detected leads
  if (leads.length > 0) {
    emitSignal({
      source: "broadcast_engine",
      type: "leads_detected",
      payload: {
        count: leads.length,
        hot: leads.filter(l => l.type === "hot").length,
        warm: leads.filter(l => l.type === "warm").length,
        cold: leads.filter(l => l.type === "cold").length
      },
      priority: leads.some(l => l.urgency === "high") ? "high" : "medium"
    });
  }
  
  return leads;
}

/**
 * Run funnel integration cycle
 */
export async function runFunnelIntegrationCycle(
  leads: LeadSignal[]
): Promise<{
  integrated: number;
  errors: string[];
}> {
  if (leads.length === 0) {
    return { integrated: 0, errors: [] };
  }
  
  // Convert LeadSignals to DetectedLeads
  const detectedLeads: DetectedLead[] = leads.map(lead => ({
    id: `detected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    leadSignal: lead,
    funnelStage: "New Lead",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  const errors: string[] = [];
  
  try {
    const integrations = await batchIntegrateLeads(detectedLeads, {
      autoAssign: true
    });
    
    return {
      integrated: integrations.length,
      errors
    };
  } catch (error: any) {
    errors.push(`Funnel integration failed: ${error.message}`);
    return {
      integrated: 0,
      errors
    };
  }
}

/**
 * Run complete broadcast cycle
 */
export async function runBroadcastCycle(): Promise<{
  scraping: { postsScraped: number; engagementsFound: number; errors: string[] };
  leadDetection: LeadSignal[];
  funnelIntegration: { integrated: number; errors: string[] };
  trends?: { platforms: number; crossPlatform: number };
  strategy?: { optimized: boolean; topPriority?: string };
}> {
  // Step 1: Detect trends (in parallel with scraping)
  const trendsPromise = import("./trend-detection").then(m => m.detectAllTrends());
  
  // Step 2: Scrape engagement
  const scraping = await runScrapingCycle();
  
  // Step 3: Detect leads (placeholder - in production, use scraped engagements)
  const leadDetection = await runLeadDetectionCycle([]);
  
  // Step 4: Integrate leads into funnel
  const funnelIntegration = await runFunnelIntegrationCycle(leadDetection);
  
  // Step 5: Get trends (if ready)
  let trends;
  try {
    const trendsResult = await trendsPromise;
    trends = {
      platforms: trendsResult.platforms.length,
      crossPlatform: trendsResult.crossPlatform.length
    };
  } catch (error) {
    console.error("[Broadcast] Trend detection failed:", error);
  }
  
  // Step 6: Optimize strategy (if trends available)
  let strategy;
  if (trends) {
    try {
      const { buildAdaptiveStrategy } = await import("./adaptive-strategy");
      const { getLearningMemory } = await import("./learning-engine");
      
      const learningMemory = getLearningMemory();
      const performanceMetrics = learningMemory.platformPerformance.map(p => ({
        platform: p.platform,
        reach: p.totalReach,
        engagement: p.totalReach * p.avgEngagementRate,
        engagementRate: p.avgEngagementRate,
        leads: p.totalLeads,
        leadConversionRate: p.avgLeadConversion,
        trendAlignment: p.trendAlignment,
        lastUpdated: p.lastUpdated
      }));
      
      const trendsResult = await trendsPromise;
      const strategyResult = await buildAdaptiveStrategy(trendsResult.platforms, performanceMetrics);
      
      strategy = {
        optimized: true,
        topPriority: strategyResult.platforms[0]?.platform
      };
    } catch (error) {
      console.error("[Broadcast] Strategy optimization failed:", error);
    }
  }
  
  return {
    scraping,
    leadDetection,
    funnelIntegration,
    trends,
    strategy
  };
}
