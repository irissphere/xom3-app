// HPE Automation Engine
// Stage-based automation that triggers emails, tasks, workflows, notifications,
// compliance logging, billing updates, and UOI/HSE signals

import { PipelineClient, PipelineStage, DEFAULT_PIPELINE_CONFIG } from "./schema";
import { sendNotification } from "../notifications/send";
import { emitSignal } from "../uoi/signals";
import { emitStateUpdate } from "../hse/signals";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface AutomationContext {
  client: PipelineClient;
  oldStage: PipelineStage;
  newStage: PipelineStage;
  userId?: string;
  tenant: string;
  metadata?: Record<string, any>;
}

export interface AutomationResult {
  success: boolean;
  emailsSent: number;
  tasksCreated: number;
  workflowsTriggered: number;
  notificationsSent: number;
  complianceLogged: boolean;
  billingUpdated: boolean;
  errors: string[];
}

/**
 * Execute all automations for a stage transition
 */
export async function executeStageAutomations(
  context: AutomationContext
): Promise<AutomationResult> {
  const result: AutomationResult = {
    success: true,
    emailsSent: 0,
    tasksCreated: 0,
    workflowsTriggered: 0,
    notificationsSent: 0,
    complianceLogged: false,
    billingUpdated: false,
    errors: []
  };

  try {
    // Get stage rules
    const stageRule = DEFAULT_PIPELINE_CONFIG.stageRules?.[context.newStage];
    if (!stageRule) {
      return result; // No automations for this stage
    }

    // Execute automations in parallel where possible
    const automationPromises: Promise<void>[] = [];

    // 1. Send emails
    if (stageRule.autoTriggers?.includes("welcome-email") || 
        stageRule.autoTriggers?.includes("intake-workflow") ||
        stageRule.autoTriggers?.includes("active-monitoring")) {
      automationPromises.push(
        sendStageEmail(context).then(sent => {
          if (sent) result.emailsSent++;
        }).catch(err => {
          result.errors.push(`Email failed: ${err.message}`);
        })
      );
    }

    // 2. Create required tasks
    if (stageRule.requiredTasks && stageRule.requiredTasks.length > 0) {
      automationPromises.push(
        createRequiredTasks(context, stageRule.requiredTasks).then(created => {
          result.tasksCreated += created;
        }).catch(err => {
          result.errors.push(`Task creation failed: ${err.message}`);
        })
      );
    }

    // 3. Trigger workflows
    if (stageRule.autoTriggers && stageRule.autoTriggers.length > 0) {
      automationPromises.push(
        triggerWorkflows(context, stageRule.autoTriggers).then(triggered => {
          result.workflowsTriggered += triggered;
        }).catch(err => {
          result.errors.push(`Workflow trigger failed: ${err.message}`);
        })
      );
    }

    // 4. Send notifications
    automationPromises.push(
      sendNotifications(context).then(sent => {
        result.notificationsSent += sent;
      }).catch(err => {
        result.errors.push(`Notification failed: ${err.message}`);
      })
    );

    // 5. Log compliance
    automationPromises.push(
      logCompliance(context).then(logged => {
        result.complianceLogged = logged;
      }).catch(err => {
        result.errors.push(`Compliance logging failed: ${err.message}`);
      })
    );

    // 6. Update billing if needed
    if (context.newStage === "Active" || context.newStage === "Closed") {
      automationPromises.push(
        updateBilling(context).then(updated => {
          result.billingUpdated = updated;
        }).catch(err => {
          result.errors.push(`Billing update failed: ${err.message}`);
        })
      );
    }

    // Wait for all automations
    await Promise.allSettled(automationPromises);

    // Emit UOI signal
    emitSignal({
      source: "hpe-automation-engine",
      type: "stage_automation",
      severity: "low",
      payload: {
        clientId: context.client.airtableId,
        oldStage: context.oldStage,
        newStage: context.newStage,
        automationsExecuted: {
          emails: result.emailsSent,
          tasks: result.tasksCreated,
          workflows: result.workflowsTriggered,
          notifications: result.notificationsSent
        }
      }
    });

    // Emit HSE state update
    emitStateUpdate([
      "hpe_automation_executed",
      `client_${context.client.airtableId}`,
      `stage_${context.newStage}`,
      `emails_${result.emailsSent}`,
      `tasks_${result.tasksCreated}`
    ]);

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Automation execution failed: ${error.message}`);
    return result;
  }
}

/**
 * Send stage-specific email
 */
async function sendStageEmail(context: AutomationContext): Promise<boolean> {
  const emailTemplates: Record<PipelineStage, { subject: string; body: string }> = {
    Prospect: {
      subject: "Welcome to Healthcare Services",
      body: `Hi ${context.client.name},\n\nThank you for your interest. We'll be in touch soon.`
    },
    Intake: {
      subject: "Next Steps - Intake Process",
      body: `Hi ${context.client.name},\n\nLet's get started with your intake process.`
    },
    Active: {
      subject: "You're Now Active!",
      body: `Hi ${context.client.name},\n\nYour account is now active. Welcome aboard!`
    },
    Compliance: {
      subject: "Compliance Review Required",
      body: `Hi ${context.client.name},\n\nWe need to review your compliance status.`
    },
    Closed: {
      subject: "Account Closure Confirmation",
      body: `Hi ${context.client.name},\n\nYour account has been closed. Thank you for your business.`
    }
  };

  const template = emailTemplates[context.newStage];
  if (!template) return false;

  // In production, use actual email service (SendGrid, Resend, etc.)
  // For now, log to Airtable Interactions
  try {
    await base("Interactions").create([
      {
        fields: {
          Client: [context.client.airtableId],
          Date: new Date().toISOString(),
          Channel: "Email",
          Type: "Onboarding",
          Notes: `Email sent: ${template.subject}\n\n${template.body}`,
          Outcome: "Sent"
        }
      }
    ]);
    return true;
  } catch (error) {
    console.error("Failed to log email:", error);
    return false;
  }
}

