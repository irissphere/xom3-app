/**
 * XOM3 n8n Workflow Registry
 * 
 * Central registry mapping XOM3 functions to n8n workflows.
 * All workflows have webhook triggers at /webhook/{path}
 * 
 * n8n Server: Configured via N8N_WEBHOOK_BASE_URL env var
 * Default: http://31.220.108.45:5678
 * Cloud: https://n8n.srv1058373.hstgr.cloud (if using hosted)
 * 
 * CRM Integration:
 * - Kairos CRM Base: app4y7GKkeUfZm8rS
 * - Clients Table: tblLSfMSyhoj253NM
 * - Billing Table: tblKO42qVWZ7bwi2m
 * - Audit Logs: tblUzMOWkgysIBSMS
 * - Social Queue: tblOpdmbSCEgYaR1A
 * 
 * NOTE: HI5 is a separate client - NOT part of XOM3!
 */

export interface WorkflowDefinition {
  id: string;
  name: string;
  webhookPath: string;
  description: string;
  domain: "xom3" | "benefitscrm" | "broadcast" | "system";
  active: boolean;
}

/**
 * XOM3 Workflow Registry
 * Maps all n8n workflows for the XOM3 Cockpit
 */
export const WORKFLOW_REGISTRY: Record<string, WorkflowDefinition> = {
  // Core XOM3 Lead Flows
  "xom3-intake": {
    id: "X9YEIkp1yBcgaQ41",
    name: "XOM3 Intake Lead",
    webhookPath: "xom3/intake",
    description: "Main lead intake from XOM3 website forms",
    domain: "xom3",
    active: true,
  },
  "xom3-custom-build": {
    id: "7J9sCTat6znPUiWA",
    name: "XOM3 Custom Build Request",
    webhookPath: "xom3/custom-build",
    description: "High-priority custom automation build requests",
    domain: "xom3",
    active: true,
  },
  "xom3-trial": {
    id: "IsIbg78lEUhWb8Pu",
    name: "XOM3 Trial Signup",
    webhookPath: "xom3/trial",
    description: "Trial subscription signups with wallet enrollment",
    domain: "xom3",
    active: true,
  },
  "xom3-contact": {
    id: "AIrohzqOgAErSoqT",
    name: "XOM3 Contact Form Submission",
    webhookPath: "xom3/contact",
    description: "General contact form submissions",
    domain: "xom3",
    active: true,
  },

  // Revenue & Subscription Flows
  "xom3-stripe-events": {
    id: "oIGzdscvNXBlH2Su",
    name: "XOM3 Stripe Subscription Events",
    webhookPath: "xom3/stripe-events",
    description: "Handles all Stripe webhook events for subscriptions",
    domain: "xom3",
    active: true,
  },

  // Benefits CRM Flows
  "benefitscrm-intake": {
    id: "J4ppylxsOdu4zA1A",
    name: "XOM3 BenefitsCRM Lead Intake",
    webhookPath: "xom3/benefitscrm/intake",
    description: "Healthcare and benefits lead intake for ACA/Medicare",
    domain: "benefitscrm",
    active: true,
  },

  // Broadcast & Content Flows
  "broadcast-dispatch": {
    id: "MLxYErTzGkXEyr5y",
    name: "XOM3 Broadcast Content Dispatch",
    webhookPath: "xom3/broadcast/dispatch",
    description: "Social media content dispatch and scheduling",
    domain: "broadcast",
    active: true,
  },
  "spacebaddie-social-dispatch": {
    id: "spacebaddie_social_dispatch",
    name: "SpaceBaddie Social Message Dispatch",
    webhookPath: "spacebaddie/social-dispatch",
    description: "Dispatch SpaceBaddie auto-replies and social messages",
    domain: "broadcast",
    active: true,
  },

  // System Health & Monitoring
  "hse-alert": {
    id: "U0MqinLSkxhkOSXZ",
    name: "XOM3 HSE Health Alert",
    webhookPath: "xom3/hse/alert",
    description: "Health Signal Engine alerts and notifications",
    domain: "system",
    active: true,
  },
  "daily-digest": {
    id: "CMyU5O5QVLOnHbO4",
    name: "XOM3 Daily Digest Report",
    webhookPath: null, // Cron-triggered, no webhook
    description: "Daily 8AM operator summary email",
    domain: "system",
    active: true,
  },

  // Automation Flows
  "ritual-trigger": {
    id: "tPYhewsmcTj0H7ks",
    name: "XOM3 Ritual Automation Trigger",
    webhookPath: "xom3/ritual/trigger",
    description: "Cockpit ritual and automation triggers",
    domain: "system",
    active: true,
  },
};

/**
 * Get n8n webhook URL for a workflow
 */
export function getWebhookUrl(workflowKey: string): string | null {
  const workflow = WORKFLOW_REGISTRY[workflowKey];
  if (!workflow || !workflow.webhookPath) return null;
  
  const baseUrl = process.env.N8N_WEBHOOK_BASE_URL || "http://31.220.108.45:5678";
  return `${baseUrl}/webhook/${workflow.webhookPath}`;
}

/**
 * Get all active XOM3 workflows
 */
export function getActiveWorkflows(): WorkflowDefinition[] {
  return Object.values(WORKFLOW_REGISTRY).filter(w => w.active);
}

/**
 * Get workflows by domain
 */
export function getWorkflowsByDomain(domain: WorkflowDefinition["domain"]): WorkflowDefinition[] {
  return Object.values(WORKFLOW_REGISTRY).filter(w => w.domain === domain);
}

/**
 * Check if a workflow is registered
 */
export function isWorkflowRegistered(workflowKey: string): boolean {
  return workflowKey in WORKFLOW_REGISTRY;
}

/**
 * Get workflow definition by key
 */
export function getWorkflowDefinition(workflowKey: string): WorkflowDefinition | null {
  return WORKFLOW_REGISTRY[workflowKey] || null;
}

