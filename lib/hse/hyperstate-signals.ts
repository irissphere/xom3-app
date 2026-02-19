import { generateAutomationHealthDashboard } from '@/lib/system/automation-health-dashboard';
import { generatePerformanceHeatmap } from '@/lib/system/performance-heatmap';
// Note: getAllConsistencyIssues doesn't exist yet - using placeholder
import { driftDetector } from '@/lib/system/drift-detection';
import { calculateUsageStats, getStoredEvents } from '@/lib/system/usage-analytics';
import { cache } from '@/lib/system/caching-layer';
import { backgroundWorker } from '@/lib/system/background-worker';
import type { HyperstateSignals } from './hyperstate-types';

/**
 * Get automation queue stats
 */
async function getAutomationQueueStats() {
  const dashboard = await generateAutomationHealthDashboard();
  return {
    queueDepth: dashboard.queueStats.pending,
    deadLetterCount: dashboard.queueStats.deadLetter,
  };
}

/**
 * Get recent performance events
 */
function getRecentPerformanceEvents() {
  const heatmap = generatePerformanceHeatmap();
  const allSlow = [
    ...heatmap.slowestScreens,
    ...heatmap.slowestWorkflows,
    ...heatmap.slowestAgents,
  ];
  return allSlow.map(item => ({
    severity: item.isSlow ? (item.averageTime / item.slowThreshold) : 0,
  }));
}

/**
 * Get consistency snapshot
 */
async function getConsistencySnapshot() {
  // TODO: Wire in actual consistency checker when getAllConsistencyIssues is available
  // For now, return 0 issues
  return {
    totalIssues: 0,
  };
}

/**
 * Get drift summary
 */
function getDriftSummary() {
  const baselines = driftDetector.getBaselines();
  if (baselines.length === 0) {
    return { score: 0 };
  }
  
  // Calculate average drift across all baselines
  // For now, return a simple score based on number of baselines with drift
  // In production, this would check actual drift detections
  return { score: 0 }; // Placeholder - would need to track active drifts
}

/**
 * Get usage pressure score (0-100)
 */
function getUsagePressureScore() {
  const stats = calculateUsageStats(getStoredEvents());
  
  // Calculate pressure based on activity levels
  const totalPageViews = Object.values(stats.pageViews).reduce((a, b) => a + b, 0);
  const totalWorkflows = Object.keys(stats.workflowDurations).length;
  
  // Normalize to 0-100 scale
  // High activity = high pressure
  const pressure = Math.min(100, (totalPageViews / 100) + (totalWorkflows * 10));
  return pressure;
}

/**
 * Get cache stats
 */
function getCacheStats() {
  const stats = cache.getStats();
  return {
    hitRate: stats.hitRate,
  };
}

/**
 * Get background worker stats
 */
function getBackgroundWorkerStats() {
  const stats = backgroundWorker.getStats();
  // Calculate load as percentage (processing + pending vs total capacity)
  const load = stats.totalTasks > 0 
    ? ((stats.processing + stats.pending) / stats.totalTasks) * 100
    : 0;
  return {
    load: Math.min(100, load),
  };
}

/**
 * Collect all hyperstate signals from Optimization Layer
 */
export async function collectHyperstateSignals(): Promise<HyperstateSignals> {
  const [
    autoStats,
    perfEvents,
    consistency,
    drift,
    usagePressure,
    cacheStats,
    workerStats,
  ] = await Promise.all([
    getAutomationQueueStats(),
    Promise.resolve(getRecentPerformanceEvents()),
    getConsistencySnapshot(),
    Promise.resolve(getDriftSummary()),
    Promise.resolve(getUsagePressureScore()),
    Promise.resolve(getCacheStats()),
    Promise.resolve(getBackgroundWorkerStats()),
  ]);

  const slowOperationScore = Math.min(
    100,
    perfEvents.reduce((acc, ev) => acc + (ev.severity || 1), 0),
  );

  return {
    automationQueueDepth: autoStats.queueDepth ?? 0,
    deadLetterCount: autoStats.deadLetterCount ?? 0,
    slowOperationScore,
    consistencyIssueCount: consistency.totalIssues ?? 0,
    driftScore: drift.score ?? 0,
    usagePressureScore: usagePressure ?? 0,
    cacheHitRate: cacheStats.hitRate ?? 0,
    backgroundWorkerLoad: workerStats.load ?? 0,
  };
}
