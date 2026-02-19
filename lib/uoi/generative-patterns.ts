// UOI Generative Pattern Intelligence - Pattern intelligence becomes generative
// Evolution mode: Memory becomes learning substrate

import { isEvolutionActive, recordPatternCluster } from "./evolution";
import { getRecentSignals, getRecurringPatterns } from "./memory";

export interface GenerativePatternCluster {
  patterns: string[];
  subsystems: string[];
  correlation: number;
  prediction: string;
  confidence: number;
  evidence: any[];
}

/**
 * Generate pattern clusters
 * EVOLUTION MODE: Clusters anomalies, identifies recurring patterns, correlates cross-domain signals
 */
export function generatePatternClusters(): GenerativePatternCluster[] {
  if (!isEvolutionActive()) {
    return [];
  }
  
  const clusters: GenerativePatternCluster[] = [];
  const recent = getRecentSignals(1000); // Look at more history for clustering
  const recurringPatterns = getRecurringPatterns(2); // Patterns that occur 2+ times
  
  // Group signals by subsystem
  const bySubsystem: Record<string, any[]> = {};
  recent.forEach(s => {
    const source = s.source || "unknown";
    if (!bySubsystem[source]) bySubsystem[source] = [];
    bySubsystem[source].push(s);
  });
  
  // Cluster 1: Correlated error patterns across subsystems
  const errorSubsystems = Object.keys(bySubsystem).filter(sub => 
    (bySubsystem[sub] || []).some((s: any) => s.type === "error" || s.priority === "critical")
  );
  
  if (errorSubsystems.length >= 2) {
    const errorSignals = errorSubsystems.flatMap(sub => 
      (bySubsystem[sub] || []).filter((s: any) => s.type === "error" || s.priority === "critical")
    );
    
    const correlation = calculateCorrelation(errorSubsystems, recent);
    if (correlation > 0.5) {
      clusters.push({
        patterns: errorSubsystems.map(sub => `${sub}-errors`),
        subsystems: errorSubsystems,
        correlation,
        prediction: "Multi-subsystem error cascade likely",
        confidence: Math.min(0.9, correlation * 1.2),
        evidence: errorSignals.slice(0, 5),
      });
    }
  }
  
  // Cluster 2: Drift + Performance degradation
  const driftSignals = recent.filter(s => s.type === "drift");
  const performanceSignals = recent.filter(s => 
    s.type === "metric" && (s.payload?.throughputDrop || s.payload?.executionTimeIncrease)
  );
  
  if (driftSignals.length > 0 && performanceSignals.length > 0) {
    const correlation = 0.7; // High correlation between drift and performance
    clusters.push({
      patterns: ["drift-detected", "performance-degradation"],
      subsystems: ["amp", "analytics"],
      correlation,
      prediction: "Drift causing performance degradation",
      confidence: 0.8,
      evidence: [...driftSignals.slice(0, 3), ...performanceSignals.slice(0, 3)],
    });
  }
  
  // Cluster 3: Queue pressure + Error rate
  const queueSignals = recent.filter(s => 
    s.type === "metric" && (s.payload?.workflowQueue > 10 || s.payload?.queueLength > 10)
  );
  const errorSignals = recent.filter(s => s.type === "error");
  
  if (queueSignals.length > 0 && errorSignals.length > 0) {
    const correlation = calculateQueueErrorCorrelation(queueSignals, errorSignals);
    if (correlation > 0.4) {
      clusters.push({
        patterns: ["queue-pressure", "error-rate"],
        subsystems: ["workflow", "amp"],
        correlation,
        prediction: "Queue pressure leading to errors",
        confidence: Math.min(0.85, correlation * 1.5),
        evidence: [...queueSignals.slice(0, 3), ...errorSignals.slice(0, 3)],
      });
    }
  }
  
  // Cluster 4: Recurring patterns from memory
  recurringPatterns.forEach(pattern => {
    if (pattern.frequency > 5) {
      clusters.push({
        patterns: [pattern.pattern],
        subsystems: pattern.pattern.split("-").filter(p => 
          ["amp", "workflow", "compliance", "notification", "analytics"].includes(p)
        ),
        correlation: 0.8, // High correlation for recurring patterns
        prediction: pattern.prediction || "Recurring pattern detected",
        confidence: Math.min(0.9, pattern.frequency / 10),
        evidence: [],
      });
    }
  });
  
  // Record clusters
  clusters.forEach(cluster => {
    recordPatternCluster(
      cluster.patterns,
      cluster.correlation,
      cluster.prediction,
      cluster.confidence
    );
  });
  
  return clusters;
}

/**
 * Calculate correlation between subsystems
 */
function calculateCorrelation(subsystems: string[], signals: any[]): number {
  if (subsystems.length < 2) return 0;
  
  // Simple correlation: if errors occur in multiple subsystems within short time window
  const timeWindows: Record<string, number[]> = {};
  subsystems.forEach(sub => {
    timeWindows[sub] = signals
      .filter(s => (s.source || "unknown") === sub && (s.type === "error" || s.priority === "critical"))
      .map(s => new Date(s.timestamp || Date.now()).getTime());
  });
  
  // Check if errors occur within 5 minutes of each other
  let correlatedCount = 0;
  let totalCount = 0;
  
  subsystems.forEach((sub1, i) => {
    subsystems.slice(i + 1).forEach(sub2 => {
      const times1 = timeWindows[sub1] || [];
      const times2 = timeWindows[sub2] || [];
      
      times1.forEach(t1 => {
        totalCount++;
        const nearby = times2.filter(t2 => Math.abs(t1 - t2) < 5 * 60 * 1000);
        if (nearby.length > 0) {
          correlatedCount++;
        }
      });
    });
  });
  
  return totalCount > 0 ? correlatedCount / totalCount : 0;
}

/**
 * Calculate correlation between queue pressure and errors
 */
function calculateQueueErrorCorrelation(queueSignals: any[], errorSignals: any[]): number {
  if (queueSignals.length === 0 || errorSignals.length === 0) return 0;
  
  // Check if errors occur shortly after queue pressure spikes
  let correlatedCount = 0;
  let totalCount = 0;
  
  queueSignals.forEach(queueSignal => {
    const queueTime = new Date(queueSignal.timestamp || Date.now()).getTime();
    const nearbyErrors = errorSignals.filter(errorSignal => {
      const errorTime = new Date(errorSignal.timestamp || Date.now()).getTime();
      return errorTime > queueTime && errorTime < queueTime + 10 * 60 * 1000; // Within 10 minutes
    });
    
    totalCount++;
    if (nearbyErrors.length > 0) {
      correlatedCount++;
    }
  });
  
  return totalCount > 0 ? correlatedCount / totalCount : 0;
}

/**
 * Predict future failures based on clusters
 */
export function predictFailuresFromClusters(clusters: GenerativePatternCluster[]): Array<{
  subsystem: string;
  willFail: boolean;
  confidence: number;
  reason: string;
  predictedAt: string;
}> {
  const predictions: Array<{
    subsystem: string;
    willFail: boolean;
    confidence: number;
    reason: string;
    predictedAt: string;
  }> = [];
  
  clusters.forEach(cluster => {
    if (cluster.prediction.includes("failure") || cluster.prediction.includes("error") || cluster.prediction.includes("cascade")) {
      cluster.subsystems.forEach(subsystem => {
        predictions.push({
          subsystem,
          willFail: true,
          confidence: cluster.confidence,
          reason: cluster.prediction,
          predictedAt: new Date().toISOString(),
        });
      });
    }
  });
  
  return predictions;
}
