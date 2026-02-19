// Client Notification System
// Automation-driven notifications triggered by HPE stage transitions

import { sendNotification } from "@/lib/notifications/send";
import { resolveTenant } from "@/lib/tenant/resolve";
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

export interface ClientNotification {
  type: "stage_transition" | "document_request" | "document_received" | "policy_update" | "task_assigned";
  clientId: string;
  clientEmail: string;
  message: string;
  metadata?: Record<string, any>;
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<string, (data: any) => string> = {
  "application_received": (data) => 
    `Your application has been received. We're reviewing it and will be in touch soon.`,
  
  "documents_needed": (data) => 
    `We need additional documents to complete your application. Please check your portal for details.`,
  
  "in_underwriting": (data) => 
    `Your application is now in underwriting. We'll notify you once the review is complete.`,
  
  "policy_approved": (data) => 
    `Great news! Your policy has been approved. Check your portal for next steps.`,
  
  "policy_active": (data) => 
    `Your policy is now active. Welcome! You can access your policy details in your portal.`,
  
  "document_received": (data) => 
    `We've received your document. Thank you! Our team will review it shortly.`,
  
  "stage_transition": (data) => {
    const stageNames: Record<string, string> = {
      "Prospect": "Prospect",
      "Intake": "Intake",
      "Active": "Active Policy",
      "Compliance": "Compliance Review",
      "Closed": "Closed"
    };
    const stageName = stageNames[data.newStage] || data.newStage;
    return `Your application status has been updated to: ${stageName}. Check your portal for details.`;
  }
};

/**
 * Send notification to client
 */
export async function notifyClient(notification: ClientNotification): Promise<void> {
  try {
    // Get client record to find email
    const base = await getBase();
    const clientRecord = await base("Clients").find(notification.clientId);
    const email = (clientRecord.fields.Email as string) || notification.clientEmail;

    if (!email) {
      console.error("[Client Notification] No email found for client:", notification.clientId);
      return;
    }

    // For now, we'll log the notification
    // In production, send via email service (SendGrid, Resend, etc.)
    console.log(`[Client Notification] To: ${email}`);
    console.log(`[Client Notification] Message: ${notification.message}`);

    // Store notification in Client Notifications table (if it exists)
    try {
      const base = await getBase();
      await base("Client Notifications").create([{
        fields: {
          "Client": [notification.clientId],
          "Type": notification.type,
          "Message": notification.message,
          "Sent At": new Date().toISOString(),
          "Status": "Sent"
        }
      }]);
    } catch (tableError) {
      // Table might not exist yet - that's okay
      console.log("[Client Notification] Notifications table not found, skipping storage");
    }

    // In production, send actual email here
    // await sendEmail(email, notification.message, notification.metadata);
  } catch (error: any) {
    console.error("[Client Notification] Failed:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Handle HPE stage transition notification
 */
export async function handleStageTransitionNotification(
  clientId: string,
  oldStage: string,
  newStage: string,
  clientData?: Record<string, any>
): Promise<void> {
  try {
    // Get client record
    const base = await getBase();
    const clientRecord = await base("Clients").find(clientId);
    const email = clientRecord.fields.Email as string;
    const name = clientRecord.fields.Name as string;

    // Determine notification template based on stage
    let templateKey = "stage_transition";
    if (newStage === "Intake" && oldStage === "Prospect") {
      templateKey = "application_received";
    } else if (newStage === "Active" && oldStage === "Intake") {
      templateKey = "in_underwriting";
    } else if (newStage === "Active") {
      templateKey = "policy_approved";
    }

    const template = NOTIFICATION_TEMPLATES[templateKey] || NOTIFICATION_TEMPLATES["stage_transition"];
    const message = template({ oldStage, newStage, name, ...clientData });

    await notifyClient({
      type: "stage_transition",
      clientId,
      clientEmail: email,
      message,
      metadata: {
        oldStage,
        newStage,
        templateKey
      }
    });
  } catch (error: any) {
    console.error("[Stage Transition Notification] Failed:", error);
  }
}

/**
 * Handle document request notification
 */
export async function handleDocumentRequestNotification(
  clientId: string,
  documentType: string,
  description: string
): Promise<void> {
  try {
    const base = await getBase();
    const clientRecord = await base("Clients").find(clientId);
    const email = clientRecord.fields.Email as string;

    const message = NOTIFICATION_TEMPLATES["documents_needed"]({ documentType, description });

    await notifyClient({
      type: "document_request",
      clientId,
      clientEmail: email,
      message,
      metadata: {
        documentType,
        description
      }
    });
  } catch (error: any) {
    console.error("[Document Request Notification] Failed:", error);
  }
}
