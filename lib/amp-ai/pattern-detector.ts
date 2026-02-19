// STRIKE 6: Auto-Trigger Workflows Based on Patterns
// Detect spikes, errors, bottlenecks, and trigger workflows automatically

import { PatternEvent } from "./types";
import { getAirtableBase } from "../airtable/client";

interface PatternThresholds {
  spikeThreshold: number; // % increase to trigger spike
  errorRateThreshold: number; // error rate to trigger alert
  bottleneckThreshold: number; // execution time in ms
}

const DEFAULT_THRESHOLDS: PatternThresholds = {
  spikeThreshold: 2.0, // 200% increase
  errorRateThreshold: 0.2, // 20% error rate
  bottleneckThreshold: 10000 // 10 seconds
};

/**
 * Detect patterns in pipeline executions
 */
export async function detectPatterns(
  pipelineId: string,
  tenant: string,
  thresholds: PatternThresholds = DEFAULT_THRESHOLDS
): Promise<PatternEvent[]> {
  const events: PatternEvent[] = [];

  try {
    const base = await getAirtableBase();
    // Get recent execution history
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 2) {
      return events;
    }

    // Calculate recent metrics
    const recent = records.slice(0, 5);
    const older = records.slice(5, 10);

    const recentAvgRows = recent.reduce((sum, r) => 
      sum + ((r.get("RowsProcessed") as number) || 0), 0
    ) / recent.length;

    const olderAvgRows = older.length > 0 
      ? older.reduce((sum, r) => sum + ((r.get("RowsProcessed") as number) || 0), 0) / older.length
      : recentAvgRows;

    // Detect spike
    if (olderAvgRows > 0 && recentAvgRows > olderAvgRows * thresholds.spikeThreshold) {
      events.push({
        type: "spike",
        severity: "warning",
        description: `Spike detected: ${recentAvgRows.toFixed(0)} rows (avg) vs ${olderAvgRows.toFixed(0)} rows (previous)`,
        metrics: {
          recentAvg: recentAvgRows,
          previousAvg: olderAvgRows,
          increase: (recentAvgRows / olderAvgRows) * 100
        },
        timestamp: new Date().toISOString()
      });
    }

    // Calculate error rate
    const recentErrors = recent.reduce((sum, r) => 
      sum + ((r.get("RowsFailed") as number) || 0), 0
    );
    const recentTotal = recent.reduce((sum, r) => 
      sum + ((r.get("RowsProcessed") as number) || 0), 0
    );
    const errorRate = recentTotal > 0 ? recentErrors / recentTotal : 0;

    // Detect high error rate
    if (errorRate > thresholds.errorRateThreshold) {
      events.push({
        type: "error_rate",
        severity: errorRate > 0.5 ? "critical" : "warning",
        description: `High error rate: ${(errorRate * 100).toFixed(1)}% of rows failing`,
        metrics: {
          errorRate,
          totalRows: recentTotal,
          failedRows: recentErrors
        },
        timestamp: new Date().toISOString()
      });
    }

    // Detect bottlenecks
    const avgExecutionTime = recent.reduce((sum, r) => 
      sum + ((r.get("ExecutionTime") as number) || 0), 0
    ) / recent.length;

    if (avgExecutionTime > thresholds.bottleneckThreshold) {
      events.push({
        type: "bottleneck",
        severity: "warning",
        description: `Pipeline bottleneck: ${(avgExecutionTime / 1000).toFixed(1)}s average execution time`,
        metrics: {
          avgExecutionTime,
          threshold: thresholds.bottleneckThreshold
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check for compliance events (if compliance logging is enabled)
    const complianceTable = base("Compliance Log");
    const complianceRecords = await complianceTable.select({
      filterByFormula: `AND({ClientID} != "", {Tenant} = "${tenant}")`,
      maxRecords: 10,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (complianceRecords.length > 5) {
      events.push({
        type: "compliance",
        severity: "info",
        description: `${complianceRecords.length} compliance events in recent period`,
        metrics: {
          eventCount: complianceRecords.length
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error("Failed to detect patterns:", error);
  }

  return events;
}

/**
 * Trigger workflow based on pattern event
 */
export async function triggerWorkflowForPattern(
  event: PatternEvent,
  pipelineId: string,
  workflowWebhook?: string
): Promise<void> {
  if (!workflowWebhook) {
    return;
  }

  const n8nBaseUrl = process.env.N8N_BASE_URL;
  const n8nApiKey = process.env.N8N_API_KEY;

  if (!n8nBaseUrl || !n8nApiKey) {
    console.warn("[AMP-AI] n8n not configured, skipping workflow trigger");
    return;
  }

  try {
    await fetch(`${n8nBaseUrl}/webhook/${workflowWebhook}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": n8nApiKey
      },
      body: JSON.stringify({
        eventType: event.type,
        severity: event.severity,
        description: event.description,
        metrics: event.metrics,
        pipelineId,
        timestamp: event.timestamp
      })
    });
  } catch (error) {
    console.error("[AMP-AI] Failed to trigger workflow:", error);
  }
}

/**
 * Send alert notification for pattern event
 */
export async function sendPatternAlert(
  event: PatternEvent,
  pipelineId: string,
  channels: string[] = ["slack"]
): Promise<void> {
  const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    await fetch(`${appBaseUrl}/api/usha/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[AMP-AI Alert] ${event.description}`,
        details: {
          eventType: event.type,
          severity: event.severity,
          metrics: event.metrics,
          pipelineId
        },
        channels
      })
    });
  } catch (error) {
    console.error("[AMP-AI] Failed to send alert:", error);
  }
}
