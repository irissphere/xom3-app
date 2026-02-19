// Agent Task Management
// Task assignment, filtering, and action handling

// Dynamic import for Airtable - imported at runtime only
import { getAgentIdentity, AgentIdentity } from "./identity";
import { agentHasPermission } from "./identity";

async function getBase() {
  // Dynamic import to avoid build-time initialization
  const Airtable = (await import("airtable")).default;
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_USHA_BASE_ID;
  
  if (!apiKey || !baseId) {
    throw new Error("Airtable configuration missing");
  }
  
  return new Airtable({ apiKey }).base(baseId);
}

export interface AgentTask {
  id: string;
  title: string;
  description?: string;
  status: "To Do" | "In Progress" | "Blocked" | "Done" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Critical";
  dueDate?: string;
  completedDate?: string;
  clientId?: string;
  clientName?: string;
  pipelineStage?: string;
  complianceRequired?: boolean;
  billingLinked?: boolean;
  createdAt: string;
}

export interface TaskFilters {
  status?: string[];
  priority?: string[];
  overdue?: boolean;
  clientId?: string;
  pipelineStage?: string;
  complianceRequired?: boolean;
}

/**
 * Get tasks assigned to agent
 */
export async function getAgentTasks(
  agentId: string,
  filters?: TaskFilters,
  tenant?: string
): Promise<AgentTask[]> {
  try {
    let formula = `{Assignee} = '${agentId}'`;
    
    if (tenant) {
      formula = `AND(${formula}, {Tenant} = '${tenant}')`;
    }

    if (filters?.status && filters.status.length > 0) {
      const statusFilter = filters.status.map(s => `'${s}'`).join(",");
      formula = `AND(${formula}, OR(Status = ${statusFilter}))`;
    }

    if (filters?.priority && filters.priority.length > 0) {
      const priorityFilter = filters.priority.map(p => `'${p}'`).join(",");
      formula = `AND(${formula}, OR(Priority = ${priorityFilter}))`;
    }

    if (filters?.overdue) {
      formula = `AND(${formula}, AND(IS_BEFORE({Due Date}, TODAY()), Status != 'Done'))`;
    }

    if (filters?.clientId) {
      formula = `AND(${formula}, FIND('${filters.clientId}', ARRAYJOIN({Client})))`;
    }

    if (filters?.pipelineStage) {
      // This would need to join with Clients table to get stage
      // For now, placeholder
    }

    const base = await getBase();
    const records = await base("Tasks").select({
      filterByFormula: formula,
      sort: [{ field: "Due Date", direction: "asc" }],
    }).all();

    const tasks: AgentTask[] = [];

    for (const record of records) {
      const fields = record.fields as any;
      
      // Get client name if linked
      let clientName: string | undefined;
      if (fields.Client && Array.isArray(fields.Client) && fields.Client.length > 0) {
        try {
          const client = await base("Clients").find(fields.Client[0]);
          clientName = `${(client.fields as any).firstName || ""} ${(client.fields as any).lastName || ""}`.trim() || 
                      (client.fields as any).Name || "Unknown Client";
          
          // Get pipeline stage from client
          const clientStage = (client.fields as any).Status;
          if (clientStage) {
            tasks.push({
              id: record.id,
              title: fields.Title || "Untitled Task",
              description: fields.Description,
              status: fields.Status || "To Do",
              priority: fields.Priority || "Medium",
              dueDate: fields["Due Date"],
              completedDate: fields["Completed Date"],
              clientId: fields.Client[0],
              clientName,
              pipelineStage: clientStage,
              complianceRequired: false, // Would need to check compliance logs
              billingLinked: false, // Would need to check billing records
              createdAt: fields["Created Date"] || (record as any).createdTime,
            });
            continue;
          }
        } catch {
          // Client not found, continue without client info
        }
      }

      tasks.push({
        id: record.id,
        title: fields.Title || "Untitled Task",
        description: fields.Description,
        status: fields.Status || "To Do",
        priority: fields.Priority || "Medium",
        dueDate: fields["Due Date"],
        completedDate: fields["Completed Date"],
        clientId: fields.Client?.[0],
        clientName,
        complianceRequired: false,
        billingLinked: false,
        createdAt: fields["Created Date"] || (record as any).createdTime,
      });
    }

    return tasks;
  } catch (error) {
    console.error("Error getting agent tasks:", error);
    return [];
  }
}

/**
 * Get today's tasks for agent
 */
export async function getTodaysTasks(
  agentId: string,
  tenant?: string
): Promise<AgentTask[]> {
  const today = new Date().toISOString().split("T")[0];
  const tasks = await getAgentTasks(agentId, undefined, tenant);
  
  return tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = task.dueDate.split("T")[0];
    return dueDate === today && task.status !== "Done";
  });
}

/**
 * Get overdue tasks for agent
 */
export async function getOverdueTasks(
  agentId: string,
  tenant?: string
): Promise<AgentTask[]> {
  return getAgentTasks(agentId, { overdue: true }, tenant);
}

/**
 * Complete a task
 */
export async function completeTask(
  taskId: string,
  agentId: string,
  notes?: string
): Promise<boolean> {
  try {
    const agent = await getAgentIdentity(agentId);
    if (!agent || !agentHasPermission(agent, "complete:tasks")) {
      return false;
    }

    const base = await getBase();
    await base("Tasks").update([
      {
        id: taskId,
        fields: {
          Status: "Done",
          "Completed Date": new Date().toISOString(),
          ...(notes && { Description: notes }),
        },
      },
    ]);

    return true;
  } catch (error) {
    console.error("Error completing task:", error);
    return false;
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: AgentTask["status"],
  agentId: string
): Promise<boolean> {
  try {
    const agent = await getAgentIdentity(agentId);
    if (!agent || !agentHasPermission(agent, "edit:assigned")) {
      return false;
    }

    const base = await getBase();
    await base("Tasks").update([
      {
        id: taskId,
        fields: {
          Status: status,
          ...(status === "Done" && { "Completed Date": new Date().toISOString() }),
        },
      },
    ]);

    return true;
  } catch (error) {
    console.error("Error updating task status:", error);
    return false;
  }
}
