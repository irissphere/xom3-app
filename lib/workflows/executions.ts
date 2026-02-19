/**
 * Workflow Execution Helpers
 * 
 * Creates and updates workflow execution records in Airtable
 */

import { getBase } from "@/lib/airtable/client";

export interface ExecutionRecord {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "success" | "failed";
  triggeredAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string | null;
  params?: Record<string, any>;
  logs?: {
    stdout?: string;
    stderr?: string;
    exitCode?: number | null;
  };
  triggerType?: "manual" | "scheduled" | "retry";
  runType?: "Manual" | "Scheduled" | "Retry";
  sourceExecutionId?: string;
  updatedBy?: string;
}

function coerceText(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(v => coerceText(v)).filter(Boolean).join(", ") || undefined;
  return undefined;
}

function normalizeTriggerType(value: any): ExecutionRecord["triggerType"] {
  const raw = (coerceText(value) || "").toLowerCase();
  if (raw.includes("schedule")) return "scheduled";
  if (raw.includes("retry")) return "retry";
  return "manual";
}

function normalizeRunType(value: any): ExecutionRecord["runType"] {
  const raw = (coerceText(value) || "").toLowerCase();
  if (raw.includes("schedule")) return "Scheduled";
  if (raw.includes("retry")) return "Retry";
  return "Manual";
}

/**
 * Create a new execution record in Airtable
 * 
 * @param execution - Execution record data
 * @returns Created execution with Airtable record ID
 */
export async function createExecution(execution: ExecutionRecord): Promise<ExecutionRecord & { airtableRecordId?: string }> {
  try {
    const base = await getBase();
    
    const record = await base("Workflow_Executions").create([
      {
        fields: {
          Execution_ID: execution.executionId,
          Workflow_Name: execution.workflowName,
          Status: execution.status === "success" ? "Success" :
                 execution.status === "failed" ? "Failed" : "Running",
          Triggered_At: execution.triggeredAt,
          Completed_At: execution.completedAt || null,
          Duration: execution.duration || null,
          Run_Type: execution.runType || "Manual",
          Automation_Source: "Cockpit",
          Trigger_Type: execution.triggerType || "manual",
          Error_Message: execution.errorMessage || null,
          ...(execution.params && { Inputs: JSON.stringify(execution.params) }),
          ...(execution.sourceExecutionId && { Retry_Of: execution.sourceExecutionId }),
          ...(execution.updatedBy && { Updated_By: execution.updatedBy })
        }
      }
    ]);

    if (record && record.length > 0) {
      console.log(`[Executions] Created execution record: ${execution.executionId} (Airtable ID: ${record[0].id})`);
      return {
        ...execution,
        airtableRecordId: record[0].id
      };
    }

    return execution;
  } catch (error: any) {
    console.error(`[Executions] Failed to create execution record:`, error);
    // Return execution even if Airtable write fails (graceful degradation)
    return execution;
  }
}

/**
 * Get execution by ID from Airtable
 * 
 * @param executionId - Execution ID to fetch
 * @returns Execution record or null if not found
 */
