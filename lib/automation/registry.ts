/**
 * Workflow Registry
 * Defines available workflows and their configurations
 * 
 * This is the cockpit's automation catalog - even if workflows
 * aren't built yet, they exist here as first-class entities
 */

import { loadJson, saveJson } from "@/lib/system/persistence";
import { getBase } from "@/lib/airtable/client";
import { WorkflowControlState } from "@/lib/workflows/control";

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  controlState: WorkflowControlState;
  runnerType: "n8n-rest" | "n8n-cli" | "vps" | "custom" | "stub";
  endpointOrCommand?: string;
  status: "live" | "stub" | "paused";
  parameters?: {
    leadId?: boolean;
    clientId?: boolean;
    custom?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all workflow definitions
 */
export async function getAllWorkflows(): Promise<WorkflowDefinition[]> {
  try {
    // Try Airtable first
    const base = await getBase();
    
    try {
      const records = await base("Automation_Registry")
        .select()
        .all();

      return records.map((record: any) => ({
        workflowId: record.fields.workflowId || 
                    record.fields["Workflow ID"] ||
                    record.fields["WorkflowId"] ||
                    "",
        name: record.fields.name || 
              record.fields["Name"] ||
              record.fields["Workflow Name"] ||
              "",
        description: record.fields.description || 
                     record.fields["Description"] ||
                     "",
        controlState: (record.fields.controlState || 
                      record.fields["Control State"] ||
                      "active") as WorkflowControlState,
        runnerType: (record.fields.runnerType || 
                    record.fields["Runner Type"] ||
                    "stub") as WorkflowDefinition["runnerType"],
        endpointOrCommand: record.fields.endpointOrCommand || 
                          record.fields["Endpoint Or Command"] ||
                          undefined,
        status: (record.fields.status || 
                record.fields["Status"] ||
                "stub") as "live" | "stub" | "paused",
        parameters: record.fields.parameters ? 
                   (typeof record.fields.parameters === "string" 
                     ? JSON.parse(record.fields.parameters)
                     : record.fields.parameters) :
                   undefined,
        createdAt: record.fields.createdAt || 
                  record.fields["Created At"] ||
                  record.createdTime ||
                  new Date().toISOString(),
        updatedAt: record.fields.updatedAt || 
                  record.fields["Updated At"] ||
                  record.lastModifiedTime ||
                  new Date().toISOString()
      })).filter((w: WorkflowDefinition) => w.workflowId);
    } catch (error: any) {
      // Table doesn't exist, fall through to file-based
      if (!error.message?.includes("NOT_FOUND") && !error.message?.includes("does not exist")) {
        throw error;
      }
    }

    // Fallback to file-based registry
    const workflows = await loadJson<WorkflowDefinition[]>({
      key: "workflow_registry",
      fileName: "workflow-registry.json",
      fallback: getDefaultWorkflows()
    });

    return workflows;
  } catch (error) {
    console.error("Error getting workflows:", error);
    return getDefaultWorkflows();
  }
}

/**
 * Get a single workflow definition
 */
export async function getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
  const workflows = await getAllWorkflows();
  return workflows.find(w => w.workflowId === workflowId) || null;
}

/**
 * Default workflow definitions
 * These are the initial workflows the cockpit knows about
 */
function getDefaultWorkflows(): WorkflowDefinition[] {
  return [
    {
      workflowId: "compliance-sync",
      name: "Compliance Sync",
      description: "Sync client compliance data from external sources",
      controlState: "active",
      runnerType: "stub",
      status: "stub",
      parameters: {
        leadId: true,
        clientId: true,
        custom: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      workflowId: "data-import",
      name: "Data Import",
      description: "Pull external data into the cockpit",
      controlState: "active",
      runnerType: "stub",
      status: "stub",
      parameters: {
        leadId: true,
        clientId: true,
        custom: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      workflowId: "report-generator",
      name: "Report Generator",
      description: "Generate compliance reports for clients",
      controlState: "paused",
      runnerType: "stub",
      status: "stub",
      parameters: {
        clientId: true,
        custom: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}

/**
 * Save workflow definitions (for future use)
 */
export async function saveWorkflow(workflow: WorkflowDefinition): Promise<void> {
  try {
    const base = await getBase();
    
    try {
      // Check if exists
      const existing = await base("Automation_Registry")
        .select({
          filterByFormula: `{workflowId} = '${workflow.workflowId}'`,
          maxRecords: 1
        })
        .all();

      if (existing.length > 0) {
        // Update
        await base("Automation_Registry").update([
          {
            id: existing[0].id,
            fields: {
              workflowId: workflow.workflowId,
              name: workflow.name,
              description: workflow.description,
              controlState: workflow.controlState,
              runnerType: workflow.runnerType,
              endpointOrCommand: workflow.endpointOrCommand || "",
              status: workflow.status,
              parameters: workflow.parameters ? JSON.stringify(workflow.parameters) : "",
              updatedAt: new Date().toISOString()
            }
          }
        ]);
      } else {
        // Create
        await base("Automation_Registry").create([
          {
            fields: {
              workflowId: workflow.workflowId,
              name: workflow.name,
              description: workflow.description,
              controlState: workflow.controlState,
              runnerType: workflow.runnerType,
              endpointOrCommand: workflow.endpointOrCommand || "",
              status: workflow.status,
              parameters: workflow.parameters ? JSON.stringify(workflow.parameters) : "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
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

    // Fallback to file-based
    const workflows = await getAllWorkflows();
    const index = workflows.findIndex(w => w.workflowId === workflow.workflowId);
    
    if (index >= 0) {
      workflows[index] = workflow;
    } else {
      workflows.push(workflow);
    }

    await saveJson({
      key: "workflow_registry",
      fileName: "workflow-registry.json",
      value: workflows
    });
  } catch (error) {
    console.error("Error saving workflow:", error);
    throw error;
  }
}
