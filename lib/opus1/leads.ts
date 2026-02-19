// Opus 1 Leads Integration
// Connects to the real USHA Ledger in Airtable

import Airtable from "airtable";

const OPUS1_BASE_ID = process.env.AIRTABLE_OPUS1_BASE_ID || "appCkU8L3sdmqaAmI";
const OPUS1_LEADS_TABLE = process.env.OPUS1_LEADS_TABLE || "Leads";

type AirtableRecord = { id: string; fields: Record<string, unknown> };

function getOpus1Base() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    throw new Error("AIRTABLE_API_KEY not configured");
  }
  return new Airtable({ apiKey }).base(OPUS1_BASE_ID);
}

function asText(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asIso(v: unknown): string | null {
  const s = asText(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export interface Opus1Lead {
  id: string;
  leadId: number | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  dateReceived: string | null;
  lastContact: string | null;
  state: string | null;
  zip: string | null;
  timezone: string | null;
  messagesSent: number | null;
  totalCallAttempts: number | null;
  responseCount: number | null;
  assignedPersona: string | null;
  lastModified: string | null;
}

function mapLeadRecord(r: AirtableRecord): Opus1Lead {
  const f = r.fields || {};
  const firstName = asText(f["First_Name"]);
  const lastName = asText(f["Last_Name"]);
  return {
    id: r.id,
    leadId: asNumber(f["Lead_ID"]),
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" ") || null,
    phone: asText(f["Phone"]),
    email: asText(f["Email"]),
    status: asText(f["Status"]),
    source: asText(f["Lead_Source"]),
    dateReceived: asIso(f["Date_Received"]),
    lastContact: asIso(f["Last_Contact"]),
    state: asText(f["State"]),
    zip: asText(f["ZIP"]),
    timezone: asText(f["Timezone"]),
    messagesSent: asNumber(f["Messages_Sent"]),
    totalCallAttempts: asNumber(f["Total_Call_Attempts"]),
    responseCount: asNumber(f["Response_Count"]),
    assignedPersona: asText(f["Assigned_Persona"]),
    lastModified: asIso(f["Last Modified"]),
  };
}

export interface ListOpus1LeadsInput {
  status?: string;
  q?: string;
  limit?: number;
  source?: string;
  persona?: string;
}

export async function listOpus1Leads(input: ListOpus1LeadsInput = {}): Promise<Opus1Lead[]> {
  const base = getOpus1Base();
  const limit = Math.max(1, Math.min(1000, Number(input.limit || 500) || 500));

  const filterParts: string[] = [];
  
  if (input.status) {
    filterParts.push(`{Status} = "${input.status.replaceAll('"', '\\"')}"`);
  }
  
  if (input.source) {
    filterParts.push(`{Lead_Source} = "${input.source.replaceAll('"', '\\"')}"`);
  }

  if (input.persona) {
    filterParts.push(`{Assigned_Persona} = "${input.persona.replaceAll('"', '\\"')}"`);
  }

  if (input.q) {
    const esc = input.q.toLowerCase().replaceAll('"', '\\"');
    filterParts.push(
      `OR(FIND("${esc}", LOWER({First_Name} & "")) > 0, FIND("${esc}", LOWER({Last_Name} & "")) > 0, FIND("${esc}", LOWER({Email} & "")) > 0, FIND("${esc}", LOWER({Phone} & "")) > 0)`
    );
  }

  const filterByFormula = filterParts.length 
    ? (filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(",")})`)
    : "";

  try {
    const records = (await base(OPUS1_LEADS_TABLE)
      .select({
        maxRecords: limit,
        sort: [{ field: "Date_Received", direction: "desc" }],
        filterByFormula: filterByFormula || undefined,
      })
      .all()) as unknown as AirtableRecord[];

    return records.map(mapLeadRecord);
  } catch (e) {
    console.error("[Opus1] Failed to fetch leads:", e);
    return [];
  }
}

export interface Opus1LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  today: number;
  thisWeek: number;
  avgResponseTime: number | null;
}

export async function getOpus1LeadStats(): Promise<Opus1LeadStats> {
  const leads = await listOpus1Leads({ limit: 500 });
  
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  
  let today = 0;
  let thisWeek = 0;
  
  for (const lead of leads) {
    // Status counts
    const status = lead.status || "Unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
    
    // Source counts
    const source = lead.source || "Unknown";
    bySource[source] = (bySource[source] || 0) + 1;
    
    // Time-based counts
    if (lead.dateReceived) {
      const received = new Date(lead.dateReceived).getTime();
      if (received >= todayStart) today++;
      if (received >= weekStart) thisWeek++;
    }
  }
  
  return {
    total: leads.length,
    byStatus,
    bySource,
    today,
    thisWeek,
    avgResponseTime: null, // Would need more data to calculate
  };
}

export async function getOpus1LeadById(recordId: string): Promise<Opus1Lead | null> {
  const base = getOpus1Base();
  try {
    const record = (await base(OPUS1_LEADS_TABLE).find(recordId)) as unknown as AirtableRecord;
    return mapLeadRecord(record);
  } catch {
    return null;
  }
}

/**
 * Update Opus 1 lead Status in Airtable (for actions: doesn't qualify, take over, etc.)
 */
export async function updateOpus1LeadStatus(recordId: string, status: string): Promise<boolean> {
  const base = getOpus1Base();
  try {
    await base(OPUS1_LEADS_TABLE).update(recordId, { Status: status });
    return true;
  } catch (e) {
    console.error("[Opus1] Failed to update lead status:", e);
    return false;
  }
}

// Recent leads with relative time formatting
export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

