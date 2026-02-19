// Broadcast Engine - Signal Store
// Stores normalized signals (replace with database in production)

import { NormalizedSignal } from "./signal-normalizer";
import { ScrapedEngagement } from "./types";

// In-memory stores (replace with database in production)
const rawSignals: any[] = [];
const normalizedSignals: NormalizedSignal[] = [];
const trendSignals: any[] = [];

/**
 * Store raw signal
 */
export function storeRawSignal(platform: string, rawSignal: any): void {
  rawSignals.push({
    id: `raw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    platform,
    raw: rawSignal,
    timestamp: new Date().toISOString()
  });
  
  // Keep last 10000 raw signals
  if (rawSignals.length > 10000) {
    rawSignals.shift();
  }
}

/**
 * Store normalized signal
 */
export function storeNormalizedSignal(signal: NormalizedSignal): void {
  normalizedSignals.push(signal);
  
  // Keep last 10000 normalized signals
  if (normalizedSignals.length > 10000) {
    normalizedSignals.shift();
  }
}

/**
 * Store trend signal
 */
export function storeTrendSignal(trend: any): void {
  trendSignals.push({
    id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...trend,
    timestamp: new Date().toISOString()
  });
  
  // Keep last 5000 trend signals
  if (trendSignals.length > 5000) {
    trendSignals.shift();
  }
}

/**
 * Get normalized signals
 */
export function getNormalizedSignals(filters?: {
  platform?: string;
  signalType?: string;
  since?: string;
  limit?: number;
}): NormalizedSignal[] {
  let results = [...normalizedSignals];
  
  if (filters?.platform) {
    results = results.filter(s => s.platform === filters.platform);
  }
  
  if (filters?.signalType) {
    results = results.filter(s => s.signalType === filters.signalType);
  }
  
  if (filters?.since) {
    const sinceDate = new Date(filters.since);
    results = results.filter(s => new Date(s.timestamp) >= sinceDate);
  }
  
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get raw signals
 */
export function getRawSignals(filters?: {
  platform?: string;
  since?: string;
  limit?: number;
}): any[] {
  let results = [...rawSignals];
  
  if (filters?.platform) {
    results = results.filter(s => s.platform === filters.platform);
  }
  
  if (filters?.since) {
    const sinceDate = new Date(filters.since);
    results = results.filter(s => new Date(s.timestamp) >= sinceDate);
  }
  
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get trend signals
 */
export function getTrendSignals(filters?: {
  platform?: string;
  since?: string;
  limit?: number;
}): any[] {
  let results = [...trendSignals];
  
  if (filters?.platform) {
    results = results.filter(t => t.platform === filters.platform);
  }
  
  if (filters?.since) {
    const sinceDate = new Date(filters.since);
    results = results.filter(t => new Date(t.timestamp) >= sinceDate);
  }
  
  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Convert normalized signal to ScrapedEngagement
 */
export function normalizedToEngagement(signal: NormalizedSignal): ScrapedEngagement {
  return {
    id: signal.id,
    postId: signal.postId || "",
    platform: signal.platform,
    type: signal.signalType === "comment" ? "comment" :
          signal.signalType === "dm" ? "dm" :
          signal.signalType === "mention" ? "mention" :
          signal.signalType === "reply" ? "reply" :
          signal.signalType === "like" ? "like" :
          signal.signalType === "share" ? "share" :
          signal.signalType === "save" ? "save" :
          signal.signalType === "follow" ? "follow" :
          "comment",
    userId: signal.userId,
    username: signal.username,
    content: signal.content,
    timestamp: signal.timestamp,
    metadata: {
      engagementValue: signal.engagementValue,
      sentiment: signal.sentiment,
      keywords: signal.keywords,
      ...signal.metadata
    }
  };
}
