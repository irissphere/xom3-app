// Drift Detection Engine - Task 54
// Detect when workflows or data deviate from expected patterns

export interface PatternBaseline {
  id: string;
  type: "workflow" | "data" | "usage";
  name: string;
  expectedValue: number | string | Record<string, any>;
  variance: number; // Allowed variance (0-1)
  samples: number[];
  establishedAt: string;
  lastUpdated: string;
}

export interface DriftDetection {
  baselineId: string;
  baselineName: string;
  type: "workflow" | "data" | "usage";
  currentValue: number | string | Record<string, any>;
  expectedValue: number | string | Record<string, any>;
  driftAmount: number; // 0-1, how much it deviates
  severity: "critical" | "warning" | "info";
  detectedAt: string;
  trend: "increasing" | "decreasing" | "stable";
}

/**
 * Drift Detection Engine
 */
export class DriftDetectionEngine {
  private baselines: Map<string, PatternBaseline> = new Map();

  /**
   * Establish baseline pattern
   */
  establishBaseline(
    id: string,
    type: "workflow" | "data" | "usage",
    name: string,
    samples: number[],
    variance: number = 0.2
  ): void {
    if (samples.length === 0) return;

    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const now = new Date().toISOString();

    this.baselines.set(id, {
      id,
      type,
      name,
      expectedValue: avg,
      variance,
      samples,
      establishedAt: now,
      lastUpdated: now,
    });
  }

  /**
   * Update baseline with new sample
   */
  updateBaseline(id: string, newSample: number): void {
    const baseline = this.baselines.get(id);
    if (!baseline) return;

    baseline.samples.push(newSample);
    // Keep only last 100 samples
    if (baseline.samples.length > 100) {
      baseline.samples.shift();
    }

    // Recalculate expected value
    const avg = baseline.samples.reduce((a, b) => a + b, 0) / baseline.samples.length;
    baseline.expectedValue = avg;
    baseline.lastUpdated = new Date().toISOString();
  }

  /**
   * Detect drift
   */
  detectDrift(id: string, currentValue: number): DriftDetection | null {
    const baseline = this.baselines.get(id);
    if (!baseline) return null;

    const expected = typeof baseline.expectedValue === "number" ? baseline.expectedValue : 0;
    const difference = Math.abs(currentValue - expected);
    const driftAmount = expected > 0 ? difference / expected : 0;

    // Check if drift exceeds variance threshold
    if (driftAmount <= baseline.variance) {
      return null; // No drift
    }

    // Determine severity
    let severity: "critical" | "warning" | "info" = "info";
    if (driftAmount > 0.5) {
      severity = "critical";
    } else if (driftAmount > 0.3) {
      severity = "warning";
    }

    // Determine trend
    const recentSamples = baseline.samples.slice(-10);
    const recentAvg = recentSamples.length > 0
      ? recentSamples.reduce((a, b) => a + b, 0) / recentSamples.length
      : expected;
    
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (currentValue > recentAvg * 1.1) {
      trend = "increasing";
    } else if (currentValue < recentAvg * 0.9) {
      trend = "decreasing";
    }

    return {
      baselineId: id,
      baselineName: baseline.name,
      type: baseline.type,
      currentValue,
      expectedValue: expected,
      driftAmount,
      severity,
      detectedAt: new Date().toISOString(),
      trend,
    };
  }

  /**
   * Detect workflow drift
   */
  detectWorkflowDrift(
    workflowId: string,
    executionTime: number,
    successRate: number
  ): DriftDetection[] {
    const drifts: DriftDetection[] = [];

    // Check execution time drift
    const timeBaselineId = `workflow_time_${workflowId}`;
    const timeDrift = this.detectDrift(timeBaselineId, executionTime);
    if (timeDrift) {
      drifts.push(timeDrift);
    }

    // Check success rate drift
    const successBaselineId = `workflow_success_${workflowId}`;
    const successDrift = this.detectDrift(successBaselineId, successRate);
    if (successDrift) {
      drifts.push(successDrift);
    }

    return drifts;
  }

  /**
   * Detect data drift
   */
  detectDataDrift(
    table: string,
    field: string,
    currentDistribution: Record<string, number>
  ): DriftDetection | null {
    const baselineId = `data_${table}_${field}`;
    const baseline = this.baselines.get(baselineId);
    
    if (!baseline || typeof baseline.expectedValue !== "object") {
      return null;
    }

    const expected = baseline.expectedValue as Record<string, number>;
    const totalCurrent = Object.values(currentDistribution).reduce((a, b) => a + b, 0);
    const totalExpected = Object.values(expected).reduce((a, b) => a + b, 0);

    if (totalExpected === 0 || totalCurrent === 0) return null;

    // Calculate distribution difference
    let totalDiff = 0;
    for (const key of Array.from(new Set([...Object.keys(expected), ...Object.keys(currentDistribution)]))) {
      const expectedPct = (expected[key] || 0) / totalExpected;
      const currentPct = (currentDistribution[key] || 0) / totalCurrent;
      totalDiff += Math.abs(expectedPct - currentPct);
    }

    const driftAmount = totalDiff / 2; // Normalize to 0-1

    if (driftAmount <= baseline.variance) {
      return null;
    }

    let severity: "critical" | "warning" | "info" = "info";
    if (driftAmount > 0.5) {
      severity = "critical";
    } else if (driftAmount > 0.3) {
      severity = "warning";
    }

    return {
      baselineId,
      baselineName: `${table}.${field}`,
      type: "data",
      currentValue: currentDistribution,
      expectedValue: expected,
      driftAmount,
      severity,
      detectedAt: new Date().toISOString(),
      trend: "stable", // Distribution drift doesn't have a simple trend
    };
  }

  /**
   * Get all baselines
   */
  getBaselines(): PatternBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Get baseline by ID
   */
  getBaseline(id: string): PatternBaseline | null {
    return this.baselines.get(id) || null;
  }
}

// Global instance
export const driftDetector = new DriftDetectionEngine();
