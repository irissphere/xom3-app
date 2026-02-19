// Broadcast Engine - Ingestion Orchestrator
// Coordinates all scraping and ingestion activities

import { Platform, ScrapedEngagement } from "./types";
import { scrapePostEngagement } from "./scraping-engine";
import { normalizeSignal, batchNormalizeSignals, NormalizedSignal } from "./signal-normalizer";
import { storeNormalizedSignal, normalizedToEngagement, getNormalizedSignals } from "./signal-store";
import { scoreAndClassifyLead } from "./lead-scoring-engine";
import { emitSignal } from "@/lib/uoi/signals";

export interface IngestionResult {
  platform: Platform;
  postId?: string;
  signalsIngested: number;
  signalsNormalized: number;
  leadsDetected: number;
  errors: string[];
  timestamp: string;
}

/**
 * Ingest signals from platform
 */
export async function ingestPlatformSignals(
  platform: Platform,
  options?: {
    postId?: string;
    since?: string;
    signalTypes?: string[];
  }
): Promise<IngestionResult> {
  const result: IngestionResult = {
    platform,
    postId: options?.postId,
    signalsIngested: 0,
    signalsNormalized: 0,
    leadsDetected: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };
  
  try {
    // Scrape engagement
    if (options?.postId) {
      const { engagements, metrics } = await scrapePostEngagement(
        options.postId,
        platform,
        options.since
      );
      
      result.signalsIngested = engagements.length;
      
      // Normalize signals
      const normalized: NormalizedSignal[] = [];
      
      for (const engagement of engagements) {
        try {
          const normalizedSignal = normalizeSignal(
            platform,
            {
              type: engagement.type,
              content: engagement.content,
              userId: engagement.userId,
              username: engagement.username,
              postId: engagement.postId,
              timestamp: engagement.timestamp
            },
            engagement.type === "comment" ? "comment" :
            engagement.type === "dm" ? "dm" :
            engagement.type === "mention" ? "mention" :
            engagement.type === "reply" ? "reply" :
            engagement.type === "like" ? "like" :
            engagement.type === "share" ? "share" :
            engagement.type === "save" ? "save" :
            engagement.type === "follow" ? "follow" :
            "comment"
          );
          
          normalized.push(normalizedSignal);
          storeNormalizedSignal(normalizedSignal);
        } catch (error: any) {
          result.errors.push(`Failed to normalize signal: ${error.message}`);
        }
      }
      
      result.signalsNormalized = normalized.length;
      
      // Score and classify leads
      for (const normalizedSignal of normalized) {
        try {
          const engagement = normalizedToEngagement(normalizedSignal);
          const classification = scoreAndClassifyLead(engagement, {
            content: normalizedSignal.content,
            sentiment: normalizedSignal.sentiment,
            keywords: normalizedSignal.keywords
          });
          
          // Only count as lead if not noise
          if (classification.score.tier !== "noise") {
            result.leadsDetected++;
          }
        } catch (error: any) {
          result.errors.push(`Failed to score signal: ${error.message}`);
        }
      }
    }
    
    // Emit signal for ingestion completion
    emitSignal({
      source: "broadcast_engine",
      type: "signals_ingested",
      payload: {
        platform,
        signalsIngested: result.signalsIngested,
        leadsDetected: result.leadsDetected
      },
      priority: "low"
    });
    
  } catch (error: any) {
    result.errors.push(`Ingestion failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Batch ingest from multiple platforms
 */
export async function batchIngestPlatformSignals(
  platforms: Platform[],
  options?: {
    postIds?: Record<Platform, string>;
    since?: string;
  }
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];
  
  for (const platform of platforms) {
    try {
      const result = await ingestPlatformSignals(platform, {
        postId: options?.postIds?.[platform],
        since: options?.since
      });
      results.push(result);
    } catch (error: any) {
      results.push({
        platform,
        signalsIngested: 0,
        signalsNormalized: 0,
        leadsDetected: 0,
        errors: [`Batch ingestion failed: ${error.message}`],
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Calculate engagement deltas
 */
export function calculateEngagementDeltas(
  oldMetrics: any,
  newMetrics: any
): Record<string, number> {
  const deltas: Record<string, number> = {};
  
  const metrics = ["likes", "comments", "shares", "saves", "views", "follows", "mentions", "dms", "replies"];
  
  for (const metric of metrics) {
    const oldValue = oldMetrics[metric] || 0;
    const newValue = newMetrics[metric] || 0;
    deltas[metric] = Math.max(0, newValue - oldValue);
  }
  
  return deltas;
}

/**
 * Get ingestion statistics
 */
export function getIngestionStats(filters?: {
  platform?: Platform;
  since?: string;
}): {
  totalSignals: number;
  byPlatform: Record<Platform, number>;
  byType: Record<string, number>;
  bySentiment: Record<string, number>;
} {
  const signals = getNormalizedSignals({
    platform: filters?.platform,
    since: filters?.since
  });
  
  const byPlatform: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const bySentiment: Record<string, number> = {};
  
  for (const signal of signals) {
    byPlatform[signal.platform] = (byPlatform[signal.platform] || 0) + 1;
    byType[signal.signalType] = (byType[signal.signalType] || 0) + 1;
    bySentiment[signal.sentiment] = (bySentiment[signal.sentiment] || 0) + 1;
  }
  
  return {
    totalSignals: signals.length,
    byPlatform: byPlatform as Record<Platform, number>,
    byType,
    bySentiment
  };
}
