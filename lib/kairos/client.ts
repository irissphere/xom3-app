// Kairos CRM — Airtable Client Factory
// Base: https://airtable.com/app4y7GKkeUfZm8rS

// Kairos CRM Base ID (from existing Airtable base)
export const KAIROS_BASE_ID = "app4y7GKkeUfZm8rS";

export async function getKairosBase() {
  const Airtable = (await import("airtable")).default;
  
  // Use shared Airtable API key from environment
  const apiKey = process.env.AIRTABLE_API_KEY;
  
  if (!apiKey) {
    throw new Error("AIRTABLE_API_KEY is not configured");
  }
  
  return new Airtable({ apiKey }).base(KAIROS_BASE_ID);
}

// Table names (matching Airtable base)
export const KAIROS_TABLES = {
  CLIENTS: "Clients",
  INTERACTIONS: "Interactions",
  BILLING: "Billing",
  TASKS: "Tasks",
  COMPLIANCE_LOGS: "Compliance Logs",
  AUDIT_LOGS: "Audit Logs",
  SOCIAL_QUEUE: "Social Queue",
  LEGACY_ARTIFACTS: "Legacy Artifacts",
  AMP_HISTORY: "AMP History",
  AMP_ERRORS: "AMP Errors",
  AMP_EVOLUTION_SIGNALS: "AMP Evolution Signals",
} as const;

export type KairosTableName = typeof KAIROS_TABLES[keyof typeof KAIROS_TABLES];
