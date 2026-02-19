// Webhook Trigger Engine
// Centralized system for triggering webhooks on CRM events
// Supports n8n, Zapier, and custom webhooks

export type WebhookEventType = 
  | "stage_change"
  | "new_lead"
  | "appointment_scheduled"
  | "document_uploaded"
  | "policy_created"
  | "renewal_due"
  | "task_completed"
  | "client_updated"
  | "compliance_log_created";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  clientId?: string;
  metadata: Record<string, any>;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  events: WebhookEventType[];
}

export interface WebhookTriggerResult {
  success: boolean;
  webhookUrl: string;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

/**
 * Trigger webhook for a specific event
 */
export async function triggerWebhook(
  event: WebhookEventType,
  payload: Omit<WebhookPayload, "event" | "timestamp">,
  config?: Partial<WebhookConfig>
): Promise<WebhookTriggerResult[]> {
  const results: WebhookTriggerResult[] = [];
  
  // Get webhook configurations (from env or config store)
  const webhookConfigs = getWebhookConfigs(event, config);
  
  const fullPayload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    ...payload
  };

  // Trigger all configured webhooks for this event
  for (const webhookConfig of webhookConfigs) {
    if (!webhookConfig.enabled) continue;
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(webhookConfig.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Source": "xom3-crm",
          ...(webhookConfig.secret && { "X-Webhook-Signature": generateSignature(fullPayload, webhookConfig.secret) }),
          ...webhookConfig.headers
        },
        body: JSON.stringify(fullPayload)
      });

      const responseTime = Date.now() - startTime;

      results.push({
        success: response.ok,
        webhookUrl: webhookConfig.url,
        statusCode: response.status,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      });

      if (response.ok) {
        console.log(`[Webhook] Triggered ${event} → ${webhookConfig.url} (${responseTime}ms)`);
      } else {
        console.error(`[Webhook] Failed ${event} → ${webhookConfig.url}: ${response.statusText}`);
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      results.push({
        success: false,
        webhookUrl: webhookConfig.url,
        error: error.message || String(error),
        responseTime
      });

      console.error(`[Webhook] Error triggering ${event} → ${webhookConfig.url}:`, error);
    }
  }

  return results;
}

/**
 * Get webhook configurations for an event
 */
function getWebhookConfigs(
  event: WebhookEventType,
  override?: Partial<WebhookConfig>
): WebhookConfig[] {
  const configs: WebhookConfig[] = [];

  // n8n webhook (if configured)
  const n8nBaseUrl = process.env.N8N_BASE_URL;
  const n8nApiKey = process.env.N8N_API_KEY;
  
  if (n8nBaseUrl) {
    const webhookPath = getN8nWebhookPath(event);
    if (webhookPath) {
      const headers: Record<string, string> = {};
      if (n8nApiKey) headers["X-N8N-API-KEY"] = n8nApiKey;

      configs.push({
        url: `${n8nBaseUrl}/webhook/${webhookPath}`,
        secret: n8nApiKey,
        headers,
        enabled: true,
        events: [event],
        ...override
      });
    }
  }

  // Custom webhook from env (if configured)
  const customWebhookUrl = process.env.CUSTOM_WEBHOOK_URL;
  if (customWebhookUrl) {
    configs.push({
      url: override?.url || customWebhookUrl,
      secret: override?.secret,
      headers: override?.headers,
      enabled: true,
      events: [event],
      ...override
    });
  }

  return configs;
}

/**
 * Get n8n webhook path for event type
 */
function getN8nWebhookPath(event: WebhookEventType): string | null {
  const pathMap: Record<WebhookEventType, string> = {
    stage_change: process.env.N8N_USHA_INTAKE_WEBHOOK || "usha-intake-stage-change",
    new_lead: process.env.N8N_NEW_LEAD_WEBHOOK || "usha-new-lead",
    appointment_scheduled: process.env.N8N_APPOINTMENT_WEBHOOK || "usha-appointment-scheduled",
    document_uploaded: process.env.N8N_DOCUMENT_WEBHOOK || "usha-document-uploaded",
    policy_created: process.env.N8N_POLICY_WEBHOOK || "usha-policy-created",
    renewal_due: process.env.N8N_RENEWAL_WEBHOOK || "usha-renewal-due",
    task_completed: process.env.N8N_TASK_WEBHOOK || "usha-task-completed",
    client_updated: process.env.N8N_CLIENT_UPDATE_WEBHOOK || "usha-client-updated",
    compliance_log_created: process.env.N8N_COMPLIANCE_WEBHOOK || "usha-compliance-log"
  };

  return pathMap[event] || null;
}

/**
 * Generate webhook signature for security
 */
function generateSignature(payload: WebhookPayload, secret: string): string {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

/**
 * Convenience functions for common events
 */
export async function triggerStageChangeWebhook(
  clientId: string,
  oldStage: string,
  newStage: string,
  metadata?: Record<string, any>
): Promise<WebhookTriggerResult[]> {
  return triggerWebhook("stage_change", {
    clientId,
    metadata: {
      oldStage,
      newStage,
      ...metadata
    }
  });
}

export async function triggerNewLeadWebhook(
  clientId: string,
  leadData: Record<string, any>
): Promise<WebhookTriggerResult[]> {
  return triggerWebhook("new_lead", {
    clientId,
    metadata: leadData
  });
}

export async function triggerAppointmentWebhook(
  clientId: string,
  appointmentData: Record<string, any>
): Promise<WebhookTriggerResult[]> {
  return triggerWebhook("appointment_scheduled", {
    clientId,
    metadata: appointmentData
  });
}

export async function triggerDocumentWebhook(
  clientId: string,
  documentData: Record<string, any>
): Promise<WebhookTriggerResult[]> {
  return triggerWebhook("document_uploaded", {
    clientId,
    metadata: documentData
  });
}
