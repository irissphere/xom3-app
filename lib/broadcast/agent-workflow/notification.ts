// Broadcast Engine - Agent Workflow: Notification Module
// Delivers real-time alerts to agents via cockpit, email, SMS, Slack

import { LeadObject } from "../funnel-modules/lead-intake";
import { RoutingDecision } from "../funnel-modules/routing";
import { Task } from "../funnel-modules/task";

export type NotificationChannel = "cockpit" | "email" | "sms" | "slack";

export interface AgentNotification {
  id: string;
  agentId: string;
  type: "new_lead" | "dm_intent" | "comment_intent" | "link_click" | "trend_spike" | "pipeline_movement";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  leadId?: string;
  clientId?: string;
  taskId?: string;
  platform?: string;
  channels: NotificationChannel[];
  metadata: {
    lead?: LeadObject;
    routing?: RoutingDecision;
    task?: Task;
    timestamp: string;
  };
}

/**
 * Notify agent of new lead
 */
export async function notifyNewLead(
  agentId: string,
  lead: LeadObject,
  routing: RoutingDecision,
  channels: NotificationChannel[] = ["cockpit", "slack"]
): Promise<AgentNotification> {
  const notification: AgentNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    type: routing.entryPoint === "dm_intent" ? "dm_intent" : 
          routing.entryPoint === "comment_intent" ? "comment_intent" :
          routing.entryPoint === "link_click" ? "link_click" :
          "new_lead",
    priority: routing.urgency === "high" ? "high" : "medium",
    title: `New ${lead.leadTier} lead from ${lead.platform}`,
    message: `${lead.username || "User"} (score: ${lead.leadScore}): "${lead.content.substring(0, 100)}"`,
    leadId: lead.id,
    platform: lead.platform,
    channels,
    metadata: {
      lead,
      routing,
      timestamp: new Date().toISOString()
    }
  };
  
  await deliverNotification(notification);
  
  return notification;
}

/**
 * Notify agent of pipeline movement
 */
export async function notifyPipelineMovement(
  agentId: string,
  clientId: string,
  previousStage: string,
  newStage: string,
  channels: NotificationChannel[] = ["cockpit"]
): Promise<AgentNotification> {
  const notification: AgentNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    type: "pipeline_movement",
    priority: "medium",
    title: `Pipeline movement: ${previousStage} → ${newStage}`,
    message: `Client ${clientId} moved from ${previousStage} to ${newStage}`,
    clientId,
    channels,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };
  
  await deliverNotification(notification);
  
  return notification;
}

/**
 * Deliver notification to channels
 */
async function deliverNotification(notification: AgentNotification): Promise<void> {
  for (const channel of notification.channels) {
    try {
      switch (channel) {
        case "cockpit":
          await deliverCockpitNotification(notification);
          break;
        case "email":
          await deliverEmailNotification(notification);
          break;
        case "sms":
          await deliverSMSNotification(notification);
          break;
        case "slack":
          await deliverSlackNotification(notification);
          break;
      }
    } catch (error: any) {
      console.error(`[Agent Workflow] Failed to deliver ${channel} notification:`, error);
    }
  }
}

/**
 * Deliver cockpit notification (in-app)
 */
async function deliverCockpitNotification(notification: AgentNotification): Promise<void> {
  // Emit UOI signal for cockpit notification
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "agent_notification",
    payload: {
      notificationId: notification.id,
      agentId: notification.agentId,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      leadId: notification.leadId,
      clientId: notification.clientId,
      taskId: notification.taskId,
      platform: notification.platform,
      metadata: notification.metadata
    },
    priority: notification.priority
  });
}

/**
 * Deliver email notification
 */
async function deliverEmailNotification(notification: AgentNotification): Promise<void> {
  // In production, send email via email service
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "email_notification",
    payload: {
      to: `agent_${notification.agentId}@xom3.io`, // In production, get agent email
      subject: notification.title,
      body: notification.message,
      notificationId: notification.id
    },
    priority: notification.priority
  });
}

/**
 * Deliver SMS notification
 */
async function deliverSMSNotification(notification: AgentNotification): Promise<void> {
  // In production, send SMS via SMS service
  // For now, emit signal
  const { emitSignal } = await import("@/lib/uoi/signals");
  emitSignal({
    source: "broadcast_engine",
    type: "sms_notification",
    payload: {
      to: `agent_${notification.agentId}_phone`, // In production, get agent phone
      message: `${notification.title}: ${notification.message}`,
      notificationId: notification.id
    },
    priority: notification.priority === "high" ? "high" : "medium"
  });
}

/**
 * Deliver Slack notification
 */
async function deliverSlackNotification(notification: AgentNotification): Promise<void> {
  try {
    const { sendNotification } = await import("@/lib/notifications/send");
    
    await sendNotification(
      "default", // tenant
      {
        message: `*${notification.title}*\n${notification.message}`,
        priority: notification.priority,
        metadata: {
          notificationId: notification.id,
          agentId: notification.agentId,
          type: notification.type,
          leadId: notification.leadId,
          clientId: notification.clientId,
          taskId: notification.taskId,
          platform: notification.platform
        }
      },
      ["slack"],
      undefined,
      0
    );
  } catch (error: any) {
    console.error("[Agent Workflow] Slack notification failed:", error);
  }
}

/**
 * Batch notify agents
 */
export async function batchNotifyAgents(
  notifications: Array<{
    agentId: string;
    lead: LeadObject;
    routing: RoutingDecision;
    channels?: NotificationChannel[];
  }>
): Promise<AgentNotification[]> {
  const results: AgentNotification[] = [];
  
  for (const notif of notifications) {
    const notification = await notifyNewLead(
      notif.agentId,
      notif.lead,
      notif.routing,
      notif.channels || ["cockpit", "slack"]
    );
    results.push(notification);
  }
  
  return results;
}
