// Workflow Executor
// Executes workflows with UOI signal integration

import { emitWorkflowSignal } from "@/lib/uoi/workflow-signal";

export interface WorkflowExecution {
  workflowId: string;
  tenantId: string;
  status: "success" | "error";
  duration: number;
  error?: string;
}

/**
 * Run a workflow with full UOI signal integration
 * 
 * @param workflowId - The workflow identifier
 * @param tenantId - The tenant identifier
 * @param executeWorkflow - The actual workflow execution function
 * @returns Workflow execution result
 */
export async function runWorkflow(
  workflowId: string,
  tenantId: string,
  executeWorkflow: (workflowId: string, tenantId: string) => Promise<any>
): Promise<WorkflowExecution> {
  const startTime = Date.now();
  
  // UOI: Emit workflow start signal
  emitWorkflowSignal("workflow_start", 1, { workflowId, tenantId });

  try {
    const result = await executeWorkflow(workflowId, tenantId);
    const duration = Date.now() - startTime;

    // UOI: Emit workflow complete signal
    emitWorkflowSignal("workflow_complete", 1, {
      workflowId,
      tenantId,
      durationMs: duration
    });

    // UOI: Check for SLA breach (if execution time > 30 seconds)
    if (duration > 30000) {
      emitWorkflowSignal("workflow_sla_breach", 6, {
        workflowId,
        tenantId,
        durationMs: duration,
        slaThreshold: 30000
      });
    }

    // UOI: Check for bottleneck (if execution time > 10 seconds)
    if (duration > 10000) {
      emitWorkflowSignal("bottleneck", 6, {
        workflowId,
        tenantId,
        step: "workflow_execution",
        durationMs: duration
      });
    }

    return {
      workflowId,
      tenantId,
      status: "success",
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // UOI: Emit workflow error signal
    emitWorkflowSignal("workflow_error", 7, {
      workflowId,
      tenantId,
      error: error.message || "Workflow execution failed"
    });

    return {
      workflowId,
      tenantId,
      status: "error",
      duration,
      error: error.message || "Workflow execution failed"
    };
  }
}

/**
 * Execute workflow with retry logic and UOI signals
 * 
 * @param workflowId - The workflow identifier
 * @param tenantId - The tenant identifier
 * @param executeWorkflow - The actual workflow execution function
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns Workflow execution result
 */
export async function runWorkflowWithRetry(
  workflowId: string,
  tenantId: string,
  executeWorkflow: (workflowId: string, tenantId: string) => Promise<any>,
  maxRetries: number = 3
): Promise<WorkflowExecution> {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      // UOI: Emit retry signal
      emitWorkflowSignal("workflow_retry", 4, {
        workflowId,
        tenantId,
        attempt
      });

      // Exponential backoff
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      return await runWorkflow(workflowId, tenantId, executeWorkflow);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError;
}
