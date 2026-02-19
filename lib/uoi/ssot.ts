// UOI 1: Single Source of Truth (SSOT)
// Unified data model for all domains

import { UnifiedDataModel, PipelineRecord, WorkflowRecord, TenantRecord, ExecutionRecord, ErrorRecord, PatternRecord, OptimizationRecord } from "./types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Build unified data model from all sources
 */
export async function buildUnifiedDataModel(tenant: string): Promise<UnifiedDataModel> {
  const pipelines: PipelineRecord[] = [];
  const workflows: WorkflowRecord[] = [];
  const tenants: TenantRecord[] = [];
  const executions: ExecutionRecord[] = [];
  const errors: ErrorRecord[] = [];
  const patterns: PatternRecord[] = [];
  const optimizations: OptimizationRecord[] = [];

  try {
    // Load pipelines
    const historyTable = base("AMP History");
    const pipelineRecords = await historyTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    const pipelineMap = new Map<string, any>();
    pipelineRecords.forEach(record => {
      const pipelineId = record.get("PipelineID") as string;
      if (!pipelineMap.has(pipelineId)) {
        pipelineMap.set(pipelineId, {
          id: pipelineId,
          tenant,
          domain: "migration", // Would determine from pipeline config
          source: "csv-upload",
          target: "Clients",
          mapping: {},
          status: "active",
          metrics: {
            throughput: 0,
            accuracy: 0,
            errorRate: 0,
            lastExecution: record.get("Timestamp") as string
          },
          createdAt: record.get("Timestamp") as string,
          updatedAt: record.get("Timestamp") as string
        });
      }
    });

    pipelines.push(...Array.from(pipelineMap.values()));

    // Load executions
    pipelineRecords.forEach(record => {
      executions.push({
        id: record.id,
        pipelineId: record.get("PipelineID") as string,
        tenant,
        domain: "migration",
        status: (record.get("Status") as string) || "success",
        rowsProcessed: (record.get("RowsProcessed") as number) || 0,
        rowsFailed: (record.get("RowsFailed") as number) || 0,
        executionTime: (record.get("ExecutionTime") as number) || 0,
        timestamp: record.get("Timestamp") as string || new Date().toISOString()
      });
    });

    // Load errors
    const errorTable = base("AMP Errors");
    const errorRecords = await errorTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    errorRecords.forEach(record => {
      errors.push({
        id: record.id,
        pipelineId: record.get("PipelineID") as string,
        tenant,
        domain: "migration",
        type: "transformation",
        message: (record.get("ErrorMessage") as string) || "Unknown error",
        severity: "medium",
        resolved: false,
        timestamp: record.get("Timestamp") as string || new Date().toISOString()
      });
    });

    // Load tenant
    tenants.push({
      id: tenant,
      name: tenant,
      domains: ["migration", "workflow", "compliance"],
      constraints: {},
      preferences: {},
      metrics: {
        totalPipelines: pipelines.length,
        totalWorkflows: 0,
        avgThroughput: pipelines.reduce((sum, p) => sum + p.metrics.throughput, 0) / pipelines.length || 0,
        avgAccuracy: pipelines.reduce((sum, p) => sum + p.metrics.accuracy, 0) / pipelines.length || 0,
        complianceScore: 0.9
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("[UOI] Failed to build unified data model:", error);
  }

  return {
    pipelines,
    workflows,
    tenants,
    executions,
    errors,
    patterns,
    optimizations,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Update unified data model
 */
export function updateUnifiedDataModel(
  model: UnifiedDataModel,
  updates: {
    pipeline?: PipelineRecord;
    workflow?: WorkflowRecord;
    execution?: ExecutionRecord;
    error?: ErrorRecord;
    pattern?: PatternRecord;
    optimization?: OptimizationRecord;
  }
): UnifiedDataModel {
  if (updates.pipeline) {
    const index = model.pipelines.findIndex(p => p.id === updates.pipeline!.id);
    if (index !== -1) {
      model.pipelines[index] = { ...model.pipelines[index], ...updates.pipeline };
    } else {
      model.pipelines.push(updates.pipeline);
    }
  }

  if (updates.workflow) {
    const index = model.workflows.findIndex(w => w.id === updates.workflow!.id);
    if (index !== -1) {
      model.workflows[index] = { ...model.workflows[index], ...updates.workflow };
    } else {
      model.workflows.push(updates.workflow);
    }
  }

  if (updates.execution) {
    model.executions.push(updates.execution);
  }

  if (updates.error) {
    model.errors.push(updates.error);
  }

  if (updates.pattern) {
    const index = model.patterns.findIndex(p => p.id === updates.pattern!.id);
    if (index !== -1) {
      model.patterns[index] = { ...model.patterns[index], ...updates.pattern };
    } else {
      model.patterns.push(updates.pattern);
    }
  }

  if (updates.optimization) {
    model.optimizations.push(updates.optimization);
  }

  model.lastUpdated = new Date().toISOString();
  return model;
}
