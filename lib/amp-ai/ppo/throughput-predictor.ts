// STRIKE 6: Predict Throughput & Performance
// Analyzes performance metrics to predict throughput

import { ThroughputPrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

/**
 * Predict throughput for a pipeline
 */
export async function predictThroughput(
  pipelineId: string,
  tenant: string,
  estimatedRows?: number
): Promise<ThroughputPrediction | null> {
  try {
    const base = await getAirtableBase();
    // Load execution history
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 3) {
      return null;
    }

    // Calculate metrics
    const metrics = records.map(record => {
      const rowsProcessed = (record.get("RowsProcessed") as number) || 0;
      const executionTime = (record.get("ExecutionTime") as number) || 0;
      const rowsFailed = (record.get("RowsFailed") as number) || 0;

      return {
        rowsProcessed,
        executionTime,
        rowsFailed,
        rowsPerSecond: executionTime > 0 ? (rowsProcessed / executionTime) * 1000 : 0
      };
    });

    // Calculate averages
    const avgRowsPerSecond = metrics.reduce((sum, m) => sum + m.rowsPerSecond, 0) / metrics.length;
    const avgExecutionTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
    const avgRowsProcessed = metrics.reduce((sum, m) => sum + m.rowsProcessed, 0) / metrics.length;

    // Detect trends
    const recentMetrics = metrics.slice(0, 5);
    const olderMetrics = metrics.slice(5, 10);
    const recentAvgRPS = recentMetrics.reduce((sum, m) => sum + m.rowsPerSecond, 0) / recentMetrics.length;
    const olderAvgRPS = olderMetrics.length > 0
      ? olderMetrics.reduce((sum, m) => sum + m.rowsPerSecond, 0) / olderMetrics.length
      : recentAvgRPS;

    // Predict
    const predictedRows = estimatedRows || avgRowsProcessed;
    const trendFactor = recentAvgRPS < olderAvgRPS ? 0.9 : 1.1; // Degrading or improving
    const predictedRowsPerSecond = recentAvgRPS * trendFactor;
    const predictedTotalTime = predictedRows / predictedRowsPerSecond * 1000; // Convert to ms

    // Identify factors
    const factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; description: string }> = [];

    if (recentAvgRPS < olderAvgRPS) {
      factors.push({
        factor: "Performance degradation",
        impact: "negative",
        description: `Throughput decreased from ${olderAvgRPS.toFixed(1)} to ${recentAvgRPS.toFixed(1)} rows/sec`
      });
    } else if (recentAvgRPS > olderAvgRPS) {
      factors.push({
        factor: "Performance improvement",
        impact: "positive",
        description: `Throughput increased from ${olderAvgRPS.toFixed(1)} to ${recentAvgRPS.toFixed(1)} rows/sec`
      });
    }

    const avgFailureRate = metrics.reduce((sum, m) => 
      sum + (m.rowsProcessed > 0 ? m.rowsFailed / m.rowsProcessed : 0), 0
    ) / metrics.length;

    if (avgFailureRate > 0.1) {
      factors.push({
        factor: "High error rate",
        impact: "negative",
        description: `${(avgFailureRate * 100).toFixed(1)}% error rate may slow processing`
      });
    }

    return {
      pipelineId,
      predictedRowsPerSecond,
      predictedTotalTime,
      predictedRows,
      confidence: Math.min(0.85, 0.5 + (records.length / 20) * 0.35),
      factors,
      recommendedAction: predictedTotalTime > 60000
        ? `Expected processing time: ${(predictedTotalTime / 1000 / 60).toFixed(1)} minutes. Consider optimizing pipeline.`
        : `Expected processing time: ${(predictedTotalTime / 1000).toFixed(1)} seconds`
    };
  } catch (error) {
    console.error("[PPO] Failed to predict throughput:", error);
    return null;
  }
}
