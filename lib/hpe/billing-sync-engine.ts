// HPE Phase II - Strike 3: Billing Sync Engine (Revenue Layer)
// The cockpit's financial intelligence system

import Airtable from "airtable";
import { logBillingEvent } from "./compliance-helpers";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";
import { emitStateUpdate } from "@/lib/hse/signals";

/**
 * Billing Status
 */
export type BillingStatus = 
  | "Draft"
  | "Sent"
  | "Paid"
  | "Overdue"
  | "Cancelled"
  | "Lapsed"
  | "Pending";

/**
 * Billing Type
 */
export type BillingType = 
  | "Premium"
  | "Commission"
  | "Renewal"
  | "One-time"
  | "Refund"
  | "Adjustment";

/**
 * Payment Frequency
 */
export type PaymentFrequency = 
  | "Monthly"
  | "Quarterly"
  | "Semi-Annual"
  | "Annual"
  | "One-time";

/**
 * Policy Status
 */
export type PolicyStatus = 
  | "Active"
  | "Pending"
  | "Lapsed"
  | "Cancelled"
  | "Expired"
  | "Under Review";

/**
 * Normalized Billing Record
 * Unified format regardless of carrier source
 */
export interface NormalizedBillingRecord {
  // Core identifiers
  id?: string; // Airtable record ID
  clientId: string;
  policyNumber?: string;
  carrier?: string;
  
  // Financial data
  premiumAmount?: number;
  commissionAmount?: number;
  totalAmount: number;
  currency?: string;
  
  // Dates
  effectiveDate?: string;
  renewalDate?: string;
  dueDate: string;
  paidDate?: string;
  
  // Status
  billingStatus: BillingStatus;
  policyStatus?: PolicyStatus;
  paymentFrequency?: PaymentFrequency;
  
  // Billing type
  billingType: BillingType;
  
  // Agent/Commission
  agentId?: string;
  commissionRate?: number;
  
  // External references
  invoiceId?: string;
  stripeLink?: string;
  stripeCustomerId?: string;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  
  // Pipeline linkage
  stage?: string;
}

/**
 * Billing Event Type
 */
export type BillingEventType =
  | "new_policy"
  | "new_premium"
  | "new_commission"
  | "premium_increase"
  | "premium_decrease"
  | "commission_change"
  | "renewal_triggered"
  | "payment_received"
  | "payment_missed"
  | "policy_lapsed"
  | "carrier_error"
  | "renewal_overdue"
  | "billing_anomaly";

/**
 * Billing Anomaly Type
 */
export type BillingAnomalyType =
  | "unexpected_premium_change"
  | "missing_payment"
  | "duplicate_billing"
  | "carrier_mismatch"
  | "policy_status_mismatch"
  | "commission_calculation_error";

/**
 * Billing Event
 */
