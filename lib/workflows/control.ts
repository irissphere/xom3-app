/**
 * Workflow Control State Management
 * Handles active/paused/disabled state for workflows
 */

import { loadJson, saveJson } from "@/lib/system/persistence";
import { getBase } from "@/lib/airtable/client";

export type WorkflowControlState = "active" | "paused" | "disabled";

export interface WorkflowControl {
  workflowId: string;
  workflowName: string;
  controlState: WorkflowControlState;
  updatedAt: string;
  updatedBy?: string;
  reason?: string;
}

function coerceText(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(v => coerceText(v)).filter(Boolean).join(", ") || undefined;
  return undefined;
}

/**
 * Get control state for a workflow
 * 
 * @param workflowId - Workflow identifier
 * @param returnObject - If true, returns full WorkflowControl object; if false/undefined, returns just the state string
 */
export async function getWorkflowControl(
  workflowId: string,
  returnObject?: boolean
): Promise<WorkflowControlState | WorkflowControl | null> {
  try {
    // Try Airtable first
    const base = await getBase();
    
    try {
      const records = await base("Workflow_Control")
        .select({
          filterByFormula: `{workflowId} = '${workflowId}'`,
          maxRecords: 1
        })
        .all();

      if (records.length > 0) {
        const record = records[0];
        const rawState =
          coerceText(record.fields.controlState) ||
          coerceText(record.fields["Control State"]) ||
          coerceText(record.fields["State"]) ||
          "active";
        const state = normalizeState(rawState);
        
        if (returnObject) {
          return {
            workflowId,
            workflowName:
              coerceText(record.fields.workflowName) ||
              coerceText(record.fields["Workflow Name"]) ||
              coerceText(record.fields["Name"]) ||
              workflowId,
            controlState: state,
            updatedAt:
              coerceText(record.fields.updatedAt) ||
              coerceText(record.fields["Updated At"]) ||
              coerceText((record as any).lastModifiedTime) ||
              new Date().toISOString(),
            updatedBy:
              coerceText(record.fields.updatedBy) ||
              coerceText(record.fields["Updated By"]) ||
              undefined,
            reason:
              coerceText(record.fields.reason) ||
              coerceText(record.fields["Reason"]) ||
              undefined,
          };
        }
        
        return state;
      }
    } catch (error: any) {
      // Table doesn't exist, fall through to file-based
      if (!error.message?.includes("NOT_FOUND") && !error.message?.includes("does not exist")) {
        throw error;
      }
    }

    // Fallback to file-based persistence
    const controls = await loadJson<Record<string, WorkflowControl>>({
      key: "workflow_controls",
      fileName: "workflow-controls.json",
      fallback: {}
    });

    const control = controls[workflowId];
    
    if (returnObject) {
      return control || {
        workflowId,
        workflowName: workflowId,
        controlState: "active",
        updatedAt: new Date().toISOString()
      };
    }
    
    return control?.controlState || "active";
  } catch (error) {
    console.error("Error getting workflow control state:", error);
    
    if (returnObject) {
      return {
        workflowId,
        workflowName: workflowId,
        controlState: "active",
        updatedAt: new Date().toISOString()
      };
    }
    
    return "active"; // Default to active on error
  }
}

/**
 * Get all workflow controls
 */
