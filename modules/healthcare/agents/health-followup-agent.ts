// Health Follow-up Agent
// Generates, schedules, and updates follow-up tasks in the CRM

import { getBase } from "@/lib/airtable/client";
import { HealthFollowUpTask, AgentExecutionResult } from "./types";

/**
 * Health Follow-up Agent
 * Manages follow-up tasks: generate, schedule, update state transitions
 */
export class HealthFollowupAgent {
  private readonly agentId = "health-followup";
  private readonly laneId = "healthcrm-followups-tasks";

  /**
   * Execute follow-up agent processing
   * Processes "due now", "overdue", and "completed" state transitions
   */
  async execute(options?: {
    generateTasks?: boolean;
    updateStates?: boolean;
    clientId?: string;
  }): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const generateTasks = options?.generateTasks !== false;
      const updateStates = options?.updateStates !== false;
      const clientId = options?.clientId;

      let tasksGenerated = 0;
      let tasksUpdated = 0;
      let tasksCreated: string[] = [];
      let tasksCompleted: string[] = [];

      // Step 1: Generate new follow-up tasks if needed
      if (generateTasks) {
        const generated = await this.generateFollowUpTasks(clientId);
        tasksGenerated = generated.length;
        tasksCreated = generated.map((t) => t.id).filter((id): id is string => !!id);
      }

