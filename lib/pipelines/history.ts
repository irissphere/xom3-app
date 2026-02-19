// AMP History Logging
// Logs all pipeline runs to Airtable for enterprise visibility

import { getAirtableBase } from "../airtable/client";
import { MigrationPipeline, PipelineExecution } from "./types";

export interface PipelineRunResult {
  success: boolean;
  result?: {
    processed?: number;
    failed?: number;
    imported?: number;
    errors?: Array<{ row: number; error: string }>;
  };
  error?: string;
  execution?: PipelineExecution;
}

export async function logPipelineRun(
  pipeline: MigrationPipeline,
  result: PipelineRunResult
): Promise<void> {
  try {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
      console.warn("Airtable configuration missing, skipping history log");
      return;
    }

    const base = await getAirtableBase();
    const fields: Record<string, any> = {
      PipelineID: pipeline.id,
      PipelineName: pipeline.name,
      Tenant: pipeline.tenant,
      Status: result.success ? "Success" : "Error",
      Processed: result.result?.processed || result.execution?.rowsProcessed || 0,
      Imported: result.result?.imported || result.execution?.rowsImported || 0,
      Failed: result.result?.failed || result.execution?.rowsFailed || 0,
      Timestamp: new Date().toISOString()
    };

    if (result.error) {
      fields.ErrorMessage = result.error;
    }

    if (result.execution?.errors && result.execution.errors.length > 0) {
      fields.ErrorMessage = result.execution.errors
        .slice(0, 5)
        .map(e => `Row ${e.row}: ${e.error}`)
        .join("; ");
    }

    if (result.execution?.executionTime) {
      fields.ExecutionTime = result.execution.executionTime;
    }

    await base("AMP History").create([{ fields }]);
  } catch (error: any) {
    console.error("Failed to log pipeline run to Airtable:", error);
    // Don't throw - history logging should not break pipeline execution
  }
}
