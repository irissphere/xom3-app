// Supervisor Agent - Anomaly Detection
// Detects anomalies in agent behavior and metrics

import { AgentHealth, Anomaly, FailureSeverity } from "./types";

interface MetricHistory {
  values: number[];
  timestamps: number[];
  maxSize: number;
}

class AnomalyDetector {
  private metricHistory: Map<string, MetricHistory> = new Map();
  private readonly MAX_HISTORY = 100;

  /**
   * Detect anomalies for an agent
   */
  detectAnomalies(agentId: string, health: AgentHealth): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check latency spike
    const latencyAnomaly = this.detectLatencySpike(agentId, health);
    if (latencyAnomaly) anomalies.push(latencyAnomaly);

    // Check success rate drop
    const successRateAnomaly = this.detectSuccessRateDrop(agentId, health);
    if (successRateAnomaly) anomalies.push(successRateAnomaly);

    // Check error rate spike
    const errorRateAnomaly = this.detectErrorRateSpike(agentId, health);
    if (errorRateAnomaly) anomalies.push(errorRateAnomaly);

    // Check execution pattern
    const patternAnomaly = this.detectExecutionPattern(agentId, health);
    if (patternAnomaly) anomalies.push(patternAnomaly);

    return anomalies;
  }

  /**
   * Detect latency spike
   */
  private detectLatencySpike(agentId: string, health: AgentHealth): Anomaly | null {
    if (health.totalExecutions < 10) return null;

    const history = this.getMetricHistory(`${agentId}:latency`);
    const avgLatency = this.calculateAverage(history.values);
    const threshold = avgLatency * 2; // 2x average is anomaly

    if (health.averageLatency > threshold && health.averageLatency > 1000) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "spike",
        source: agentId,
        description: `Latency spike detected: ${health.averageLatency}ms (avg: ${avgLatency.toFixed(2)}ms)`,
        severity: health.averageLatency > threshold * 2 ? "high" : "medium",
        detectedAt: Date.now(),
        resolved: false,
        metrics: {
          current: health.averageLatency,
          average: avgLatency,
          threshold
        },
        threshold: {
          max: threshold
        }
      };
    }

    return null;
  }

  /**
   * Detect success rate drop
   */
  private detectSuccessRateDrop(agentId: string, health: AgentHealth): Anomaly | null {
    if (health.totalExecutions < 10) return null;

    const history = this.getMetricHistory(`${agentId}:successRate`);
    const avgSuccessRate = this.calculateAverage(history.values);
    const drop = avgSuccessRate - health.successRate;

    if (drop > 20 && health.successRate < 80) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "drop",
        source: agentId,
        description: `Success rate drop detected: ${health.successRate.toFixed(2)}% (avg: ${avgSuccessRate.toFixed(2)}%)`,
        severity: drop > 40 ? "high" : "medium",
        detectedAt: Date.now(),
        resolved: false,
        metrics: {
          current: health.successRate,
          average: avgSuccessRate,
          drop
        },
        threshold: {
          min: 80
        }
      };
    }

    return null;
  }

  /**
   * Detect error rate spike
   */
  private detectErrorRateSpike(agentId: string, health: AgentHealth): Anomaly | null {
    if (health.totalExecutions < 10) return null;

    const history = this.getMetricHistory(`${agentId}:errorRate`);
    const avgErrorRate = this.calculateAverage(history.values);

    if (health.errorRate > avgErrorRate * 2 && health.errorRate > 10) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "spike",
        source: agentId,
        description: `Error rate spike detected: ${health.errorRate.toFixed(2)}% (avg: ${avgErrorRate.toFixed(2)}%)`,
        severity: health.errorRate > 30 ? "high" : "medium",
        detectedAt: Date.now(),
        resolved: false,
        metrics: {
          current: health.errorRate,
          average: avgErrorRate,
          spike: health.errorRate - avgErrorRate
        },
        threshold: {
          max: avgErrorRate * 2
        }
      };
    }

    return null;
  }

  /**
   * Detect execution pattern anomalies
   */
  private detectExecutionPattern(agentId: string, health: AgentHealth): Anomaly | null {
    if (health.totalExecutions < 20) return null;

    // Check if agent hasn't executed in expected time
    const now = Date.now();
    const timeSinceLastSuccess = health.lastSuccess ? now - health.lastSuccess : Infinity;
    const expectedInterval = 3600000; // 1 hour default

    if (timeSinceLastSuccess > expectedInterval * 3) {
      return {
        id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "pattern",
        source: agentId,
        description: `Execution pattern anomaly: No successful execution in ${(timeSinceLastSuccess / 3600000).toFixed(2)} hours`,
        severity: "medium",
        detectedAt: Date.now(),
        resolved: false,
        metrics: {
          timeSinceLastSuccess,
          expectedInterval
        },
        threshold: {
          max: expectedInterval * 3
        }
      };
    }

    return null;
  }

  /**
   * Get metric history
   */
  private getMetricHistory(key: string): MetricHistory {
    if (!this.metricHistory.has(key)) {
      this.metricHistory.set(key, {
        values: [],
        timestamps: [],
        maxSize: this.MAX_HISTORY
      });
    }
    return this.metricHistory.get(key)!;
  }

  /**
   * Calculate average
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Update metric history
   */
  updateMetric(key: string, value: number): void {
    const history = this.getMetricHistory(key);
    history.values.push(value);
    history.timestamps.push(Date.now());

    // Trim to max size
    if (history.values.length > history.maxSize) {
      history.values.shift();
      history.timestamps.shift();
    }
  }
}

export const anomalyDetector = new AnomalyDetector();

/**
 * Detect anomalies for an agent
 */
export function detectAnomalies(agentId: string, health: AgentHealth): Anomaly[] {
  return anomalyDetector.detectAnomalies(agentId, health);
}
