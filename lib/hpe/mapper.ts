// HPE Mapper
// Transforms Airtable records to unified EXOM3 pipeline structure

import {
  PipelineClient,
  PipelineStage,
  PipelineTask,
  ComplianceLog,
  BillingEvent,
  Interaction,
  StageTransition
} from "./schema";
import Airtable from "airtable";

export interface AirtableClientRecord {
  id: string;
  fields: {
    Name?: string;
    Email?: string;
    Phone?: string;
    Status?: string;
    "Onboarding Status"?: string;
    "Subscription Tier"?: string;
    "Created Date"?: string;
    "Last Contact"?: string;
    Notes?: string;
    Tenant?: string;
    // Linked records (will be arrays of IDs)
    Tasks?: string[];
    "Compliance Logs"?: string[];
    Billing?: string[];
    Interactions?: string[];
  };
}

export interface AirtableTaskRecord {
  id: string;
  fields: {
    Title?: string;
    Description?: string;
    Status?: string;
    Priority?: string;
    Assignee?: string;
    "Due Date"?: string;
    "Completed Date"?: string;
    "Created Date"?: string;
    Client?: string[];
  };
}

export interface AirtableComplianceRecord {
  id: string;
  fields: {
    "Event Type"?: string;
    Description?: string;
    Status?: string;
    Date?: string;
    "Due Date"?: string;
    Notes?: string;
    "Created Date"?: string;
    Client?: string[];
  };
}

export interface AirtableBillingRecord {
  id: string;
  fields: {
    "Invoice ID"?: string;
    Amount?: number;
    Status?: string;
    "Due Date"?: string;
    "Paid Date"?: string;
    "Stripe Link"?: string;
    "Stripe Customer ID"?: string;
    Notes?: string;
    Client?: string[];
  };
}

export interface AirtableInteractionRecord {
  id: string;
  fields: {
    Date?: string;
    Channel?: string;
    Type?: string;
    Notes?: string;
    Outcome?: string;
    "Created By"?: string;
    Client?: string[];
  };
}

/**
 * Map Airtable client record to PipelineClient
 */
export function mapAirtableClientToPipeline(
  record: AirtableClientRecord,
  tenant: string,
  relatedData?: {
    tasks?: AirtableTaskRecord[];
    complianceLogs?: AirtableComplianceRecord[];
    billingEvents?: AirtableBillingRecord[];
    interactions?: AirtableInteractionRecord[];
  }
): PipelineClient {
  const fields = record.fields;
  
  // Parse name into first/last if needed
  const nameParts = (fields.Name || "").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || undefined;
  
  // Determine stage (default to Prospect)
  const stage = (fields.Status as PipelineStage) || "Prospect";
  
  // Map related data
  const tasks = (relatedData?.tasks || []).map(mapAirtableTaskToPipeline);
  const complianceLogs = (relatedData?.complianceLogs || []).map(mapAirtableComplianceToPipeline);
  const billingEvents = (relatedData?.billingEvents || []).map(mapAirtableBillingToPipeline);
  const interactions = (relatedData?.interactions || []).map(mapAirtableInteractionToPipeline);
  
  return {
    id: `client-${record.id}`,
    airtableId: record.id,
    tenant: fields.Tenant || tenant,
    name: fields.Name || "",
    firstName,
    lastName,
    email: fields.Email || "",
    phone: fields.Phone,
    stage,
    stageHistory: [], // Will be populated from audit logs
    onboardingStatus: fields["Onboarding Status"],
    subscriptionTier: fields["Subscription Tier"],
    tasks,
    complianceLogs,
    billingEvents,
    interactions,
    createdAt: fields["Created Date"] || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    lastContact: fields["Last Contact"],
    notes: fields.Notes
  };
}

/**
 * Map Airtable task record to PipelineTask
 */
export function mapAirtableTaskToPipeline(
  record: AirtableTaskRecord
): PipelineTask {
  const fields = record.fields;
  
  return {
    id: `task-${record.id}`,
    airtableId: record.id,
    title: fields.Title || "",
    description: fields.Description,
    status: (fields.Status as any) || "To Do",
    priority: (fields.Priority as any) || "Medium",
    assignee: fields.Assignee,
    dueDate: fields["Due Date"],
    completedDate: fields["Completed Date"],
    createdAt: fields["Created Date"] || new Date().toISOString()
  };
}

/**
 * Map Airtable compliance record to ComplianceLog
 */
export function mapAirtableComplianceToPipeline(
  record: AirtableComplianceRecord
): ComplianceLog {
  const fields = record.fields;
  
  return {
    id: `compliance-${record.id}`,
    airtableId: record.id,
    eventType: (fields["Event Type"] as any) || "Review",
    description: fields.Description || "",
    status: (fields.Status as any) || "Pending",
    date: fields.Date || new Date().toISOString(),
    dueDate: fields["Due Date"],
    notes: fields.Notes,
    createdAt: fields["Created Date"] || new Date().toISOString()
  };
}

/**
 * Map Airtable billing record to BillingEvent
 */
export function mapAirtableBillingToPipeline(
  record: AirtableBillingRecord
): BillingEvent {
  const fields = record.fields;
  
  return {
    id: `billing-${record.id}`,
    airtableId: record.id,
    invoiceId: fields["Invoice ID"] || "",
    amount: fields.Amount || 0,
    status: (fields.Status as any) || "Draft",
    dueDate: fields["Due Date"] || new Date().toISOString(),
    paidDate: fields["Paid Date"],
    stripeLink: fields["Stripe Link"],
    stripeCustomerId: fields["Stripe Customer ID"],
    notes: fields.Notes,
    createdAt: new Date().toISOString()
  };
}

/**
 * Map Airtable interaction record to Interaction
 */
export function mapAirtableInteractionToPipeline(
  record: AirtableInteractionRecord
): Interaction {
  const fields = record.fields;
  
  return {
    id: `interaction-${record.id}`,
    airtableId: record.id,
    date: fields.Date || new Date().toISOString(),
    channel: (fields.Channel as any) || "Email",
    type: (fields.Type as any) || "Inquiry",
    notes: fields.Notes || "",
    outcome: (fields.Outcome as any) || "Pending",
    createdBy: fields["Created By"],
    createdAt: new Date().toISOString()
  };
}

/**
 * Map PipelineClient back to Airtable format for updates
 */
export function mapPipelineToAirtable(
  client: Partial<PipelineClient>
): Record<string, any> {
  const fields: Record<string, any> = {};
  
  if (client.name !== undefined) fields.Name = client.name;
  if (client.email !== undefined) fields.Email = client.email;
  if (client.phone !== undefined) fields.Phone = client.phone;
  if (client.stage !== undefined) fields.Status = client.stage;
  if (client.onboardingStatus !== undefined) fields["Onboarding Status"] = client.onboardingStatus;
  if (client.subscriptionTier !== undefined) fields["Subscription Tier"] = client.subscriptionTier;
  if (client.notes !== undefined) fields.Notes = client.notes;
  if (client.lastContact !== undefined) fields["Last Contact"] = client.lastContact;
  if (client.tenant !== undefined) fields.Tenant = client.tenant;
  
  return fields;
}