export async function getAllWorkflowControls(): Promise<Record<string, WorkflowControl>> {
  try {
    const base = await getBase();
    
    try {
      const records = await base("Workflow_Control").select().all();
      
      const controls: Record<string, WorkflowControl> = {};
      records.forEach(record => {
        const workflowId =
          coerceText(record.fields.workflowId) ||
          coerceText(record.fields["Workflow ID"]) ||
          coerceText(record.fields["WorkflowId"]) ||
          "";
        
        if (workflowId) {
          const rawState =
            coerceText(record.fields.controlState) ||
            coerceText(record.fields["Control State"]) ||
            coerceText(record.fields["State"]) ||
            "active";

          controls[workflowId] = {
            workflowId,
            workflowName:
              coerceText(record.fields.workflowName) ||
              coerceText(record.fields["Workflow Name"]) ||
              coerceText(record.fields["Name"]) ||
              workflowId,
            controlState: normalizeState(rawState),
            updatedAt:
              coerceText(record.fields.updatedAt) ||
              coerceText(record.fields["Updated At"]) ||
              coerceText(record.fields["Last Modified"]) ||
              coerceText((record as any).lastModifiedTime) ||
              new Date().toISOString(),
            updatedBy:
              coerceText(record.fields.updatedBy) ||
              coerceText(record.fields["Updated By"]) ||
              undefined,
            reason:
              coerceText(record.fields.reason) ||
              coerceText(record.fields["Reason"]) ||
              undefined,
          };
        }
      });
      
      return controls;
    } catch (error: any) {
      // Table doesn't exist, fall through to file-based
      if (!error.message?.includes("NOT_FOUND") && !error.message?.includes("does not exist")) {
        throw error;
      }
    }

    // Fallback to file-based persistence
    return await loadJson<Record<string, WorkflowControl>>({
      key: "workflow_controls",
      fileName: "workflow-controls.json",
      fallback: {}
    });
  } catch (error) {
    console.error("Error getting all workflow controls:", error);
    return {};
  }
}

/**
 * Set control state for a workflow
 */
export async function setWorkflowControl(
  workflowId: string,
  workflowName: string,
  controlState: WorkflowControlState,
  updatedBy?: string,
  reason?: string
): Promise<WorkflowControl> {
  const control: WorkflowControl = {
    workflowId,
    workflowName,
    controlState,
    updatedAt: new Date().toISOString(),
    updatedBy,
    reason
  };

  try {
    // Try Airtable first
    const base = await getBase();
    
    try {
      // Check if record exists
      const existing = await base("Workflow_Control")
        .select({
          filterByFormula: `{workflowId} = '${workflowId}'`,
          maxRecords: 1
        })
        .all();

      if (existing.length > 0) {
        // Update existing record
        await base("Workflow_Control").update([
          {
            id: existing[0].id,
            fields: {
              workflowId,
              workflowName,
              controlState,
              updatedAt: control.updatedAt,
              ...(updatedBy && { updatedBy }),
              ...(reason && { reason })
            }
          }
        ]);
      } else {
        // Create new record
        await base("Workflow_Control").create([
          {
            fields: {
              workflowId,
              workflowName,
              controlState,
              updatedAt: control.updatedAt,
              ...(updatedBy && { updatedBy }),
              ...(reason && { reason })
            }
          }
        ]);
      }
    } catch (error: any) {
      // Table doesn't exist, fall through to file-based
      if (!error.message?.includes("NOT_FOUND") && !error.message?.includes("does not exist")) {
        throw error;
      }
    }

    // Fallback to file-based persistence
    const controls = await loadJson<Record<string, WorkflowControl>>({
      key: "workflow_controls",
      fileName: "workflow-controls.json",
      fallback: {}
    });

    controls[workflowId] = control;
    await saveJson({
      key: "workflow_controls",
      fileName: "workflow-controls.json",
      value: controls
    });

    return control;
  } catch (error) {
    console.error("Error setting workflow control:", error);
    throw error;
  }
}

/**
 * Normalize state string to WorkflowControlState
 */
function normalizeState(state: any): WorkflowControlState {
  const stateStr = String(state).toLowerCase().trim();
  if (stateStr === "paused" || stateStr === "pause") return "paused";
  if (stateStr === "disabled" || stateStr === "disable") return "disabled";
  return "active";
}

/**
 * Check if workflow can be executed
 */
export async function canExecuteWorkflow(workflowId: string): Promise<boolean> {
  const state = await getWorkflowControl(workflowId);
  return state === "active";
}
