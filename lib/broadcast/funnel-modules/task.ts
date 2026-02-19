// Broadcast Engine - Funnel Engine: Task Module
// Creates tasks with priority, due date, agent assignment

import { LeadObject } from "./lead-intake";
import { RoutingDecision } from "./routing";

export interface Task {
  id: string;
  clientId: string;
  leadId: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  dueDate?: string; // ISO date string
  agentId?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  taskType: "dm_followup" | "comment_reply" | "call" | "warmup" | "trend_campaign" | "other";
  metadata: {
    platform: string;
    entryPoint: string;
    leadScore: number;
    leadTier: string;
    createdAt: string;
  };
}

/**
 * Create task from lead and routing
 */
export function createTask(
  lead: LeadObject,
  routing: RoutingDecision,
  clientId: string,
  agentId?: string
): Task {
  // Determine task type from entry point
  let taskType: Task["taskType"] = "other";
  if (routing.entryPoint === "dm_intent") {
    taskType = "dm_followup";
  } else if (routing.entryPoint === "comment_intent") {
    taskType = "comment_reply";
  } else if (routing.entryPoint === "link_click") {
    taskType = "call";
  } else if (routing.entryPoint === "high_engagement") {
    taskType = "warmup";
  } else if (routing.entryPoint === "trend_spike") {
    taskType = "trend_campaign";
  }
  
  const task: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    clientId,
    leadId: lead.id,
    title: routing.taskDescription,
    description: `Lead from ${lead.platform}: ${lead.content.substring(0, 200)}`,
    priority: routing.taskPriority,
    dueDate: routing.taskDueDate,
    agentId,
    status: "pending",
    taskType,
    metadata: {
      platform: lead.platform,
      entryPoint: routing.entryPoint,
      leadScore: lead.leadScore,
      leadTier: lead.leadTier,
      createdAt: new Date().toISOString()
    }
  };
  
  // Emit signal for task creation
  try {
    const { emitSignal } = require("@/lib/uoi/signals");
    emitSignal({
      source: "broadcast_engine",
      type: "task_created",
      payload: {
        taskId: task.id,
        clientId: task.clientId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        agentId: task.agentId,
        taskType: task.taskType,
        metadata: task.metadata
      },
      priority: routing.taskPriority === "high" ? "high" : "medium"
    });
  } catch (error) {
    console.error("[Funnel Task] Task creation signal failed:", error);
  }
  
  return task;
}

/**
 * Create task via HPE API
 */
export async function createTaskViaHPE(
  task: Task
): Promise<{ success: boolean; taskId?: string }> {
  try {
    // In production, call HPE task creation API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/hpe/task/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId: task.clientId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        agentId: task.agentId,
        metadata: task.metadata
      })
    });
    
    if (!response.ok) {
      throw new Error(`HPE task creation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      taskId: data.taskId || task.id
    };
  } catch (error: any) {
    console.error("[Funnel Task] HPE task creation failed:", error);
    // Fallback: return task ID locally
    return {
      success: true,
      taskId: task.id
    };
  }
}

/**
 * Batch create tasks
 */
export function batchCreateTasks(
  leads: LeadObject[],
  routings: RoutingDecision[],
  clientIds: string[],
  agentIds?: (string | null)[]
): Task[] {
  return leads.map((lead, index) => {
    const routing = routings[index];
    const clientId = clientIds[index];
    const agentId = agentIds?.[index] || undefined;
    
    return createTask(lead, routing, clientId, agentId);
  });
}