      // Step 2: Update task states (due now, overdue, completed)
      if (updateStates) {
        const updated = await this.updateTaskStates(clientId);
        tasksUpdated = updated.updated.length;
        tasksCompleted = updated.completed.map((t) => t.id).filter((id): id is string => !!id);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          tasksGenerated,
          tasksUpdated,
          tasksCreated,
          tasksCompleted,
        },
        metadata: {
          executionId,
          duration,
          processedCount: tasksGenerated + tasksUpdated,
          createdCount: tasksGenerated,
          updatedCount: tasksUpdated,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
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
   * Generate follow-up tasks for clients who need them
   */
  private async generateFollowUpTasks(
    filterClientId?: string
  ): Promise<HealthFollowUpTask[]> {
    const base = await getBase();
    const tasks: HealthFollowUpTask[] = [];

    try {
      // Get clients who need follow-ups
      // Criteria: Last contact > 7 days ago, or new clients with no follow-up scheduled
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      let clientsQuery = base("Clients").select({
        view: "Grid view",
      });

      if (filterClientId) {
        clientsQuery = base("Clients").select({
          filterByFormula: `RECORD_ID() = "${filterClientId}"`,
        });
      }

      const clients = await clientsQuery.all();

      for (const client of clients) {
        const clientId = client.id;
        const fields = client.fields;

        // Check if follow-up is needed
        const lastContact = fields["Last Contact"] || fields["Created Date"];
        const onboardingStatus = fields["Onboarding Status"] || "New";

        // Get existing tasks for this client
        const existingTasks = await base("Tasks")
          .select({
            filterByFormula: `FIND("${clientId}", {Client}) > 0`,
            maxRecords: 10,
          })
          .all();

        const hasActiveFollowUp = existingTasks.some((task) => {
          const status = task.fields["Status"] || task.fields.Status;
          return status !== "Done" && status !== "Completed";
        });

        // Determine if follow-up is needed
        let needsFollowUp = false;
        let followUpType: "follow_up" | "appointment" | "check_in" | "reminder" = "follow_up";
        let priority: "low" | "medium" | "high" | "urgent" = "medium";
        let daysUntilDue = 3;

        if (!hasActiveFollowUp) {
          if (onboardingStatus === "New") {
            // New clients need initial follow-up within 2 days
            needsFollowUp = true;
            followUpType = "check_in";
            priority = "high";
            daysUntilDue = 2;
          } else if (onboardingStatus === "In Progress") {
            // In progress clients need weekly check-in
            needsFollowUp = true;
            followUpType = "check_in";
            priority = "medium";
            daysUntilDue = 7;
          } else if (lastContact) {
            const lastContactDate = new Date(lastContact as string);
            const daysSinceContact = Math.floor(
              (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceContact >= 7) {
              needsFollowUp = true;
              followUpType = "follow_up";
              priority = daysSinceContact >= 14 ? "high" : "medium";
              daysUntilDue = 0; // Due immediately
            }
          }
        }

        if (needsFollowUp) {
          // Create follow-up task
          const dueDate = new Date(now.getTime() + daysUntilDue * 24 * 60 * 60 * 1000);

          const taskFields: any = {
            Title: this.generateTaskTitle(followUpType, fields.Name as string),
            Description: this.generateTaskDescription(followUpType, fields),
            Client: [clientId],
            "Due Date": dueDate.toISOString().split("T")[0],
            Status: "pending",
            Priority: priority,
            Type: "Follow-up",
          };

          const created = await base("Tasks").create([{ fields: taskFields }]);
          const taskRecord = created[0];
          tasks.push({
            id: taskRecord?.id,
            clientId,
            title: taskFields.Title,
            description: taskFields.Description,
            dueDate: dueDate.toISOString(),
            status: "pending",
            priority,
            type: followUpType,
            createdAt: new Date().toISOString(),
          });
        }
      }
    } catch (error: any) {
      console.error("Error generating follow-up tasks:", error);
      throw new Error(`Failed to generate follow-up tasks: ${error.message}`);
    }

    return tasks;
  }

  /**
   * Update task states: mark "due now", "overdue", and handle completions
   */
  private async updateTaskStates(filterClientId?: string): Promise<{
    updated: HealthFollowUpTask[];
    completed: HealthFollowUpTask[];
  }> {
    const base = await getBase();
    const updated: HealthFollowUpTask[] = [];
    const completed: HealthFollowUpTask[] = [];
    const now = new Date();

    try {
      // Get all pending/active tasks
      let tasksQuery = base("Tasks").select({
        filterByFormula: `AND(
          {Status} != "Done",
          {Status} != "Completed"
        )`,
      });

      if (filterClientId) {
        tasksQuery = base("Tasks").select({
          filterByFormula: `AND(
            FIND("${filterClientId}", {Client}) > 0,
            {Status} != "Done",
            {Status} != "Completed"
          )`,
        });
      }

      const tasks = await tasksQuery.all();

      for (const task of tasks) {
        const taskId = task.id;
        const fields = task.fields;
        const dueDateStr = fields["Due Date"] || fields.DueDate;
        const currentStatus = fields["Status"] || fields.Status || "pending";

        if (!dueDateStr) continue;

        const dueDate = new Date(dueDateStr as string);
        const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysUntilDue < 0;
        const isDueNow = daysUntilDue === 0 || (daysUntilDue >= -1 && daysUntilDue <= 1);

        let newStatus = currentStatus;
        let updateFields: any = {};

        // Update status based on due date
        if (isOverdue && currentStatus !== "overdue") {
          newStatus = "overdue";
          updateFields.Status = "overdue";
        } else if (isDueNow && currentStatus !== "due_now" && !isOverdue) {
          newStatus = "due_now";
          updateFields.Status = "due_now";
        }

        // Check if task should be auto-completed (e.g., very old overdue tasks)
        const daysOverdue = Math.abs(daysUntilDue);
        if (isOverdue && daysOverdue > 30 && currentStatus !== "Done" && currentStatus !== "Completed") {
          // Auto-complete very old overdue tasks
          newStatus = "Done";
          updateFields.Status = "Done";
          updateFields["Completed At"] = now.toISOString();
        }

        if (Object.keys(updateFields).length > 0) {
          await base("Tasks").update(taskId, updateFields);

          const clientId = Array.isArray(fields.Client) ? fields.Client[0] : fields.Client;

          const taskData: HealthFollowUpTask = {
            id: taskId,
            clientId: clientId || "",
            title: (fields.Title || fields["Task Name"] || "Untitled") as string,
            description: (fields.Description || fields.Notes || "") as string,
            dueDate: dueDate.toISOString(),
            status: newStatus as any,
            priority: (fields.Priority || "medium") as any,
            type: "follow_up",
          };

          if (newStatus === "Done" || newStatus === "Completed") {
            completed.push(taskData);
          } else {
            updated.push(taskData);
          }
        }
      }
    } catch (error: any) {
      console.error("Error updating task states:", error);
      throw new Error(`Failed to update task states: ${error.message}`);
    }

    return { updated, completed };
  }

  /**
   * Generate task title based on type
   */
  private generateTaskTitle(
    type: "follow_up" | "appointment" | "check_in" | "reminder",
    clientName: string
  ): string {
    switch (type) {
      case "check_in":
        return `Check-in with ${clientName}`;
      case "appointment":
        return `Schedule appointment for ${clientName}`;
      case "reminder":
        return `Reminder: Follow up with ${clientName}`;
      case "follow_up":
      default:
        return `Follow up with ${clientName}`;
    }
  }

  /**
   * Generate task description based on type and client info
   */
  private generateTaskDescription(
    type: "follow_up" | "appointment" | "check_in" | "reminder",
    clientFields: any
  ): string {
    const clientName = clientFields.Name || "Client";
    const onboardingStatus = clientFields["Onboarding Status"] || "New";

    switch (type) {
      case "check_in":
        return `Automated check-in task for ${clientName}. Current onboarding status: ${onboardingStatus}. Reach out to ensure they're progressing smoothly.`;
      case "appointment":
        return `Schedule an appointment for ${clientName}. Contact them to find a convenient time.`;
      case "reminder":
        return `Reminder to follow up with ${clientName}. Ensure all their questions are answered.`;
      case "follow_up":
      default:
        return `Follow up with ${clientName} to continue engagement. Check their status and needs.`;
    }
  }
}
