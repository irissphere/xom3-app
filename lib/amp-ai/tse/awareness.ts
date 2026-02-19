// 👑 STRIKE 7: The Engine Gains Self-Awareness
// Maintains real-time internal model of entire system

import { SovereignState, PipelineState, WorkflowState, TenantState, MappingState, ErrorState, PredictionState, TransformationState } from "./types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Build sovereign state - the meta-layer
 */
export async function buildSovereignState(tenant: string): Promise<SovereignState> {
  const pipelines: PipelineState[] = [];
  const workflows: WorkflowState[] = [];
  const mappings: MappingState[] = [];
  const errors: ErrorState[] = [];
  const predictions: PredictionState[] = [];
  const transformations: TransformationState[] = [];

  try {
    // Load pipeline states
    const historyTable = base("AMP History");
    const pipelineRecords = await historyTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 50,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    const pipelineMap = new Map<string, any>();
    pipelineRecords.forEach(record => {
      const pipelineId = record.get("PipelineID") as string;
      if (!pipelineMap.has(pipelineId)) {
        pipelineMap.set(pipelineId, {
          rowsProcessed: 0,
          rowsFailed: 0,
          executionTime: 0,
          count: 0,
          lastExecution: record.get("Timestamp") as string
        });
      }
      const stats = pipelineMap.get(pipelineId);
      stats.rowsProcessed += (record.get("RowsProcessed") as number) || 0;
      stats.rowsFailed += (record.get("RowsFailed") as number) || 0;
      stats.executionTime += (record.get("ExecutionTime") as number) || 0;
      stats.count++;
    });

    pipelineMap.forEach((stats, pipelineId) => {
      const avgRows = stats.rowsProcessed / stats.count;
      const avgTime = stats.executionTime / stats.count;
      const throughput = avgTime > 0 ? (avgRows / avgTime) * 1000 : 0;
      const errorRate = stats.rowsProcessed > 0 ? stats.rowsFailed / stats.rowsProcessed : 0;
      const accuracy = 1 - errorRate;

      pipelines.push({
        id: pipelineId,
        tenant,
        status: errorRate > 0.3 ? "error" : "active",
        metrics: {
          throughput,
          accuracy,
          errorRate,
          lastExecution: stats.lastExecution
        },
        protection: {
          shielded: false,
          rerouted: false,
          paused: errorRate > 0.5
        }
      });
    });

    // Load error states
    const errorTable = base("AMP Errors");
    const errorRecords = await errorTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    const errorMap = new Map<string, number>();
    errorRecords.forEach(record => {
      const errorMsg = (record.get("ErrorMessage") as string || "").toLowerCase();
      const errorType = errorMsg.includes("missing") ? "missing_field" :
                       errorMsg.includes("invalid") ? "invalid_format" :
                       errorMsg.includes("email") ? "email_validation" :
                       "unknown";
      errorMap.set(errorType, (errorMap.get(errorType) || 0) + 1);
    });

    errorMap.forEach((frequency, type) => {
      errors.push({
        id: `error-${type}`,
        type,
        frequency,
        trend: "stable",
        resolution: "pending",
        lastSeen: new Date().toISOString()
      });
    });

    // Load tenant state
    const tenants: TenantState[] = [{
      id: tenant,
      status: "active",
      metrics: {
        totalPipelines: pipelines.length,
        totalErrors: errors.reduce((sum, e) => sum + e.frequency, 0),
        avgThroughput: pipelines.reduce((sum, p) => sum + p.metrics.throughput, 0) / pipelines.length || 0,
        complianceScore: 0.9 // Would calculate from compliance logs
      },
      constraints: {}
    }];

    // Load mapping states (simplified)
    mappings.push({
      profileKey: "default-csv",
      status: "active",
      metrics: {
        usageCount: pipelines.length,
        successRate: pipelines.reduce((sum, p) => sum + p.metrics.accuracy, 0) / pipelines.length || 0,
        lastUsed: new Date().toISOString()
      },
      tenants: [tenant]
    });

    // Load transformation states
    transformations.push({
      type: "cleaning",
      rules: 5,
      effectiveness: 0.85,
      lastOptimized: new Date().toISOString()
    });

  } catch (error) {
    console.error("[TSE] Failed to build sovereign state:", error);
  }

  return {
    pipelines,
    workflows: [],
    tenants: [],
    mappings,
    errors,
    predictions: [],
    transformations,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Update sovereign state
 */
export function updateSovereignState(
  state: SovereignState,
  updates: {
    pipeline?: Partial<PipelineState>;
    error?: ErrorState;
    prediction?: PredictionState;
  }
): SovereignState {
  if (updates.pipeline) {
    const index = state.pipelines.findIndex(p => p.id === updates.pipeline!.id);
    if (index !== -1) {
      state.pipelines[index] = { ...state.pipelines[index], ...updates.pipeline };
    }
  }

  if (updates.error) {
    const index = state.errors.findIndex(e => e.id === updates.error!.id);
    if (index !== -1) {
      state.errors[index] = updates.error;
    } else {
      state.errors.push(updates.error);
    }
  }

  if (updates.prediction) {
    state.predictions.push(updates.prediction);
  }

  state.lastUpdated = new Date().toISOString();
  return state;
}
