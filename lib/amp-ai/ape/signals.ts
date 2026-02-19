// STRIKE 1: Evolution Signals
// Defines what APE listens to for evolution

import { EvolutionSignal } from "./types";
import { storeEvolutionSignal } from "./memory";

/**
 * Signal: Success Pattern
 * When 90%+ of rows map a column the same way successfully
 */
export async function signalSuccessPattern(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  column: string,
  targetField: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "success",
    timestamp: new Date().toISOString(),
    pipelineId,
    tenant,
    profileKey,
    column,
    targetField,
    success: true,
    metadata: {
      patternType: "success_pattern"
    }
  });
}

/**
 * Signal: Error Pattern
 * When a column repeatedly fails with the same error
 */
export async function signalErrorPattern(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  column: string,
  errorType: string,
  errorMessage: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "error",
    timestamp: new Date().toISOString(),
    pipelineId,
    tenant,
    profileKey,
    column,
    success: false,
    metadata: {
      errorType,
      errorMessage,
      patternType: "error_pattern"
    }
  });
}

/**
 * Signal: Tenant Behavior
 * When a tenant manually remaps a field
 */
export async function signalTenantBehavior(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  column: string,
  originalMapping: string,
  newMapping: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "tenant_override",
    timestamp: new Date().toISOString(),
    pipelineId,
    tenant,
    profileKey,
    column,
    targetField: newMapping,
    success: true,
    metadata: {
      originalMapping,
      newMapping,
      patternType: "tenant_behavior"
    }
  });
}

/**
 * Signal: Data Shape Drift
 * When the source schema changes (new column, missing column, type change)
 */
export async function signalDataShapeDrift(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  driftType: "new_column" | "missing_column" | "type_change",
  column: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  await storeEvolutionSignal({
    type: "drift",
    timestamp: new Date().toISOString(),
    pipelineId,
    tenant,
    profileKey,
    column,
    success: true,
    metadata: {
      driftType,
      oldValue,
      newValue,
      patternType: "schema_drift"
    }
  });
}

/**
 * Signal: Workflow Outcome
 * When a mapping leads to downstream workflow success/failure
 */
export async function signalWorkflowOutcome(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  column: string,
  targetField: string,
  workflowId: string,
  workflowSuccess: boolean,
  workflowError?: string
): Promise<void> {
  await storeEvolutionSignal({
    type: "workflow_outcome",
    timestamp: new Date().toISOString(),
    pipelineId,
    tenant,
    profileKey,
    column,
    targetField,
    success: workflowSuccess,
    metadata: {
      workflowId,
      workflowError,
      patternType: "workflow_outcome"
    }
  });
}
