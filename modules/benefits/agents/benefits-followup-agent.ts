// Benefits Follow-up Agent
// Manages scheduled callbacks, check-ins, reminders, tasks, and SMS messaging

import { getBase } from "@/lib/airtable/client";
import {
  BenefitsFollowUpTask,
  AgentExecutionResult,
  SMSTemplate,
} from "./types";
import { templateLoader } from "../messaging/template-loader";
import { triggerAgentSignal } from "@/lib/cockpit/agent-trigger";

/**
 * Benefits Follow-up Agent
 * Drives scheduled callbacks, check-ins, reminders, and operator tasks
 */
export class BenefitsFollowupAgent {
  private readonly agentId = "benefits-followup";
  private readonly laneId = "benefitscrm-followups-tasks";

  /**
   * Execute follow-up processing
   * Can be triggered by: schedule, manual action, or signal from other agents
   */
  async execute(action: "process_tasks" | "create_task" | "complete_task", payload: any): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      let resultData: any;

      switch (action) {
        case "process_tasks":
          resultData = await this.processDueTasks();
          break;
        case "create_task":
          resultData = await this.createFollowUpTask(payload.clientId, payload.taskData);
          break;
        case "complete_task":
          resultData = await this.completeTask(payload.taskId, payload.completionData);
          break;
        default:
          throw new Error(`Unsupported action: ${action}`);
      }

      const duration = Date.now() - startTime;

      // Trigger closed-loop automation circuit
      await triggerAgentSignal({
        agentId: this.agentId,
        agentName: "Benefits Follow-up Agent",
        laneId: this.laneId,
        signalType: "agent_execution",
        payload: {
          action,
          ...resultData
        },
        metadata: {
          processedCount: resultData.processedCount || 1,
        },
        success: true,
        duration,
        executionId
      });

      return {
        success: true,
        data: resultData,
        metadata: {
          executionId,
          duration,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await triggerAgentSignal({
        agentId: this.agentId,
        agentName: "Benefits Follow-up Agent",
        laneId: this.laneId,
        signalType: "agent_execution",
        payload: {
          action,
          error: error.message || "Unknown error"
        },
        metadata: {},
        success: false,
        duration,
        executionId
      });
      
      return {
        success: false,
        errors: [{ field: "execution", message: error.message || "Unknown error" }],
        metadata: {
          executionId,
          duration,
        },
      };
    }
  }

  /**
   * Process all due and overdue tasks
   */
  private async processDueTasks(): Promise<any> {
    const base = await getBase();
    const now = new Date().toISOString();

    // 1. Find pending tasks due now or overdue
    const tasks = await base("Benefits CRM Follow-ups")
      .select({
        filterByFormula: `AND({Status} = "pending", {Due Date} <= "${now}")`,
      })
      .all();

    const processedTasks = [];
    let smsSentCount = 0;

    for (const task of tasks) {
      const taskData = task.fields as any;
      const clientId = taskData.Client?.[0];

      if (!clientId) continue;

      // 2. Determine action based on task type
      if (taskData.Type === "follow_up" || taskData.Type === "reminder") {
        // Handle automatic SMS follow-up if opted in
        const client = await base("Benefits CRM Clients").find(clientId);
        const clientData = client.fields as any;

        if (clientData["SMS Opt In"] && clientData.Phone) {
          const smsSent = await this.sendFollowUpSMS(clientId, clientData, taskData);
          if (smsSent) {
            smsSentCount++;
            // Update task to reflect SMS sent
            await base("Benefits CRM Follow-ups").update(task.id, {
              "SMS Sent": true,
              "Status": "completed", // Auto-complete simple reminders after SMS
              "Completed At": new Date().toISOString()
            });
          }
        }
      }

      processedTasks.push(task.id);
    }

    return {
      processedCount: processedTasks.length,
      smsSentCount,
      taskIds: processedTasks
    };
  }

  /**
   * Create a new follow-up task
   */
  private async createFollowUpTask(clientId: string, taskData: Partial<BenefitsFollowUpTask>): Promise<any> {
    const base = await getBase();

    const fields: any = {
      Client: [clientId],
      Title: taskData.title || "Follow-up",
      Description: taskData.description || "",
      "Due Date": taskData.dueDate || new Date().toISOString(),
      Status: "pending",
      Priority: taskData.priority || "medium",
      Type: taskData.type || "follow_up",
      "Created At": new Date().toISOString(),
    };

    const created = await base("Benefits CRM Follow-ups").create([{ fields }]);
    const record = created[0];
    return {
      taskId: record?.id,
      task: record?.fields
    };
  }

  /**
   * Complete a task
   */
  private async completeTask(taskId: string, completionData: any): Promise<any> {
    const base = await getBase();

    const fields: any = {
      Status: "completed",
      "Completed At": new Date().toISOString(),
    };

    if (completionData.notes) {
      fields.Notes = completionData.notes;
    }

    await base("Benefits CRM Follow-ups").update(taskId, fields);
    
    return {
      taskId,
      status: "completed"
    };
  }

  /**
   * Send follow-up SMS using templates
   */
  private async sendFollowUpSMS(clientId: string, clientData: any, taskData: any): Promise<boolean> {
    try {
      const leadType = clientData["Lead Type"] || "Individual/Family";
      
      // Get sequence number from task metadata if available, default to 1
      const sequence = taskData.Sequence || 1;

      const personalizationData = {
        firstName: clientData.Name?.split(" ")[0] || "there",
        agentName: process.env.AGENT_NAME || "your Benefits Specialist",
        phoneNumber: process.env.COMPANY_PHONE || "our office",
        planName: clientData["Interested In"] || undefined,
      };

      const message = templateLoader.getFollowUpMessage(
        leadType as any,
        sequence,
        personalizationData
      );

      if (!message) return false;

      // Log SMS send (mock implementation)
      console.log(`[Follow-up SMS] To: ${clientData.Phone}, Message: ${message}`);

      // Log to SMS Log table
      const base = await getBase();
      await base("Benefits CRM SMS Log").create({
        Client: [clientId],
        "Phone Number": clientData.Phone,
        Message: message,
        "Message Type": "follow_up_reminder",
        "Lead Type": leadType,
        Status: "pending",
        "Sent At": new Date().toISOString(),
        "Sequence Number": sequence
      });

      // Also log to Interactions table for general visibility
      await base("Benefits CRM Interactions").create({
        Client: [clientId],
        Date: new Date().toISOString(),
        Channel: "SMS",
        Type: "Follow-up",
        Notes: `Follow-up SMS (${sequence}) sent: ${message}`,
        Outcome: "Sent",
      });

      return true;
    } catch (error) {
      console.error("Failed to send follow-up SMS:", error);
      return false;
    }
  }
}
