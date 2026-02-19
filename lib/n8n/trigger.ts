/**
 * XOM3 n8n Workflow Trigger Utility
 * 
 * Provides a clean interface for triggering n8n workflows from the XOM3 app.
 * Handles webhook calls, error handling, and logging.
 */

import { getWebhookUrl, getWorkflowDefinition, WORKFLOW_REGISTRY } from "./workflow-registry";

export interface TriggerResult {
  success: boolean;
  workflowKey: string;
  workflowId: string;
  webhookUrl: string | null;
  response?: any;
  error?: string;
  duration: number;
}

/**
 * Trigger an n8n workflow by its registry key
 * 
 * @param workflowKey - Key from WORKFLOW_REGISTRY (e.g., "xom3-intake")
 * @param payload - Data to send to the webhook
 * @param options - Additional options
 */
export async function triggerWorkflow(
  workflowKey: string,
  payload: Record<string, any>,
  options: {
    timeout?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<TriggerResult> {
  const startTime = Date.now();
  const workflow = getWorkflowDefinition(workflowKey);
  
  if (!workflow) {
    return {
      success: false,
      workflowKey,
      workflowId: "",
      webhookUrl: null,
      error: `Unknown workflow: ${workflowKey}`,
      duration: Date.now() - startTime,
    };
  }

  const webhookUrl = getWebhookUrl(workflowKey);
  
  if (!webhookUrl) {
    return {
      success: false,
      workflowKey,
      workflowId: workflow.id,
      webhookUrl: null,
      error: `Workflow ${workflowKey} has no webhook URL (cron-triggered?)`,
      duration: Date.now() - startTime,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = options.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    console.log(`[n8n] Triggering ${workflowKey} at ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Source": "xom3-cockpit",
        "X-Workflow-Key": workflowKey,
        ...options.headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[n8n] Workflow ${workflowKey} failed: ${response.status} ${errorText}`);
      
      return {
        success: false,
        workflowKey,
        workflowId: workflow.id,
        webhookUrl,
        error: `HTTP ${response.status}: ${errorText}`,
        duration,
      };
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[n8n] Workflow ${workflowKey} completed in ${duration}ms`);

    return {
      success: true,
      workflowKey,
      workflowId: workflow.id,
      webhookUrl,
      response: data,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error.name === "AbortError" 
      ? `Timeout after ${options.timeout || 30000}ms`
      : error.message || "Unknown error";
    
    console.error(`[n8n] Workflow ${workflowKey} error:`, errorMessage);

    return {
      success: false,
      workflowKey,
      workflowId: workflow.id,
      webhookUrl,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Trigger intake lead workflow
 */
export async function triggerIntakeLead(lead: {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  goal?: string;
  source?: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("xom3-intake", {
    ...lead,
    leadId: `lead_${Date.now()}`,
    submittedAt: new Date().toISOString(),
    notifyEmail: "preston.chenault@xom3.io",
  });
}

/**
 * Trigger custom build request workflow
 */
export async function triggerCustomBuild(request: {
  name: string;
  email: string;
  businessName?: string;
  requirements: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("xom3-custom-build", {
    ...request,
    requestId: `build_${Date.now()}`,
    submittedAt: new Date().toISOString(),
  });
}

/**
 * Trigger trial signup workflow
 */
export async function triggerTrialSignup(signup: {
  name?: string;
  email: string;
  tier: string;
  trialStartedAt: string;
  trialEndsAt: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("xom3-trial", {
    ...signup,
    source: "xom3_trial_form",
  });
}

/**
 * Trigger BenefitsCRM intake workflow
 */
export async function triggerBenefitscrmIntake(lead: {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
  benefitType?: string;
  coverageNeeded?: string;
  employeeCount?: number;
  notes?: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("benefitscrm-intake", {
    ...lead,
    leadId: `benefits_${Date.now()}`,
    submittedAt: new Date().toISOString(),
  });
}

/**
 * Trigger HSE health alert workflow
 */
export async function triggerHseAlert(alert: {
  severity: "info" | "warning" | "critical";
  source: string;
  posture?: string;
  riskLevel?: string;
  anomalyCount?: number;
  message: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("hse-alert", {
    ...alert,
    alertId: `hse_${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Trigger broadcast content dispatch workflow
 */
export async function triggerBroadcastDispatch(content: {
  platform: string;
  contentType: string;
  topic?: string;
  content: string;
  scheduledAt?: string;
  status?: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("broadcast-dispatch", {
    ...content,
    dispatchId: `broadcast_${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Trigger SpaceBaddie social message dispatch workflow
 */
export async function triggerSpacebaddieSocialDispatch(payload: {
  tenant: string;
  platform: string;
  channel: string;
  messageId: string;
  conversationId: string;
  contactId: string;
  handle?: string | null;
  content: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("spacebaddie-social-dispatch", {
    ...payload,
    dispatchedAt: new Date().toISOString(),
  });
}

/**
 * Trigger ritual automation workflow
 */
export async function triggerRitualAutomation(ritual: {
  ritualKey: string;
  reason?: string;
  source?: string;
}): Promise<TriggerResult> {
  return triggerWorkflow("ritual-trigger", {
    ...ritual,
    triggerId: `ritual_${Date.now()}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get workflow status (which are active in n8n)
 */
export function getWorkflowStatus(): Record<string, { id: string; active: boolean; webhookUrl: string | null }> {
  const status: Record<string, { id: string; active: boolean; webhookUrl: string | null }> = {};
  
  for (const [key, workflow] of Object.entries(WORKFLOW_REGISTRY)) {
    status[key] = {
      id: workflow.id,
      active: workflow.active,
      webhookUrl: getWebhookUrl(key),
    };
  }
  
  return status;
}




































