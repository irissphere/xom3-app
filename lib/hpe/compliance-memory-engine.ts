// HPE Phase II - Strike 2: Compliance Logging Engine (Memory Layer)
// The cockpit's perfect, immutable memory of every operational action

import Airtable from "airtable";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";
import { emitStateUpdate } from "@/lib/hse/signals";
import { getGlobalState } from "@/lib/hse/state";
import { queryState } from "@/lib/hse/query";

/**
 * Compliance Event Categories
 */
export type ComplianceCategory = 
  | "pipeline"
  | "task"
  | "document"
  | "billing"
  | "interaction"
  | "system"
  | "automation"
  | "error";

/**
 * Pipeline Event Types
 */
export type PipelineEventType =
  | "stage_transition"
  | "stage_entry"
  | "stage_exit"
  | "automation_triggered"
  | "sync_event"
  | "pipeline_error";

/**
 * Task Event Types
 */
export type TaskEventType =
  | "task_created"
  | "task_completed"
  | "task_overdue"
  | "task_reassigned"
  | "task_cancelled"
  | "task_updated";

/**
 * Document Event Types
 */
export type DocumentEventType =
  | "document_uploaded"
  | "document_missing"
  | "document_expired"
  | "document_verified"
  | "document_rejected";

/**
 * Billing Event Types
 */
export type BillingEventType =
  | "premium_updated"
  | "commission_posted"
  | "renewal_triggered"
  | "payment_received"
  | "invoice_created"
  | "billing_error";

/**
 * Interaction Event Types
 */
export type InteractionEventType =
  | "call_logged"
  | "email_logged"
  | "text_logged"
  | "meeting_logged"
  | "note_added";

/**
 * System Event Types
 */
export type SystemEventType =
  | "automation_failure"
  | "sync_error"
  | "override"
  | "manual_correction"
  | "system_error"
  | "configuration_change";

/**
 * All Event Types
 */
export type ComplianceEventType =
  | PipelineEventType
  | TaskEventType
  | DocumentEventType
  | BillingEventType
  | InteractionEventType
  | SystemEventType;

/**
 * Event Source
 */
export type EventSource = "UI" | "automation" | "Airtable" | "API" | "system" | "webhook";

/**
 * Compliance Event - The core memory structure
 */
export interface ComplianceEvent {
  // Core identifiers
  id?: string; // Airtable record ID (generated on save)
  timestamp: string; // ISO timestamp
  clientId?: string; // Client record ID
  agentId?: string; // Agent/user ID
  stage?: string; // Current pipeline stage
  
  // Event classification
  category: ComplianceCategory;
  eventType: ComplianceEventType;
  source: EventSource;
  
  // Event details
  description: string;
  metadata?: Record<string, any>;
  
  // System context (captured at event time)
  hseHyperstate?: {
    timestamp: string;
    subsystems: Record<string, any>;
    vectors?: Record<string, any>;
  };
  uoiSignalEmitted?: {
    signalId: string;
    signalType: string;
    timestamp: string;
  };
  
  // Audit trail
  auditLogged?: boolean;
  airtableSynced?: boolean;
}

/**
 * Compliance Event Log Result
 */
export interface ComplianceLogResult {
  success: boolean;
  eventId?: string;
  error?: string;
  airtableRecordId?: string;
}

/**
 * Compliance Query Filters
 */
export interface ComplianceQueryFilters {
  clientId?: string;
  agentId?: string;
  stage?: string;
  category?: ComplianceCategory;
  eventType?: ComplianceEventType;
  source?: EventSource;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Airtable base instance
 */
function getAirtableBase() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  return new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
}

/**
 * Capture current HSE hyperstate
 */
function captureHSEHyperstate(): ComplianceEvent["hseHyperstate"] {
  try {
    const state = getGlobalState();
    if (!state) {
      return undefined;
    }
    
    return {
      timestamp: new Date().toISOString(),
      subsystems: {
        amp: state.subsystems.amp,
        workflow: state.subsystems.workflow,
        compliance: state.subsystems.compliance,
        notification: state.subsystems.notification,
        analytics: state.subsystems.analytics,
        uoi: state.subsystems.uoi
      },
      vectors: {
        risk: state.vectors.risk,
        drift: state.vectors.drift,
        throughput: state.vectors.throughput,
        pressure: state.vectors.pressure
      }
    };
  } catch (error) {
    console.error("[Compliance Memory] Failed to capture HSE hyperstate:", error);
    return undefined;
  }
}

/**
 * Emit UOI signal for compliance event
 */
function emitUOISignalForEvent(event: ComplianceEvent): ComplianceEvent["uoiSignalEmitted"] {
  try {
    const signalType = getUOISignalType(event.category, event.eventType);
    const signal = emitSignal({
      source: "hpe-compliance-memory",
      type: signalType,
      payload: {
        eventId: event.id,
        category: event.category,
        eventType: event.eventType,
        clientId: event.clientId,
        agentId: event.agentId,
        stage: event.stage,
        description: event.description,
        metadata: event.metadata,
        timestamp: event.timestamp
      },
      priority: getEventPriority(event.category, event.eventType)
    });
    
    return {
      signalId: signal.id,
      signalType: signal.type,
      timestamp: signal.timestamp
    };
  } catch (error) {
    console.error("[Compliance Memory] Failed to emit UOI signal:", error);
    return undefined;
  }
}