/**
 * Create required tasks for stage
 */
async function createRequiredTasks(
  context: AutomationContext,
  requiredTaskIds: string[]
): Promise<number> {
  const taskTemplates: Record<string, { title: string; description: string; priority: string }> = {
    "intake-form": {
      title: "Complete Intake Form",
      description: "Client needs to complete intake form",
      priority: "High"
    },
    "compliance-review": {
      title: "Compliance Review",
      description: "Review client compliance status",
      priority: "High"
    },
    "initial-review": {
      title: "Initial Client Review",
      description: "Review new client information",
      priority: "Medium"
    }
  };

  let created = 0;
  for (const taskId of requiredTaskIds) {
    const template = taskTemplates[taskId];
    if (!template) continue;

    try {
      // Check if task already exists
      const existing = await base("Tasks")
        .select({
          filterByFormula: `AND({Client} = '${context.client.airtableId}', {Title} = '${template.title}')`
        })
        .all()
        .then((rows) => rows[0] || null);

      if (existing) continue; // Task already exists

      await base("Tasks").create([
        {
          fields: {
            Title: template.title,
            Description: template.description,
            Client: [context.client.airtableId],
            Status: "To Do",
            Priority: template.priority,
            "Created Date": new Date().toISOString()
          }
        }
      ]);
      created++;
    } catch (error) {
      console.error(`Failed to create task ${taskId}:`, error);
    }
  }

  return created;
}

/**
 * Trigger workflows (n8n, Zapier, etc.)
 */
async function triggerWorkflows(
  context: AutomationContext,
  triggerIds: string[]
): Promise<number> {
  let triggered = 0;

  for (const triggerId of triggerIds) {
    try {
      const { triggerStageChangeWebhook } = await import("../webhooks/trigger-engine");
      const results = await triggerStageChangeWebhook(
        context.client.airtableId,
        context.oldStage,
        context.newStage,
        {
          triggerId,
          client: {
            name: context.client.name,
            email: context.client.email,
            stage: context.newStage,
            tenant: context.tenant
          },
          ...context.metadata
        }
      );

      if (results.some(r => r.success)) {
        triggered++;
      }
    } catch (error) {
      console.error(`Failed to trigger workflow ${triggerId}:`, error);
    }
  }

  return triggered;
}

/**
 * Send notifications to agents
 */
async function sendNotifications(context: AutomationContext): Promise<number> {
  try {
    await sendNotification(
      context.tenant,
      {
        message: `Client ${context.client.name} moved from ${context.oldStage} to ${context.newStage}`,
        details: {
          clientId: context.client.airtableId,
          clientName: context.client.name,
          oldStage: context.oldStage,
          newStage: context.newStage,
          timestamp: new Date().toISOString()
        }
      },
      ["slack", "email"],
      `stage-transition-${context.newStage.toLowerCase()}`
    );
    return 1;
  } catch (error) {
    console.error("Failed to send notification:", error);
    return 0;
  }
}

/**
 * Log compliance event
 */
async function logCompliance(context: AutomationContext): Promise<boolean> {
  try {
    await base("Compliance Logs").create([
      {
        fields: {
          Client: [context.client.airtableId],
          "Event Type": "Review",
          Description: `Stage transition: ${context.oldStage} → ${context.newStage}`,
          Status: "Pending",
          Date: new Date().toISOString(),
          Notes: `Automated compliance log for stage transition. User: ${context.userId || "system"}`
        }
      }
    ]);

    // Emit compliance signal
    const { emitComplianceSignal } = await import("../uoi/compliance-signal");
    emitComplianceSignal("compliance_check", 1, {
      clientId: context.client.airtableId,
      type: "stage_transition",
      oldStage: context.oldStage,
      newStage: context.newStage
    });

    return true;
  } catch (error) {
    console.error("Failed to log compliance:", error);
    return false;
  }
}

/**
 * Update billing based on stage
 */
async function updateBilling(context: AutomationContext): Promise<boolean> {
  try {
    // For Active stage, create initial billing record if none exists
    if (context.newStage === "Active") {
      const existingBilling = await base("Billing")
        .select({
          filterByFormula: `{Client} = '${context.client.airtableId}'`
        })
        .all()
        .then((rows) => rows[0] || null);

      if (!existingBilling) {
        await base("Billing").create([
          {
            fields: {
              Client: [context.client.airtableId],
              "Invoice ID": `INV-${context.client.airtableId}-${Date.now()}`,
              Amount: 0, // Will be updated by billing system
              Status: "Draft",
              "Due Date": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
            }
          }
        ]);
        return true;
      }
    }

    // For Closed stage, mark all open invoices as Cancelled
    if (context.newStage === "Closed") {
      const openBilling = await base("Billing")
        .select({
          filterByFormula: `AND({Client} = '${context.client.airtableId}', OR({Status} = 'Draft', {Status} = 'Sent'))`
        })
        .all();

      if (openBilling.length > 0) {
        const updates = openBilling.map(record => ({
          id: record.id,
          fields: { Status: "Cancelled" }
        }));

        await base("Billing").update(updates);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to update billing:", error);
    return false;
  }
}