export async function getExecutionById(executionId: string): Promise<ExecutionRecord | null> {
  try {
    const base = await getBase();
    
    const records = await base("Workflow_Executions")
      .select({
        filterByFormula: `{Execution_ID} = '${executionId}' OR RECORD_ID() = '${executionId}'`,
        maxRecords: 1
      })
      .all();

    if (records.length === 0) {
      return null;
    }

    const record = records[0];
    
    // Normalize status
    const rawStatus = record.fields.Status || 
                     record.fields["Status"] ||
                     record.fields["Execution Status"] ||
                     "Unknown";
    
    let normalizedStatus: "running" | "success" | "failed" = "success";
    const statusLower = String(rawStatus).toLowerCase();
    if (statusLower.includes("fail") || statusLower.includes("error")) {
      normalizedStatus = "failed";
    } else if (statusLower.includes("running") || statusLower.includes("pending")) {
      normalizedStatus = "running";
    } else if (statusLower.includes("success") || statusLower.includes("complete")) {
      normalizedStatus = "success";
    }

    // Parse inputs/params
    const inputs = record.fields.Inputs || 
                   record.fields["Inputs"] ||
                   record.fields["Parameters"] ||
                   null;
    
    let params: Record<string, any> | undefined;
    if (inputs) {
      try {
        params = typeof inputs === "string" ? JSON.parse(inputs) : inputs;
      } catch {
        params = inputs as any;
      }
    }

    // Parse execution logs
    const logsField = record.fields.Execution_Logs || 
                     record.fields["Execution Logs"] ||
                     null;
    
    let logs: { stdout?: string; stderr?: string; exitCode?: number | null } | undefined;
    if (logsField) {
      try {
        logs = typeof logsField === "string" ? JSON.parse(logsField) : logsField;
      } catch {
        // Ignore parse errors
      }
    }

    return {
      executionId:
        coerceText(record.fields.Execution_ID) ||
        coerceText(record.fields["Execution ID"]) ||
        record.id,
      workflowId:
        coerceText(record.fields.Workflow_Name) ||
        coerceText(record.fields["Workflow Name"]) ||
        "",
      workflowName:
        coerceText(record.fields.Workflow_Name) ||
        coerceText(record.fields["Workflow Name"]) ||
        "",
      status: normalizedStatus,
      triggeredAt:
        coerceText(record.fields.Triggered_At) ||
        coerceText(record.fields["Triggered At"]) ||
        coerceText((record as any).createdTime) ||
        new Date().toISOString(),
      completedAt:
        coerceText(record.fields.Completed_At) ||
        coerceText(record.fields["Completed At"]) ||
        undefined,
      duration:
        typeof record.fields.Duration === "number"
          ? record.fields.Duration
          : typeof record.fields["Duration"] === "number"
            ? (record.fields["Duration"] as number)
            : undefined,
      errorMessage:
        coerceText(record.fields.Error_Message) ||
        coerceText(record.fields["Error Message"]) ||
        null,
      params,
      logs,
      triggerType: normalizeTriggerType(record.fields.Trigger_Type || record.fields["Trigger Type"]),
      runType: normalizeRunType(record.fields.Run_Type || record.fields["Run Type"]),
      sourceExecutionId:
        coerceText(record.fields.Retry_Of) ||
        coerceText(record.fields["Retry Of"]) ||
        undefined,
      updatedBy:
        coerceText(record.fields.Updated_By) ||
        coerceText(record.fields["Updated By"]) ||
        undefined,
    };
  } catch (error: any) {
    console.error(`[Executions] Failed to get execution by ID:`, error);
    return null;
  }
}

/**
 * Update an existing execution record in Airtable
 * 
 * @param executionId - Execution ID to update
 * @param updates - Fields to update
 * @returns Updated execution record
 */
export async function updateExecution(
  executionId: string,
  updates: Partial<ExecutionRecord>
): Promise<void> {
  try {
    const base = await getBase();

    // Find the execution record
    const records = await base("Workflow_Executions")
      .select({
        filterByFormula: `{Execution_ID} = '${executionId}'`,
        maxRecords: 1
      })
      .all();

    if (records.length === 0) {
      console.warn(`[Executions] Execution not found for update: ${executionId}`);
      return;
    }

    const record = records[0];
    const fields: Record<string, any> = {};

    // Map updates to Airtable fields
    if (updates.status !== undefined) {
      fields.Status = updates.status === "success" ? "Success" :
                     updates.status === "failed" ? "Failed" : "Running";
    }

    if (updates.completedAt !== undefined) {
      fields.Completed_At = updates.completedAt || null;
    }

    if (updates.duration !== undefined) {
      fields.Duration = updates.duration || null;
    }

    if (updates.errorMessage !== undefined) {
      fields.Error_Message = updates.errorMessage || null;
    }

    if (updates.logs !== undefined) {
      fields.Execution_Logs = JSON.stringify({
        stdout: updates.logs.stdout?.substring(0, 16000) || "",
        stderr: updates.logs.stderr?.substring(0, 16000) || "",
        exitCode: updates.logs.exitCode
      });
    }

    // Update the record
    await base("Workflow_Executions").update([
      {
        id: record.id,
        fields
      }
    ]);

    console.log(`[Executions] Updated execution record: ${executionId}`);
  } catch (error: any) {
    console.error(`[Executions] Failed to update execution record:`, error);
    // Don't throw - allow execution to continue even if Airtable update fails
  }
}
