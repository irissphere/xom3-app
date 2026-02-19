// HPE Billing Sync Engine
// Pulls premiums, renewals, commissions, normalizes, logs, syncs, visualizes

import Airtable from "airtable";
import { emitSignal } from "../uoi/signals";
import { emitStateUpdate } from "../hse/signals";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface BillingEvent {
  clientId: string;
  invoiceId: string;
  amount: number;
  status: BillingStatus;
  dueDate: string;
  paidDate?: string;
  stripeLink?: string;
  stripeCustomerId?: string;
  notes?: string;
  type?: BillingType;
}

export type BillingStatus = 
  | "Draft"
  | "Sent"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export type BillingType = 
  | "Premium"
  | "Renewal"
  | "Commission"
  | "One-time"
  | "Refund";

export interface BillingSyncResult {
  success: boolean;
  eventsSynced: number;
  totalAmount: number;
  errors: string[];
}

/**
 * Sync billing events from external sources (Stripe, etc.)
 */
export async function syncBillingEvents(
  clientId?: string,
  tenant?: string
): Promise<BillingSyncResult> {
  const result: BillingSyncResult = {
    success: true,
    eventsSynced: 0,
    totalAmount: 0,
    errors: []
  };

  try {
    // In production, this would pull from Stripe, payment processors, etc.
    // For now, we sync existing Airtable records and normalize them

    const records = await base("Billing")
      .select({
        view: "Grid view",
        ...(clientId ? { filterByFormula: `{Client} = '${clientId}'` } : {}),
      })
      .all();

    for (const record of records) {
      try {
        const fields = record.fields as any;
        
        // Normalize billing event
        const event: BillingEvent = {
          clientId: fields.Client?.[0] || "",
          invoiceId: fields["Invoice ID"] || `INV-${record.id}`,
          amount: fields.Amount || 0,
          status: fields.Status || "Draft",
          dueDate: fields["Due Date"] || new Date().toISOString(),
          paidDate: fields["Paid Date"],
          stripeLink: fields["Stripe Link"],
          stripeCustomerId: fields["Stripe Customer ID"],
          notes: fields.Notes,
          type: detectBillingType(fields)
        };

        // Update if needed (normalize status, add type, etc.)
        const updates: Record<string, any> = {};
        
        if (!fields.Type && event.type) {
          updates.Type = event.type;
        }

        if (Object.keys(updates).length > 0) {
          await base("Billing").update([
            {
              id: record.id,
              fields: updates
            }
          ]);
        }

        result.eventsSynced++;
        result.totalAmount += event.amount;
      } catch (error: any) {
        result.errors.push(`Failed to sync billing ${record.id}: ${error.message}`);
      }
    }

    // Emit UOI signal
    emitSignal({
      source: "hpe-billing-engine",
      type: "billing_sync",
      severity: "low",
      payload: {
        eventsSynced: result.eventsSynced,
        totalAmount: result.totalAmount,
        clientId,
        tenant
      }
    });

    // Emit HSE state update
    emitStateUpdate([
      "hpe_billing_synced",
      `events_${result.eventsSynced}`,
      `amount_${result.totalAmount}`
    ]);

    result.success = result.errors.length === 0;
    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Billing sync failed: ${error.message}`);
    return result;
  }
}

/**
 * Detect billing type from fields
 */
function detectBillingType(fields: any): BillingType {
  const invoiceId = fields["Invoice ID"] || "";
  const notes = fields.Notes || "";

  if (invoiceId.includes("RENEW") || notes.includes("renewal")) {
    return "Renewal";
  }
  if (invoiceId.includes("COMM") || notes.includes("commission")) {
    return "Commission";
  }
  if (invoiceId.includes("REFUND") || notes.includes("refund")) {
    return "Refund";
  }
  if (invoiceId.includes("ONETIME") || notes.includes("one-time")) {
    return "One-time";
  }

  return "Premium"; // Default
}

/**
 * Get billing summary for a client
 */
export async function getClientBillingSummary(clientId: string): Promise<{
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}> {
  try {
    const records = await base("Billing")
      .select({
        filterByFormula: `{Client} = '${clientId}'`
      })
      .all();

    const summary = {
      total: records.length,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    };

    const now = new Date();

    records.forEach(record => {
      const fields = record.fields as any;
      const amount = fields.Amount || 0;
      const status = fields.Status || "Draft";
      const dueDate = fields["Due Date"];

      summary.totalAmount += amount;

      if (status === "Paid") {
        summary.paid++;
        summary.paidAmount += amount;
      } else if (status === "Overdue" || (dueDate && new Date(dueDate) < now && status !== "Paid")) {
        summary.overdue++;
        summary.overdueAmount += amount;
      } else {
        summary.pending++;
        summary.pendingAmount += amount;
      }
    });

    return summary;
  } catch (error: any) {
    console.error("Failed to get billing summary:", error);
    return {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    };
  }
}

/**
 * Create billing event
 */
export async function createBillingEvent(
  event: BillingEvent
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const record = await base("Billing").create([
      {
        fields: {
          Client: [event.clientId],
          "Invoice ID": event.invoiceId,
          Amount: event.amount,
          Status: event.status,
          "Due Date": event.dueDate,
          "Paid Date": event.paidDate,
          "Stripe Link": event.stripeLink,
          "Stripe Customer ID": event.stripeCustomerId,
          Notes: event.notes,
          Type: event.type || "Premium"
        }
      }
    ]);

    // Log to audit trail
    try {
      await base("Audit Logs").create([
        {
          fields: {
            Action: "Billing Event Created",
            Entity: "billing",
            "Entity ID": record[0].id,
            User: "system",
            Timestamp: new Date().toISOString(),
            Details: JSON.stringify({
              clientId: event.clientId,
              invoiceId: event.invoiceId,
              amount: event.amount,
              status: event.status,
              type: event.type
            })
          }
        }
      ]);
    } catch (auditError) {
      console.error("Failed to log billing to audit trail:", auditError);
    }

    // Emit UOI signal
    emitSignal({
      source: "hpe-billing-engine",
      type: "billing_event",
      severity: "low",
      payload: {
        clientId: event.clientId,
        invoiceId: event.invoiceId,
        amount: event.amount,
        status: event.status
      }
    });

    return { success: true, eventId: record[0].id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