/**
 * Get UOI signal type for event
 */
function getUOISignalType(category: ComplianceCategory, eventType: ComplianceEventType): string {
  const mapping: Record<string, string> = {
    // Pipeline events
    "stage_transition": "stage_transition",
    "stage_entry": "stage_entry",
    "stage_exit": "stage_exit",
    "automation_triggered": "automation_triggered",
    "sync_event": "sync_event",
    "pipeline_error": "pipeline_error",
    
    // Task events
    "task_created": "task_event",
    "task_completed": "task_event",
    "task_overdue": "task_overdue",
    "task_reassigned": "task_event",
    
    // Document events
    "document_uploaded": "document_event",
    "document_missing": "document_missing",
    "document_expired": "document_expired",
    
    // Billing events
    "premium_updated": "billing_event",
    "commission_posted": "billing_event",
    "renewal_triggered": "billing_event",
    "payment_received": "billing_event",
    
    // Interaction events
    "call_logged": "interaction_event",
    "email_logged": "interaction_event",
    "text_logged": "interaction_event",
    "meeting_logged": "interaction_event",
    
    // System events
    "automation_failure": "system_event",
    "sync_error": "system_event",
    "override": "system_event",
    "manual_correction": "system_event",
    "system_error": "system_event"
  };
  
  return mapping[eventType] || "compliance_event";
}

/**
 * Get event priority for UOI signal
 */
function getEventPriority(category: ComplianceCategory, eventType: ComplianceEventType): "low" | "medium" | "high" | "critical" {
  // Error events are always high/critical
  if (category === "error" || eventType.includes("error") || eventType.includes("failure")) {
    return "critical";
  }
  
  // System events are medium-high
  if (category === "system") {
    return "high";
  }
  
  // Billing events are high
  if (category === "billing") {
    return "high";
  }
  
  // Everything else is medium
  return "medium";
}

/**
 * Log compliance event to memory (the core function)
 */
export async function logComplianceEvent(
  event: Omit<ComplianceEvent, "id" | "hseHyperstate" | "uoiSignalEmitted" | "auditLogged" | "airtableSynced" | "timestamp"> & {
    timestamp?: string;
  }
): Promise<ComplianceLogResult> {
  const startTime = Date.now();
  
  try {
    // Ensure timestamp
    const timestamp = event.timestamp || new Date().toISOString();
    
    // Capture HSE hyperstate at event time
    const hseHyperstate = captureHSEHyperstate();
    
    // Emit UOI signal
    const uoiSignalEmitted = emitUOISignalForEvent({
      ...event,
      timestamp
    });
    
    // Build complete event
    const completeEvent: ComplianceEvent = {
      ...event,
      timestamp,
      hseHyperstate,
      uoiSignalEmitted,
      auditLogged: false,
      airtableSynced: false
    };
    
    // Save to Airtable
    const base = getAirtableBase();
    const record = await base("Compliance Logs").create([{
      fields: {
        "Client": completeEvent.clientId ? [completeEvent.clientId] : undefined,
        "Agent": completeEvent.agentId || undefined,
        "Stage": completeEvent.stage || undefined,
        "Category": completeEvent.category,
        "Event Type": completeEvent.eventType,
        "Source": completeEvent.source,
        "Description": completeEvent.description,
        "Metadata": JSON.stringify(completeEvent.metadata || {}),
        "HSE Hyperstate": JSON.stringify(completeEvent.hseHyperstate || {}),
        "UOI Signal": JSON.stringify(completeEvent.uoiSignalEmitted || {}),
        "Date": timestamp,
        "Created Date": new Date().toISOString()
      }
    }]);
    
    const airtableRecordId = record[0].id;
    completeEvent.id = airtableRecordId;
    completeEvent.airtableSynced = true;
    
    // Log to audit trail
    try {
      await base("Audit Logs").create([{
        fields: {
          "Action": `Compliance Event: ${completeEvent.category}.${completeEvent.eventType}`,
          "User": completeEvent.agentId || "system",
          "Client": completeEvent.clientId ? [completeEvent.clientId] : undefined,
          "Details": JSON.stringify({
            eventId: airtableRecordId,
            category: completeEvent.category,
            eventType: completeEvent.eventType,
            source: completeEvent.source,
            description: completeEvent.description,
            stage: completeEvent.stage,
            metadata: completeEvent.metadata
          }),
          "Timestamp": timestamp
        }
      }]);
      completeEvent.auditLogged = true;
    } catch (auditError) {
      console.error("[Compliance Memory] Audit logging failed:", auditError);
    }
    
    // Update HSE state
    pushHistory({
      timestamp: Date.now(),
      subsystem: "compliance",
      type: `${completeEvent.category}_${completeEvent.eventType}`,
      value: 1
    });
    
    emitStateUpdate([
      "hpe_compliance_logged",
      `category_${completeEvent.category}`,
      `type_${completeEvent.eventType}`,
      completeEvent.clientId ? `client_${completeEvent.clientId}` : undefined
    ].filter(Boolean) as string[]);
    
    console.log(`[Compliance Memory] ✅ Event logged: ${completeEvent.category}.${completeEvent.eventType} (${Date.now() - startTime}ms)`);
    
    return {
      success: true,
      eventId: airtableRecordId,
      airtableRecordId
    };
  } catch (error: any) {
    console.error("[Compliance Memory] ❌ Failed to log event:", error);
    
    // Emit error signal
    try {
      emitSignal({
        source: "hpe-compliance-memory",
        type: "compliance_logging_error",
        payload: {
          error: error.message,
          event: event
        },
        priority: "high"
      });
    } catch (signalError) {
      console.error("[Compliance Memory] Failed to emit error signal:", signalError);
    }
    
    return {
      success: false,
      error: error.message || "Failed to log compliance event"
    };
  }
}

