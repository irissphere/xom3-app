// Compliance Log Writer
// Every insurance action must be logged for legal protection and audit trail

import Airtable from "airtable";
import { emitComplianceSignal } from "../uoi/compliance-signal";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

export interface ComplianceEventMetadata {
  [key: string]: any;
  operator?: string;
  subsystem?: string;
  source?: string;
  action?: string;
  details?: string;
}

/**
 * Log a compliance event to the Compliance Logs table
 * 
 * @param clientId - The client ID this event relates to
 * @param eventType - Type of event (e.g., "Stage Transition", "Policy Update", "Data Access", etc.)
 * @param metadata - Additional metadata including operator, subsystem, and custom fields
 * @returns Promise resolving to the created log entry ID
 */
export async function logComplianceEvent(
  clientId: string,
  eventType: string,
  metadata: ComplianceEventMetadata = {}
): Promise<string> {
  try {
    const timestamp = new Date().toISOString();
    const operator = metadata.operator || "system";
    const subsystem = metadata.subsystem || "crm";
    const source = metadata.source || "xom3-cockpit";
    const action = metadata.action || eventType;
    
    // Build notes from metadata
    const notesParts: string[] = [];
    if (metadata.details) {
      notesParts.push(metadata.details);
    }
    if (metadata.action && metadata.action !== eventType) {
      notesParts.push(`Action: ${metadata.action}`);
    }
    if (metadata.operator && metadata.operator !== "system") {
      notesParts.push(`Operator: ${operator}`);
    }
    if (metadata.subsystem) {
      notesParts.push(`Subsystem: ${subsystem}`);
    }
    
    // Add any additional metadata fields (excluding the standard ones)
    const standardFields = ["operator", "subsystem", "source", "action", "details"];
    const additionalFields = Object.entries(metadata)
      .filter(([key]) => !standardFields.includes(key))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
    
    if (additionalFields.length > 0) {
      notesParts.push(...additionalFields);
    }
    
    const notes = notesParts.length > 0 
      ? notesParts.join(" | ")
      : `Compliance event: ${eventType}`;

    // Create compliance log entry in Airtable
    const records = await base("Compliance Logs").create([
      {
        fields: {
          Client: [clientId],
          Type: eventType,
          Notes: notes,
          Date: timestamp,
          Operator: operator,
          Subsystem: subsystem,
          Source: source
        }
      }
    ]);

    const logId = records[0].id;

    // Emit compliance signal to UOI
    emitComplianceSignal("compliance_logged", 1, {
      clientId,
      eventType,
      logId,
      operator,
      subsystem,
      timestamp
    });

    return logId;
  } catch (error: any) {
    // Emit error signal
    emitComplianceSignal("compliance_error", 8, {
      clientId,
      eventType,
      error: error.message || "Failed to log compliance event"
    });
    
    console.error("[Compliance] Failed to log event:", error);
    throw new Error(`Failed to log compliance event: ${error.message}`);
  }
}

/**
 * Log a stage transition event (convenience wrapper)
 */
export async function logStageTransition(
  clientId: string,
  oldStage: string,
  newStage: string,
  operator?: string,
  subsystem?: string
): Promise<string> {
  return logComplianceEvent(clientId, "Stage Transition", {
    operator: operator || "system",
    subsystem: subsystem || "crm",
    action: "stage_change",
    details: `Client moved from "${oldStage}" to "${newStage}"`
  });
}

/**
 * Log a policy update event (convenience wrapper)
 */
export async function logPolicyUpdate(
  clientId: string,
  policyNumber: string,
  changes: Record<string, any>,
  operator?: string
): Promise<string> {
  return logComplianceEvent(clientId, "Policy Update", {
    operator: operator || "system",
    subsystem: "policy",
    action: "policy_update",
    details: `Policy ${policyNumber} updated`,
    changes: JSON.stringify(changes)
  });
}

/**
 * Log a data access event (convenience wrapper)
 */
export async function logDataAccess(
  clientId: string,
  accessType: string,
  operator?: string,
  subsystem?: string
): Promise<string> {
  return logComplianceEvent(clientId, "Data Access", {
    operator: operator || "system",
    subsystem: subsystem || "crm",
    action: "data_access",
    details: `Accessed client data: ${accessType}`
  });
}
