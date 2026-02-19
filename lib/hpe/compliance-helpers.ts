// HPE Phase II - Strike 2: Compliance Event Helpers
// Convenience functions for logging different types of compliance events

import { 
  logComplianceEvent, 
  ComplianceEvent,
  ComplianceCategory,
  EventSource
} from "./compliance-memory-engine";

/**
 * Log pipeline event
 */
export async function logPipelineEvent(
  eventType: "stage_transition" | "stage_entry" | "stage_exit" | "automation_triggered" | "sync_event" | "pipeline_error",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "pipeline",
    eventType,
    source: params.source || "automation",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: params.metadata
  });
}

/**
 * Log task event
 */
export async function logTaskEvent(
  eventType: "task_created" | "task_completed" | "task_overdue" | "task_reassigned" | "task_cancelled" | "task_updated",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    taskId?: string;
    taskName?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "task",
    eventType,
    source: params.source || "automation",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: {
      taskId: params.taskId,
      taskName: params.taskName,
      ...params.metadata
    }
  });
}

/**
 * Log document event
 */
export async function logDocumentEvent(
  eventType: "document_uploaded" | "document_missing" | "document_expired" | "document_verified" | "document_rejected",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    documentId?: string;
    documentName?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "document",
    eventType,
    source: params.source || "UI",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: {
      documentId: params.documentId,
      documentName: params.documentName,
      ...params.metadata
    }
  });
}

/**
 * Log billing event
 */
export async function logBillingEvent(
  eventType: "premium_updated" | "commission_posted" | "renewal_triggered" | "payment_received" | "invoice_created" | "billing_error",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    amount?: number;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "billing",
    eventType,
    source: params.source || "automation",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: {
      amount: params.amount,
      ...params.metadata
    }
  });
}

/**
 * Log interaction event
 */
export async function logInteractionEvent(
  eventType: "call_logged" | "email_logged" | "text_logged" | "meeting_logged" | "note_added",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "interaction",
    eventType,
    source: params.source || "UI",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: params.metadata
  });
}

/**
 * Log system event
 */
export async function logSystemEvent(
  eventType: "automation_failure" | "sync_error" | "override" | "manual_correction" | "system_error" | "configuration_change",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "system",
    eventType,
    source: params.source || "system",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: params.metadata
  });
}

/**
 * Log automation event
 */
export async function logAutomationEvent(
  eventType: "automation_triggered" | "automation_completed" | "automation_failed",
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    automationId?: string;
    automationName?: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "automation",
    eventType: eventType as any,
    source: params.source || "automation",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: {
      automationId: params.automationId,
      automationName: params.automationName,
      ...params.metadata
    }
  });
}

/**
 * Log error event
 */
export async function logErrorEvent(
  params: {
    clientId?: string;
    agentId?: string;
    stage?: string;
    errorType: string;
    errorMessage: string;
    description: string;
    metadata?: Record<string, any>;
    source?: EventSource;
  }
) {
  return logComplianceEvent({
    category: "error",
    eventType: "system_error",
    source: params.source || "system",
    clientId: params.clientId,
    agentId: params.agentId,
    stage: params.stage,
    description: params.description,
    metadata: {
      errorType: params.errorType,
      errorMessage: params.errorMessage,
      ...params.metadata
    }
  });
}
