// STRIKE 3: Predict Workflow Bottlenecks
// Analyzes workflow execution patterns to predict bottlenecks

import { BottleneckPrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

/**
 * Predict workflow bottlenecks
 */
export async function predictWorkflowBottlenecks(
  pipelineId: string,
  tenant: string
): Promise<BottleneckPrediction[]> {
  const predictions: BottleneckPrediction[] = [];

  try {
    const base = await getAirtableBase();
    // Load execution history
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 30,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 5) {
      return predictions;
    }

    // Analyze execution times
    const executionTimes: number[] = [];
    const failureRates: number[] = [];
    const timestamps: string[] = [];

    records.forEach(record => {
      const execTime = (record.get("ExecutionTime") as number) || 0;
      const rowsProcessed = (record.get("RowsProcessed") as number) || 0;
      const rowsFailed = (record.get("RowsFailed") as number) || 0;
      const timestamp = record.get("Timestamp") as string || "";

      executionTimes.push(execTime);
      failureRates.push(rowsProcessed > 0 ? rowsFailed / rowsProcessed : 0);
      timestamps.push(timestamp);
    });

    // Calculate trends
    const recentExecTimes = executionTimes.slice(0, 10);
    const olderExecTimes = executionTimes.slice(10, 20);
    const avgRecent = recentExecTimes.reduce((a, b) => a + b, 0) / recentExecTimes.length;
    const avgOlder = olderExecTimes.length > 0 
      ? olderExecTimes.reduce((a, b) => a + b, 0) / olderExecTimes.length 
      : avgRecent;

    const recentFailureRate = failureRates.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const olderFailureRate = failureRates.slice(10, 20).length > 0
      ? failureRates.slice(10, 20).reduce((a, b) => a + b, 0) / 10
      : recentFailureRate;

    // Predict execution time bottleneck
    if (avgRecent > avgOlder * 1.3 && avgRecent > 5000) {
      const predictedTime = new Date();
      predictedTime.setHours(predictedTime.getHours() + 1);

      predictions.push({
        workflowId: pipelineId,
        workflowName: `Pipeline ${pipelineId}`,
        bottleneckType: "execution_time",
        confidence: Math.min(0.9, 0.6 + ((avgRecent - avgOlder) / avgOlder) * 0.3),
        predictedTime: predictedTime.toISOString(),
        predictedDuration: avgRecent * 1.2, // Predict 20% increase
        currentMetrics: {
          avgExecutionTime: avgRecent,
          queueLength: 0, // Would need queue tracking
          failureRate: recentFailureRate
        },
        recommendedAction: `Optimize pipeline execution. Current avg: ${(avgRecent / 1000).toFixed(1)}s, predicted: ${((avgRecent * 1.2) / 1000).toFixed(1)}s`
      });
    }

    // Predict failure rate bottleneck
    if (recentFailureRate > olderFailureRate * 1.5 && recentFailureRate > 0.2) {
      const predictedTime = new Date();
      predictedTime.setHours(predictedTime.getHours() + 1);

      predictions.push({
        workflowId: pipelineId,
        workflowName: `Pipeline ${pipelineId}`,
        bottleneckType: "failure_rate",
        confidence: Math.min(0.85, 0.5 + (recentFailureRate * 2)),
        predictedTime: predictedTime.toISOString(),
        currentMetrics: {
          avgExecutionTime: avgRecent,
          queueLength: 0,
          failureRate: recentFailureRate
        },
        recommendedAction: `Address failure rate spike. Current: ${(recentFailureRate * 100).toFixed(1)}%, predicted to increase`
      });
    }

    // Analyze time-based patterns (e.g., 9 AM bottleneck)
    const hourCounts: Record<number, number> = {};
    timestamps.forEach(ts => {
      const hour = new Date(ts).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour && peakHour[1] >= 3) {
      const predictedTime = new Date();
      predictedTime.setHours(Number(peakHour[0]), 0, 0, 0);
      if (predictedTime < new Date()) {
        predictedTime.setDate(predictedTime.getDate() + 1);
      }

      predictions.push({
        workflowId: pipelineId,
        workflowName: `Pipeline ${pipelineId}`,
        bottleneckType: "execution_time",
        confidence: 0.7,
        predictedTime: predictedTime.toISOString(),
        currentMetrics: {
          avgExecutionTime: avgRecent,
          queueLength: 0,
          failureRate: recentFailureRate
        },
        recommendedAction: `Expected bottleneck at ${peakHour[0]}:00 based on historical pattern (${peakHour[1]} occurrences)`
      });
    }

  } catch (error) {
    console.error("[PPO] Failed to predict workflow bottlenecks:", error);
  }

  return predictions;
}