/**
 * Query compliance events (for Compliance Ledger UI)
 */
export async function queryComplianceEvents(
  filters: ComplianceQueryFilters = {}
): Promise<ComplianceEvent[]> {
  try {
    const base = getAirtableBase();
    const conditions: string[] = [];
    
    // Build filter formula
    if (filters.clientId) {
      conditions.push(`{Client} = "${filters.clientId}"`);
    }
    if (filters.agentId) {
      conditions.push(`{Agent} = "${filters.agentId}"`);
    }
    if (filters.stage) {
      conditions.push(`{Stage} = "${filters.stage}"`);
    }
    if (filters.category) {
      conditions.push(`{Category} = "${filters.category}"`);
    }
    if (filters.eventType) {
      conditions.push(`{Event Type} = "${filters.eventType}"`);
    }
    if (filters.source) {
      conditions.push(`{Source} = "${filters.source}"`);
    }
    if (filters.startDate) {
      conditions.push(`IS_AFTER({Date}, "${filters.startDate}")`);
    }
    if (filters.endDate) {
      conditions.push(`IS_BEFORE({Date}, "${filters.endDate}")`);
    }
    
    const formula = conditions.length > 0 ? `AND(${conditions.join(", ")})` : "";
    
    const records = await base("Compliance Logs")
      .select({
        filterByFormula: formula || undefined,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: filters.limit || 100,
        pageSize: 50
      })
      .all();
    
    return records.map(record => {
      const fields = record.fields as any;
      return {
        id: record.id,
        timestamp: fields.Date || fields["Created Date"],
        clientId: Array.isArray(fields.Client) ? fields.Client[0] : fields.Client,
        agentId: fields.Agent,
        stage: fields.Stage,
        category: fields.Category as ComplianceCategory,
        eventType: fields["Event Type"] as ComplianceEventType,
        source: fields.Source as EventSource,
        description: fields.Description,
        metadata: fields.Metadata ? JSON.parse(fields.Metadata) : {},
        hseHyperstate: fields["HSE Hyperstate"] ? JSON.parse(fields["HSE Hyperstate"]) : undefined,
        uoiSignalEmitted: fields["UOI Signal"] ? JSON.parse(fields["UOI Signal"]) : undefined,
        auditLogged: true, // If it's in Airtable, it was logged
        airtableSynced: true
      };
    });
  } catch (error: any) {
    console.error("[Compliance Memory] Failed to query events:", error);
    return [];
  }
}

/**
 * Get compliance event statistics
 */
export async function getComplianceStatistics(
  filters: Omit<ComplianceQueryFilters, "limit" | "offset"> = {}
): Promise<{
  total: number;
  byCategory: Record<ComplianceCategory, number>;
  byEventType: Record<string, number>;
  bySource: Record<EventSource, number>;
  recentErrors: number;
}> {
  try {
    const events = await queryComplianceEvents({ ...filters, limit: 1000 });
    
    const stats = {
      total: events.length,
      byCategory: {} as Record<ComplianceCategory, number>,
      byEventType: {} as Record<string, number>,
      bySource: {} as Record<EventSource, number>,
      recentErrors: 0
    };
    
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    events.forEach(event => {
      // Count by category
      stats.byCategory[event.category] = (stats.byCategory[event.category] || 0) + 1;
      
      // Count by event type
      stats.byEventType[event.eventType] = (stats.byEventType[event.eventType] || 0) + 1;
      
      // Count by source
      stats.bySource[event.source] = (stats.bySource[event.source] || 0) + 1;
      
      // Count recent errors
      if (event.category === "error" || event.eventType.includes("error") || event.eventType.includes("failure")) {
        const eventTime = new Date(event.timestamp).getTime();
        if (eventTime > oneDayAgo) {
          stats.recentErrors++;
        }
      }
    });
    
    return stats;
  } catch (error: any) {
    console.error("[Compliance Memory] Failed to get statistics:", error);
    return {
      total: 0,
      byCategory: {} as Record<ComplianceCategory, number>,
      byEventType: {},
      bySource: {} as Record<EventSource, number>,
      recentErrors: 0
    };
  }
}
