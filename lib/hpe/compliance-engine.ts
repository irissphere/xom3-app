// HPE Compliance Engine
// Timestamped, agent-linked, stage-linked, client-linked, audit-ready logging

import { getBase } from "@/lib/airtable/client";
import { emitComplianceSignal } from "../uoi/compliance-signal";
import { emitStateUpdate } from "../hse/signals";

export interface ComplianceEvent {
  clientId: string;
  eventType: ComplianceEventType;
  description: string;
  status?: ComplianceStatus;
  date?: string;
  dueDate?: string;
  notes?: string;
  userId?: string;
  stage?: string;
  metadata?: Record<string, any>;
}

export type ComplianceEventType = 
  | "Audit"
  | "Review"
  | "Violation"
  | "Correction"
  | "Approval";

export type ComplianceStatus = 
  | "Pending"
  | "In Review"
  | "Approved"
  | "Rejected"
  | "Resolved";

export interface ComplianceLogResult {
  success: boolean;
  logId?: string;
  error?: string;
}

/**
 * Log compliance event with full context
 */
export async function logComplianceEvent(
  event: ComplianceEvent
): Promise<ComplianceLogResult> {
  try {
    const base = await getBase();
    // Get client stage if not provided
    let clientStage = event.stage;
    if (!clientStage) {
      try {
        const client = await base("Clients").find(event.clientId);
        clientStage = (client.fields as any).Status || "Unknown";
      } catch {
        // Continue without stage
      }
    }

    // Create compliance log
    const record = await base("Compliance Logs").create([
      {
        fields: {
          Client: [event.clientId],
          "Event Type": event.eventType,
          Description: event.description,
          Status: event.status || "Pending",
          Date: event.date || new Date().toISOString(),
          "Due Date": event.dueDate,
          Notes: event.notes || JSON.stringify({
            userId: event.userId || "system",
            stage: clientStage,
            timestamp: new Date().toISOString(),
            ...event.metadata
          }),
          "Created Date": new Date().toISOString()
        }
      }
    ]);

    const logId = record[0].id;

    // Log to audit trail
    try {
      await base("Audit Logs").create([
        {
          fields: {
            Action: "Compliance Log Created",
            Entity: "compliance",
            "Entity ID": logId,
            User: event.userId || "system",
            Timestamp: new Date().toISOString(),
            Details: JSON.stringify({
              clientId: event.clientId,
              eventType: event.eventType,
              description: event.description,
              status: event.status,
              stage: clientStage,
              ...event.metadata
            })
          }
        }
      ]);
    } catch (auditError) {
      console.error("Failed to log compliance to audit trail:", auditError);
      // Continue even if audit fails
    }

    // Emit UOI compliance signal
    emitComplianceSignal("compliance_check", 2, {
      clientId: event.clientId,
      type: event.eventType,
      status: event.status || "Pending",
      logId,
      stage: clientStage
    });

    // Emit HSE state update
    emitStateUpdate([
      "hpe_compliance_logged",
      `client_${event.clientId}`,
      `type_${event.eventType}`,
      `status_${event.status || "Pending"}`
    ]);

    return { success: true, logId };
  } catch (error: any) {
    console.error("Failed to log compliance event:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get compliance logs for a client
 */
export async function getClientComplianceLogs(
  clientId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const base = await getBase();
    const records = await base("Compliance Logs")
      .select({
        filterByFormula: `{Client} = '${clientId}'`,
        sort: [{ field: "Date", direction: "desc" }],
        maxRecords: limit
      })
      .all();

    return records.map(r => ({
      id: r.id,
      ...r.fields
    }));
  } catch (error: any) {
    console.error("Failed to get compliance logs:", error);
    return [];
  }
}

/**
 * Get compliance status summary for a client
 */
export async function getClientComplianceSummary(clientId: string): Promise<{
  total: number;
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  resolved: number;
  overdue: number;
}> {
  try {
    const base = await getBase();
    const records = await base("Compliance Logs")
      .select({
        filterByFormula: `{Client} = '${clientId}'`
      })
      .all();

    const summary = {
      total: records.length,
      pending: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      resolved: 0,
      overdue: 0
    };

    const now = new Date();

    records.forEach(record => {
      const status = (record.fields as any).Status;
      const dueDate = (record.fields as any)["Due Date"];

      if (status === "Pending") summary.pending++;
      else if (status === "In Review") summary.inReview++;
      else if (status === "Approved") summary.approved++;
      else if (status === "Rejected") summary.rejected++;
      else if (status === "Resolved") summary.resolved++;

      // Check if overdue
      if (dueDate && status !== "Resolved" && status !== "Approved") {
        const due = new Date(dueDate);
        if (due < now) {
          summary.overdue++;
        }
      }
    });

    return summary;
  } catch (error: any) {
    console.error("Failed to get compliance summary:", error);
    return {
      total: 0,
      pending: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      resolved: 0,
      overdue: 0
    };
  }
}

/**
 * Update compliance log status
 */
export async function updateComplianceStatus(
  logId: string,
  newStatus: ComplianceStatus,
  userId?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const base = await getBase();
    await base("Compliance Logs").update([
      {
        id: logId,
        fields: {
          Status: newStatus,
          Notes: notes || (await base("Compliance Logs").find(logId)).fields.Notes
        }
      }
    ]);

    // Log to audit trail
    try {
      await base("Audit Logs").create([
        {
          fields: {
            Action: "Compliance Status Updated",
            Entity: "compliance",
            "Entity ID": logId,
            User: userId || "system",
            Timestamp: new Date().toISOString(),
            Details: JSON.stringify({
              logId,
              newStatus,
              notes
            })
          }
        }
      ]);
    } catch (auditError) {
      console.error("Failed to log status update to audit trail:", auditError);
    }

    // Emit UOI signal
    emitComplianceSignal("compliance_check", 1, {
      logId,
      type: "status_update",
      newStatus
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
