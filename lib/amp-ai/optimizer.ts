// STRIKE 5: Auto-Optimize Pipelines Over Time
// Learn from patterns, update profiles, improve rules

import { OptimizationInsight } from "./types";
import { emitAnalyticsSignal } from "../uoi/analytics-signal";
import { getAirtableBase } from "../airtable/client";

async function getBase() {
  return await getAirtableBase();
}

interface PipelineMetrics {
  pipelineId: string;
  totalExecutions: number;
  totalRowsProcessed: number;
  totalRowsFailed: number;
  errorRate: number;
  commonErrors: Record<string, number>;
  columnMappings: Record<string, string>;
  avgExecutionTime: number;
}

/**
 * Analyze pipeline execution history to generate optimization insights
 */
export async function analyzePipeline(
  pipelineId: string,
  tenant: string
): Promise<OptimizationInsight[]> {
  const insights: OptimizationInsight[] = [];

  try {
    const base = await getBase();
    // Get execution history from AMP History table
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length === 0) {
      return insights;
    }

    // Calculate metrics
    const metrics: PipelineMetrics = {
      pipelineId,
      totalExecutions: records.length,
      totalRowsProcessed: 0,
      totalRowsFailed: 0,
      errorRate: 0,
      commonErrors: {},
      columnMappings: {},
      avgExecutionTime: 0
    };

    let totalTime = 0;
    records.forEach(record => {
      const rowsProcessed = record.get("RowsProcessed") as number || 0;
      const rowsFailed = record.get("RowsFailed") as number || 0;
      
      metrics.totalRowsProcessed += rowsProcessed;
      metrics.totalRowsFailed += rowsFailed;
      
      const execTime = record.get("ExecutionTime") as number || 0;
      totalTime += execTime;
    });

    metrics.errorRate = metrics.totalRowsProcessed > 0
      ? metrics.totalRowsFailed / metrics.totalRowsProcessed
      : 0;
    metrics.avgExecutionTime = records.length > 0
      ? totalTime / records.length
      : 0;

    // Get error patterns from AMP Errors table
    const errorTable = base("AMP Errors");
    const errorRecords = await errorTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 100
    }).all();

    errorRecords.forEach(record => {
      const errorMsg = (record.get("ErrorMessage") as string || "").toLowerCase();
      
      // Categorize errors
      if (errorMsg.includes("email")) {
        metrics.commonErrors["email_validation"] = (metrics.commonErrors["email_validation"] || 0) + 1;
      } else if (errorMsg.includes("missing") || errorMsg.includes("required")) {
        metrics.commonErrors["missing_fields"] = (metrics.commonErrors["missing_fields"] || 0) + 1;
      } else if (errorMsg.includes("phone")) {
        metrics.commonErrors["phone_validation"] = (metrics.commonErrors["phone_validation"] || 0) + 1;
      } else {
        metrics.commonErrors["other"] = (metrics.commonErrors["other"] || 0) + 1;
      }
    });

    // Generate insights based on metrics

    // High error rate insight
    if (metrics.errorRate > 0.1) {
      const isCritical = metrics.errorRate > 0.3;
      
      // UOI: Emit metric critical signal
      emitAnalyticsSignal("metric_critical", isCritical ? 8 : 6, {
        metric: "error_rate",
        value: metrics.errorRate,
        threshold: 0.1,
        pipelineId,
        tenantId: tenant
      });

      // UOI: Emit trend detected signal
      emitAnalyticsSignal("trend_detected", 4, {
        metric: "error_rate",
        direction: "increasing",
        magnitude: metrics.errorRate
      });

      insights.push({
        type: "validation",
        description: `High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}% of rows are failing`,
        impact: isCritical ? "high" : "medium",
        recommendation: "Review mapping profile and add data cleaning rules",
        confidence: 0.8
      });
    }

    // Common email errors
    if (metrics.commonErrors["email_validation"] > 5) {
      insights.push({
        type: "cleaning",
        description: `${metrics.commonErrors["email_validation"]} email validation errors detected`,
        impact: "medium",
        recommendation: "Enable email domain correction and normalization",
        confidence: 0.9
      });
    }

    // Common missing field errors
    if (metrics.commonErrors["missing_fields"] > 5) {
      insights.push({
        type: "mapping",
        description: `${metrics.commonErrors["missing_fields"]} missing field errors detected`,
        impact: "high",
        recommendation: "Update mapping profile to handle missing fields or add default values",
        confidence: 0.85
      });
    }

    // Slow execution
    if (metrics.avgExecutionTime > 5000) {
      // UOI: Emit trend detected signal for slow execution
      emitAnalyticsSignal("trend_detected", 4, {
        metric: "execution_time",
        direction: "increasing",
        magnitude: metrics.avgExecutionTime
      });

      insights.push({
        type: "profile",
        description: `Average execution time is ${(metrics.avgExecutionTime / 1000).toFixed(1)}s`,
        impact: "medium",
        recommendation: "Consider batch size optimization or parallel processing",
        confidence: 0.7
      });
    }

    // UOI: Detect anomalies in metrics
    const expectedErrorRate = 0.05; // Expected 5% error rate
    if (metrics.errorRate > 0 && Math.abs(metrics.errorRate - expectedErrorRate) > 0.1) {
      emitAnalyticsSignal("anomaly", 7, {
        metric: "error_rate",
        value: metrics.errorRate,
        expected: expectedErrorRate
      });
    }

  } catch (error: any) {
    console.error("Failed to analyze pipeline:", error);
    
    // UOI: Emit model error signal
    emitAnalyticsSignal("model_error", 9, {
      model: "pipeline_optimizer",
      error: error.message || "Pipeline analysis failed"
    });
  }

  return insights;
}

/**
 * Update mapping profile based on learned patterns
 */
export async function updateProfileFromLearning(
  profileKey: string,
  tenant: string,
  learnedMappings: Record<string, string>
): Promise<void> {
  // This would update the profile in the mapping-profiles/visual-profiles.json
  // For now, we'll log the suggestion
  console.log(`[AMP-AI] Suggested profile update for ${profileKey}:`, learnedMappings);
  
  // In a full implementation, this would:
  // 1. Load the current profile
  // 2. Merge learned mappings
  // 3. Save updated profile
  // 4. Log the change
}

/**
 * Learn from successful transformations
 */
export async function learnFromSuccess(
  pipelineId: string,
  tenant: string,
  successfulMappings: Record<string, string>
): Promise<void> {
  // Track which mappings work well
  // This data can be used to improve future profile suggestions
  console.log(`[AMP-AI] Learned successful mappings for ${pipelineId}:`, successfulMappings);
}
