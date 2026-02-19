// STRIKE 3: Evolution Hooks
// Learning loop that captures signals during AMP execution

import {
  signalSuccessPattern,
  signalErrorPattern,
  signalDataShapeDrift,
  signalWorkflowOutcome
} from "./signals";
import { updateColumnMapping, recordErrorPattern, recordSchemaDrift } from "./memory";

/**
 * Hook: Called after successful transformation
 */
export async function hookSuccessfulTransformation(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  rawRow: Record<string, any>,
  transformedRow: Record<string, any>,
  columnMappings: Record<string, string>
): Promise<void> {
  // Track successful column mappings
  for (const [sourceColumn, targetField] of Object.entries(columnMappings)) {
    if (rawRow[sourceColumn] && transformedRow[targetField]) {
      await updateColumnMapping(profileKey, tenant, sourceColumn, targetField, true);
      await signalSuccessPattern(pipelineId, tenant, profileKey, sourceColumn, targetField);
    }
  }
}

/**
 * Hook: Called when transformation fails
 */
export async function hookFailedTransformation(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  rawRow: Record<string, any>,
  errorMessage: string,
  columnMappings: Record<string, string>
): Promise<void> {
  // Parse error to identify which column failed
  const lowerError = errorMessage.toLowerCase();
  
  // Try to identify the problematic column
  let problematicColumn: string | undefined;
  
  if (lowerError.includes("email")) {
    problematicColumn = Object.keys(columnMappings).find(c => 
      /email/i.test(c) || columnMappings[c] === "email"
    );
  } else if (lowerError.includes("phone")) {
    problematicColumn = Object.keys(columnMappings).find(c => 
      /phone|tel/i.test(c) || columnMappings[c] === "phone"
    );
  } else if (lowerError.includes("missing") || lowerError.includes("required")) {
    // Find missing required field
    const requiredFields = ["firstName", "lastName", "email"];
    for (const field of requiredFields) {
      const sourceColumn = Object.keys(columnMappings).find(c => columnMappings[c] === field);
      if (sourceColumn && !rawRow[sourceColumn]) {
        problematicColumn = sourceColumn;
        break;
      }
    }
  }

  if (problematicColumn) {
    const errorType = lowerError.includes("missing") ? "missing_field" :
                     lowerError.includes("invalid") ? "invalid_format" :
                     lowerError.includes("email") ? "email_validation" :
                     lowerError.includes("phone") ? "phone_validation" :
                     "unknown";

    await recordErrorPattern(profileKey, tenant, problematicColumn, errorType, errorMessage);
    await signalErrorPattern(pipelineId, tenant, profileKey, problematicColumn, errorType, errorMessage);
  }
}

/**
 * Hook: Called when schema changes are detected
 */
export async function hookSchemaChange(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  previousColumns: string[],
  currentColumns: string[]
): Promise<void> {
  const previousSet = new Set(previousColumns);
  const currentSet = new Set(currentColumns);

  // Detect new columns
  for (const column of currentColumns) {
    if (!previousSet.has(column)) {
      await recordSchemaDrift(profileKey, tenant, "new_column", column, undefined, column);
      await signalDataShapeDrift(pipelineId, tenant, profileKey, "new_column", column, undefined, column);
    }
  }

  // Detect missing columns
  for (const column of previousColumns) {
    if (!currentSet.has(column)) {
      await recordSchemaDrift(profileKey, tenant, "missing_column", column, column, undefined);
      await signalDataShapeDrift(pipelineId, tenant, profileKey, "missing_column", column, column, undefined);
    }
  }
}

/**
 * Hook: Called after workflow execution
 */
export async function hookWorkflowOutcome(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  workflowId: string,
  workflowSuccess: boolean,
  workflowError?: string,
  columnMappings?: Record<string, string>
): Promise<void> {
  // Track workflow outcomes per column mapping
  if (columnMappings) {
    for (const [column, targetField] of Object.entries(columnMappings)) {
      await signalWorkflowOutcome(
        pipelineId,
        tenant,
        profileKey,
        column,
        targetField,
        workflowId,
        workflowSuccess,
        workflowError
      );
    }
  }
}

/**
 * Main learning loop - called at the end of pipeline execution
 */
export async function learningLoop(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  rawRows: Record<string, any>[],
  transformedRows: Record<string, any>[],
  errors: Array<{ row: number; error: string }>,
  columnMappings: Record<string, string>
): Promise<void> {
  // Process successful transformations
  for (let i = 0; i < transformedRows.length; i++) {
    const rawRow = rawRows[i];
    const transformedRow = transformedRows[i];
    
    if (rawRow && transformedRow) {
      await hookSuccessfulTransformation(
        pipelineId,
        tenant,
        profileKey,
        rawRow,
        transformedRow,
        columnMappings
      );
    }
  }

  // Process failed transformations
  for (const error of errors) {
    const rawRow = rawRows[error.row - 1]; // error.row is 1-indexed
    if (rawRow) {
      await hookFailedTransformation(
        pipelineId,
        tenant,
        profileKey,
        rawRow,
        error.error,
        columnMappings
      );
    }
  }
}