export interface BillingEvent {
  eventType: BillingEventType;
  billingRecord: NormalizedBillingRecord;
  previousRecord?: NormalizedBillingRecord; // For change detection
  anomalyType?: BillingAnomalyType;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Billing Sync Result
 */
export interface BillingSyncResult {
  success: boolean;
  recordsProcessed: number;
  eventsDetected: number;
  anomaliesDetected: number;
  errors: string[];
  events: BillingEvent[];
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
 * Normalize billing record from Airtable
 * Handles different carrier formats and normalizes to unified structure
 */
export function normalizeBillingRecord(airtableRecord: any): NormalizedBillingRecord {
  const fields = airtableRecord.fields || {};
  
  // Extract client ID (can be array or string)
  const clientId = Array.isArray(fields.Client) 
    ? fields.Client[0] 
    : fields.Client || "";
  
  // Normalize amounts
  const premiumAmount = parseFloat(fields["Premium Amount"] || fields.Premium || fields.Amount || "0");
  const commissionAmount = parseFloat(fields["Commission Amount"] || fields.Commission || "0");
  const totalAmount = parseFloat(fields.Amount || fields["Total Amount"] || "0") || premiumAmount;
  
  // Normalize dates (handle various formats)
  const normalizeDate = (date: any): string | undefined => {
    if (!date) return undefined;
    if (typeof date === "string") {
      // Try to parse ISO date
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    return undefined;
  };
  
  // Normalize status
  const normalizeStatus = (status: any): BillingStatus => {
    if (!status) return "Draft";
    const s = String(status).toLowerCase();
    if (s.includes("paid")) return "Paid";
    if (s.includes("overdue")) return "Overdue";
    if (s.includes("sent")) return "Sent";
    if (s.includes("cancelled") || s.includes("canceled")) return "Cancelled";
    if (s.includes("lapsed")) return "Lapsed";
    if (s.includes("pending")) return "Pending";
    return "Draft";
  };
  
  // Normalize billing type
  const normalizeBillingType = (type: any, invoiceId: string, notes: string): BillingType => {
    if (type) {
      const t = String(type).toLowerCase();
      if (t.includes("commission")) return "Commission";
      if (t.includes("renewal")) return "Renewal";
      if (t.includes("refund")) return "Refund";
      if (t.includes("adjustment")) return "Adjustment";
      if (t.includes("one-time") || t.includes("onetime")) return "One-time";
    }
    
    const searchText = `${invoiceId} ${notes}`.toLowerCase();
    if (searchText.includes("renew") || searchText.includes("renewal")) return "Renewal";
    if (searchText.includes("comm") || searchText.includes("commission")) return "Commission";
    if (searchText.includes("refund")) return "Refund";
    if (searchText.includes("adjust")) return "Adjustment";
    if (searchText.includes("one-time") || searchText.includes("onetime")) return "One-time";
    
    return "Premium";
  };
  
  // Normalize policy status
  const normalizePolicyStatus = (status: any): PolicyStatus | undefined => {
    if (!status) return undefined;
    const s = String(status).toLowerCase();
    if (s.includes("active")) return "Active";
    if (s.includes("pending")) return "Pending";
    if (s.includes("lapsed")) return "Lapsed";
    if (s.includes("cancelled") || s.includes("canceled")) return "Cancelled";
    if (s.includes("expired")) return "Expired";
    if (s.includes("review")) return "Under Review";
    return undefined;
  };
  
  // Normalize payment frequency
  const normalizeFrequency = (freq: any): PaymentFrequency | undefined => {
    if (!freq) return undefined;
    const f = String(freq).toLowerCase();
    if (f.includes("month")) return "Monthly";
    if (f.includes("quarter")) return "Quarterly";
    if (f.includes("semi") || f.includes("semi-annual")) return "Semi-Annual";
    if (f.includes("annual") || f.includes("year")) return "Annual";
    if (f.includes("one-time") || f.includes("onetime")) return "One-time";
    return undefined;
  };
  
  const invoiceId = fields["Invoice ID"] || fields.InvoiceID || fields.InvoiceId || "";
  const notes = fields.Notes || fields.Note || "";
  
  return {
    id: airtableRecord.id,
    clientId,
    policyNumber: fields["Policy Number"] || fields.PolicyNumber || fields.Policy,
    carrier: fields.Carrier || fields["Insurance Carrier"] || fields["Carrier Name"],
    premiumAmount: premiumAmount > 0 ? premiumAmount : undefined,
    commissionAmount: commissionAmount > 0 ? commissionAmount : undefined,
    totalAmount,
    currency: fields.Currency || "USD",
    effectiveDate: normalizeDate(fields["Effective Date"] || fields.EffectiveDate),
    renewalDate: normalizeDate(fields["Renewal Date"] || fields.RenewalDate),
    dueDate: normalizeDate(fields["Due Date"] || fields.DueDate) || new Date().toISOString(),
    paidDate: normalizeDate(fields["Paid Date"] || fields.PaidDate),
    billingStatus: normalizeStatus(fields.Status || fields["Billing Status"]),
    policyStatus: normalizePolicyStatus(fields["Policy Status"] || fields.PolicyStatus),
    paymentFrequency: normalizeFrequency(fields["Payment Frequency"] || fields.Frequency || fields["Billing Frequency"]),
    billingType: normalizeBillingType(fields.Type || fields["Billing Type"], invoiceId, notes),
    agentId: fields["Agent"] || fields["Agent ID"] || (Array.isArray(fields.Agent) ? fields.Agent[0] : undefined),
    commissionRate: fields["Commission Rate"] ? parseFloat(fields["Commission Rate"]) : undefined,
    invoiceId,
    stripeLink: fields["Stripe Link"] || fields.StripeLink,
    stripeCustomerId: fields["Stripe Customer ID"] || fields.StripeCustomerId,
    notes,
    metadata: fields.Metadata ? (typeof fields.Metadata === "string" ? JSON.parse(fields.Metadata) : fields.Metadata) : {},
    createdAt: normalizeDate(fields["Created Date"] || fields.CreatedAt),
    updatedAt: normalizeDate(fields["Updated Date"] || fields.UpdatedAt),
    stage: fields.Stage || fields["Pipeline Stage"]
  };
}

/**
 * Link billing record to pipeline
 * Fetches client stage and agent from Clients table
 */
export async function linkBillingToPipeline(record: NormalizedBillingRecord): Promise<NormalizedBillingRecord> {
  try {
    const base = getAirtableBase();
    const client = await base("Clients").find(record.clientId);
    const clientFields = client.fields as any;
    
    // Link stage
    if (!record.stage && clientFields.Status) {
      record.stage = clientFields.Status;
    }
    
    // Link agent
    if (!record.agentId && clientFields["Agent"] || clientFields["Assigned To"]) {
      const agent = clientFields["Agent"] || clientFields["Assigned To"];
      record.agentId = Array.isArray(agent) ? agent[0] : agent;
    }
    
    return record;
  } catch (error) {
    console.error("[Billing Sync] Failed to link to pipeline:", error);
    return record;
  }
}

/**
 * Detect billing events (new events, changes, risks)
 */
export function detectBillingEvents(
  currentRecord: NormalizedBillingRecord,
  previousRecord?: NormalizedBillingRecord
): BillingEvent[] {
  const events: BillingEvent[] = [];
  const timestamp = new Date().toISOString();
  
  // New record detection
  if (!previousRecord) {
    if (currentRecord.billingType === "Premium" && currentRecord.premiumAmount) {
      events.push({
        eventType: "new_premium",
        billingRecord: currentRecord,
        description: `New premium recorded: $${currentRecord.premiumAmount}`,
        timestamp
      });
    }
    
    if (currentRecord.billingType === "Commission" && currentRecord.commissionAmount) {
      events.push({
        eventType: "new_commission",
        billingRecord: currentRecord,
        description: `New commission recorded: $${currentRecord.commissionAmount}`,
        timestamp
      });
    }
    
    if (currentRecord.policyNumber && currentRecord.policyStatus === "Active") {
      events.push({
        eventType: "new_policy",
        billingRecord: currentRecord,
        description: `New policy activated: ${currentRecord.policyNumber}`,
        timestamp
      });
    }
  } else {
    // Change detection
    if (previousRecord.premiumAmount && currentRecord.premiumAmount) {
      const change = currentRecord.premiumAmount - previousRecord.premiumAmount;
      if (Math.abs(change) > 0.01) { // More than 1 cent change
        events.push({
          eventType: change > 0 ? "premium_increase" : "premium_decrease",
          billingRecord: currentRecord,
          previousRecord,
          description: `Premium ${change > 0 ? "increased" : "decreased"} by $${Math.abs(change).toFixed(2)}`,
          timestamp,
          metadata: {
            previousAmount: previousRecord.premiumAmount,
            newAmount: currentRecord.premiumAmount,
            change
          }
        });
      }
    }
    
    if (previousRecord.commissionAmount && currentRecord.commissionAmount) {
      const change = currentRecord.commissionAmount - previousRecord.commissionAmount;
      if (Math.abs(change) > 0.01) {
        events.push({
          eventType: "commission_change",
          billingRecord: currentRecord,
          previousRecord,
          description: `Commission changed by $${Math.abs(change).toFixed(2)}`,
          timestamp,
          metadata: {
            previousAmount: previousRecord.commissionAmount,
            newAmount: currentRecord.commissionAmount,
            change
          }
        });
      }
    }
    
    // Renewal detection
    if (currentRecord.billingType === "Renewal" && previousRecord.billingType !== "Renewal") {
      events.push({
        eventType: "renewal_triggered",
        billingRecord: currentRecord,
        previousRecord,
        description: `Renewal triggered for policy ${currentRecord.policyNumber || "N/A"}`,
        timestamp
      });
    }
  }
  
  // Risk detection
  const now = new Date();
  const dueDate = new Date(currentRecord.dueDate);
  
  // Payment missed
  if (currentRecord.billingStatus === "Overdue" || 
      (dueDate < now && currentRecord.billingStatus !== "Paid" && currentRecord.billingStatus !== "Cancelled")) {
    events.push({
      eventType: "payment_missed",
      billingRecord: currentRecord,
      description: `Payment missed for invoice ${currentRecord.invoiceId || "N/A"}`,
      timestamp,
      anomalyType: "missing_payment"
    });
  }
  
  // Policy lapsed
  if (currentRecord.policyStatus === "Lapsed") {
    events.push({
      eventType: "policy_lapsed",
      billingRecord: currentRecord,
      description: `Policy ${currentRecord.policyNumber || "N/A"} has lapsed`,
      timestamp
    });
  }
  
  // Renewal overdue
  if (currentRecord.renewalDate) {
    const renewalDate = new Date(currentRecord.renewalDate);
    if (renewalDate < now && currentRecord.policyStatus !== "Active" && currentRecord.policyStatus !== "Cancelled") {
      events.push({
        eventType: "renewal_overdue",
        billingRecord: currentRecord,
        description: `Renewal overdue for policy ${currentRecord.policyNumber || "N/A"}`,
        timestamp
      });
    }
  }
  
  // Payment received
  if (currentRecord.billingStatus === "Paid" && currentRecord.paidDate) {
    events.push({
      eventType: "payment_received",
      billingRecord: currentRecord,
      description: `Payment received: $${currentRecord.totalAmount}`,
      timestamp
    });
  }
  
  // Anomaly detection
  const anomalies = detectBillingAnomalies(currentRecord, previousRecord);
  anomalies.forEach(anomaly => {
    events.push({
      eventType: "billing_anomaly",
      billingRecord: currentRecord,
      previousRecord,
      anomalyType: anomaly.type,
      description: anomaly.description,
      timestamp,
      metadata: anomaly.metadata
    });
  });
  
  return events;
}

/**
 * Detect billing anomalies
 */
function detectBillingAnomalies(
  current: NormalizedBillingRecord,
  previous?: NormalizedBillingRecord
): Array<{ type: BillingAnomalyType; description: string; metadata?: Record<string, any> }> {
  const anomalies: Array<{ type: BillingAnomalyType; description: string; metadata?: Record<string, any> }> = [];
  
  // Unexpected premium change (>20% change)
  if (previous && previous.premiumAmount && current.premiumAmount) {
    const changePercent = Math.abs((current.premiumAmount - previous.premiumAmount) / previous.premiumAmount);
    if (changePercent > 0.2) {
      anomalies.push({
        type: "unexpected_premium_change",
        description: `Unexpected premium change: ${(changePercent * 100).toFixed(1)}%`,
        metadata: {
          previousAmount: previous.premiumAmount,
          newAmount: current.premiumAmount,
          changePercent
        }
      });
    }
  }
  
  // Commission calculation error (if commission rate exists but commission doesn't match)
  if (current.commissionRate && current.premiumAmount && current.commissionAmount) {
    const expectedCommission = current.premiumAmount * (current.commissionRate / 100);
    const difference = Math.abs(current.commissionAmount - expectedCommission);
    if (difference > 0.01) { // More than 1 cent difference
      anomalies.push({
        type: "commission_calculation_error",
        description: `Commission calculation mismatch: expected $${expectedCommission.toFixed(2)}, got $${current.commissionAmount.toFixed(2)}`,
        metadata: {
          expectedCommission,
          actualCommission: current.commissionAmount,
          difference
        }
      });
    }
  }
  
  // Policy status mismatch (policy lapsed but billing still active)
  if (current.policyStatus === "Lapsed" && current.billingStatus === "Paid") {
    anomalies.push({
      type: "policy_status_mismatch",
      description: "Policy is lapsed but billing shows as paid",
      metadata: {
        policyStatus: current.policyStatus,
        billingStatus: current.billingStatus
      }
    });
  }
  
  return anomalies;
}

/**
 * Sync billing data from Airtable
 * Main entry point for billing sync
 */
export async function syncBillingData(
  clientId?: string,
  options: {
    detectEvents?: boolean;
    linkToPipeline?: boolean;
    logCompliance?: boolean;
  } = {}
): Promise<BillingSyncResult> {
  const {
    detectEvents = true,
    linkToPipeline = true,
    logCompliance = true
  } = options;
  
  const result: BillingSyncResult = {
    success: true,
    recordsProcessed: 0,
    eventsDetected: 0,
    anomaliesDetected: 0,
    errors: [],
    events: []
  };
  
  try {
    const base = getAirtableBase();
    
    const records = await base("Billing")
      .select({
        view: "Grid view",
        sort: [{ field: "Due Date", direction: "desc" }],
        ...(clientId ? { filterByFormula: `{Client} = '${clientId}'` } : {}),
      })
      .all();
    const previousRecords = new Map<string, NormalizedBillingRecord>();
    
    // Process each record
    for (const record of records) {
      try {
        // Normalize record
        let normalized = normalizeBillingRecord(record);
        
        // Link to pipeline
        if (linkToPipeline) {
          normalized = await linkBillingToPipeline(normalized);
        }
        
        // Detect events
        if (detectEvents) {
          const previous = previousRecords.get(normalized.clientId);
          const events = detectBillingEvents(normalized, previous);
          
          // Process each event
          for (const event of events) {
            result.events.push(event);
            result.eventsDetected++;
            
            if (event.anomalyType) {
              result.anomaliesDetected++;
            }
            
            // Log to compliance
            if (logCompliance) {
              await logBillingEvent(getComplianceBillingEventType(event.eventType), {
                clientId: normalized.clientId,
                agentId: normalized.agentId,
                stage: normalized.stage,
                amount: normalized.totalAmount,
                description: event.description,
                metadata: {
                  billingType: normalized.billingType,
                  policyNumber: normalized.policyNumber,
                  carrier: normalized.carrier,
                  anomalyType: event.anomalyType,
                  ...event.metadata
                },
                source: "automation"
              });
            }
            
            // Emit UOI signal
            emitSignal({
              source: "hpe-billing-sync",
              type: getUOISignalType(event.eventType),
              payload: {
                eventType: event.eventType,
                clientId: normalized.clientId,
                amount: normalized.totalAmount,
                billingType: normalized.billingType,
                anomalyType: event.anomalyType,
                ...event.metadata
              },
              priority: event.anomalyType ? "high" : "medium"
            });
          }
        }
        
        // Store for change detection
        previousRecords.set(normalized.clientId, normalized);
        result.recordsProcessed++;
      } catch (error: any) {
        result.errors.push(`Failed to process billing record ${record.id}: ${error.message}`);
      }
    }
    
    // Update HSE state
    pushHistory({
      timestamp: Date.now(),
      subsystem: "hpe",
      type: "billing_sync",
      value: result.recordsProcessed
    });
    
    emitStateUpdate([
      "hpe_billing_synced",
      `records_${result.recordsProcessed}`,
      `events_${result.eventsDetected}`,
      result.anomaliesDetected > 0 ? "billing_anomalies_detected" : undefined
    ].filter(Boolean) as string[]);
    
    result.success = result.errors.length === 0;
    
    console.log(`[Billing Sync] ✅ Processed ${result.recordsProcessed} records, detected ${result.eventsDetected} events, ${result.anomaliesDetected} anomalies`);
    
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Billing sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Get UOI signal type for billing event
 */
function getUOISignalType(eventType: BillingEventType): string {
  const mapping: Record<BillingEventType, string> = {
    "new_policy": "billing_event",
    "new_premium": "billing_event",
    "new_commission": "commission_posted",
    "premium_increase": "billing_event",
    "premium_decrease": "billing_event",
    "commission_change": "commission_posted",
    "renewal_triggered": "renewal_triggered",
    "payment_received": "billing_event",
    "payment_missed": "billing_anomaly",
    "policy_lapsed": "policy_lapsed",
    "carrier_error": "billing_anomaly",
    "renewal_overdue": "renewal_triggered",
    "billing_anomaly": "billing_anomaly"
  };
  
  return mapping[eventType] || "billing_event";
}

function getComplianceBillingEventType(
  eventType: BillingEventType
): "premium_updated" | "commission_posted" | "renewal_triggered" | "payment_received" | "invoice_created" | "billing_error" {
  switch (eventType) {
    case "new_policy":
    case "new_premium":
      return "invoice_created";
    case "premium_increase":
    case "premium_decrease":
      return "premium_updated";
    case "new_commission":
    case "commission_change":
      return "commission_posted";
    case "renewal_triggered":
      return "renewal_triggered";
    case "payment_received":
      return "payment_received";
    case "payment_missed":
    case "policy_lapsed":
    case "carrier_error":
    case "renewal_overdue":
    case "billing_anomaly":
      return "billing_error";
  }
}
