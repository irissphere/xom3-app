import { getBase } from "@/lib/airtable/client";
import { listSignals } from "@/lib/signals/signal-store";
import type {
  BenefitsCrmClient,
  BenefitsCrmEligibilityCheck,
  BenefitsCrmFollowUp,
  BenefitsCrmStatusSummary,
  BenefitsCrmPriority,
  BenefitsCrmClientStatus,
  BenefitsCrmFollowUpStatus,
  BenefitsCrmEligibilityStatus,
  BenefitsCrmLeadType,
} from "./types";

const TABLE_CLIENTS = "Benefits CRM Clients";
const TABLE_FOLLOWUPS = "Benefits CRM Follow-ups";

// Schema doc calls this table "Eligibility". Use env override to avoid hardcoding.
const TABLE_ELIGIBILITY = process.env.BENEFITSCRM_TABLE_ELIGIBILITY || "Eligibility";

type AirtableRecord = { id: string; fields: Record<string, any> };

function asText(v: any): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number") return String(v);
  return null;
}

function asBool(v: any): boolean {
  return v === true;
}

function asIso(v: any): string | null {
  const s = asText(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function asNumber(v: any): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = asText(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeLeadType(v: any): BenefitsCrmLeadType | null {
  const s = asText(v);
  if (!s) return null;
  if (s === "ACA" || s === "Medicare" || s === "Employer" || s === "Individual/Family") return s;
  return null;
}

function normalizePriority(v: any): BenefitsCrmPriority | null {
  const s = asText(v)?.toLowerCase();
  if (!s) return null;
  if (s === "low" || s === "medium" || s === "high" || s === "urgent") return s as BenefitsCrmPriority;
  return null;
}

function normalizeClientStatus(v: any): BenefitsCrmClientStatus | null {
  const s = asText(v);
  if (!s) return null;
  const allowed: BenefitsCrmClientStatus[] = ["New", "Contacted", "In Progress", "Qualified", "Enrolled", "Lost", "On Hold"];
  return (allowed as string[]).includes(s) ? (s as BenefitsCrmClientStatus) : null;
}

function normalizeFollowupStatus(v: any): BenefitsCrmFollowUpStatus | null {
  const s = asText(v)?.toLowerCase();
  if (!s) return null;
  const allowed: BenefitsCrmFollowUpStatus[] = ["pending", "due_now", "overdue", "completed", "cancelled"];
  return (allowed as string[]).includes(s) ? (s as BenefitsCrmFollowUpStatus) : null;
}

function normalizeEligibilityStatus(v: any): BenefitsCrmEligibilityStatus | null {
  const s = asText(v)?.toLowerCase();
  if (!s) return null;
  const allowed: BenefitsCrmEligibilityStatus[] = ["pending", "verified", "eligible", "ineligible", "needs_review", "error"];
  return (allowed as string[]).includes(s) ? (s as BenefitsCrmEligibilityStatus) : null;
}

function safeClientName(fields: Record<string, any>, fallbackEmail?: string | null) {
  return asText(fields["Name"]) || asText(fields["Client Name"]) || fallbackEmail || null;
}

function tableMissingError(e: any): boolean {
  const msg = String(e?.message || "").toLowerCase();
  return msg.includes("not found") && (msg.includes("table") || msg.includes("base"));
}

export async function listBenefitscrmClients(input: {
  q?: string;
  status?: string;
  leadType?: string;
  limit?: number;
}): Promise<BenefitsCrmClient[]> {
  const base = await getBase();
  const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
  const q = (input.q || "").trim().toLowerCase();
  const status = (input.status || "").trim();
  const leadType = (input.leadType || "").trim();

  const filterParts: string[] = [];
  if (status) filterParts.push(`{Status} = "${status.replaceAll('"', '\\"')}"`);
  if (leadType) filterParts.push(`{Lead Type} = "${leadType.replaceAll('"', '\\"')}"`);
  if (q) {
    const esc = q.replaceAll('"', '\\"');
    filterParts.push(
      `OR(FIND("${esc}", LOWER({Name} & "")) > 0, FIND("${esc}", LOWER({Email} & "")) > 0, FIND("${esc}", LOWER({Phone} & "")) > 0)`
    );
  }

  const filterByFormula = filterParts.length ? (filterParts.length === 1 ? filterParts[0] : `AND(${filterParts.join(",")})`) : "";

  const records = (await base(TABLE_CLIENTS)
    .select({
      maxRecords: limit,
      sort: [{ field: "Created Date", direction: "desc" }],
      filterByFormula,
    })
    .all()) as unknown as AirtableRecord[];

  return records.map((r) => {
    const f = r.fields || {};
    return {
      id: r.id,
      name: safeClientName(f, asText(f["Email"])),
      email: asText(f["Email"]),
      phone: asText(f["Phone"]),
      leadType: normalizeLeadType(f["Lead Type"]),
      eligibilityCategory: asText(f["Eligibility Category"]),
      priority: normalizePriority(f["Priority"]),
      status: normalizeClientStatus(f["Status"]),
      onboardingStatus: asText(f["Onboarding Status"]),
      nextFollowUp: asIso(f["Next Follow Up"]),
      lastContact: asIso(f["Last Contact"]),
      createdAt: asIso(f["Created Date"]),
      updatedAt: asIso(f["Updated Date"]),
      notes: asText(f["Notes"]),
    };
  });
}

export async function getBenefitscrmClient(clientId: string): Promise<BenefitsCrmClient | null> {
  const base = await getBase();
  const rec = (await base(TABLE_CLIENTS).find(clientId)) as unknown as AirtableRecord;
  if (!rec) return null;
  const f = rec.fields || {};
  return {
    id: rec.id,
    name: safeClientName(f, asText(f["Email"])),
    email: asText(f["Email"]),
    phone: asText(f["Phone"]),
    leadType: normalizeLeadType(f["Lead Type"]),
    eligibilityCategory: asText(f["Eligibility Category"]),
    priority: normalizePriority(f["Priority"]),
    status: normalizeClientStatus(f["Status"]),
    onboardingStatus: asText(f["Onboarding Status"]),
    nextFollowUp: asIso(f["Next Follow Up"]),
    lastContact: asIso(f["Last Contact"]),
    createdAt: asIso(f["Created Date"]),
    updatedAt: asIso(f["Updated Date"]),
    notes: asText(f["Notes"]),
  };
}

export async function listBenefitscrmFollowups(input: {
  status?: string;
  limit?: number;
}): Promise<BenefitsCrmFollowUp[]> {
  const base = await getBase();
  const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
  const status = (input.status || "").trim().toLowerCase();
  const filterByFormula = status ? `{Status} = "${status.replaceAll('"', '\\"')}"` : "";

  const records = (await base(TABLE_FOLLOWUPS)
    .select({
      maxRecords: limit,
      sort: [{ field: "Due Date", direction: "asc" }],
      filterByFormula,
    })
    .all()) as unknown as AirtableRecord[];

  return records.map((r) => {
    const f = r.fields || {};
    const clientId = Array.isArray(f["Client"]) ? String(f["Client"][0] || "") : null;
    const clientName = Array.isArray(f["Client"]) ? null : null;
    return {
      id: r.id,
      clientId: clientId || null,
      clientName,
      type: asText(f["Type"]),
      title: asText(f["Title"]),
      dueDate: asIso(f["Due Date"]),
      status: normalizeFollowupStatus(f["Status"]),
      priority: normalizePriority(f["Priority"]),
      smsSent: asBool(f["SMS Sent"]),
      createdAt: asIso(f["Created Date"]),
      completedAt: asIso(f["Completed At"]),
    };
  });
}

export async function listBenefitscrmEligibility(input: { limit?: number; status?: string }): Promise<BenefitsCrmEligibilityCheck[]> {
  const base = await getBase();
  const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
  const status = (input.status || "").trim().toLowerCase();
  const filterByFormula = status ? `{Status} = "${status.replaceAll('"', '\\"')}"` : "";

  try {
    const records = (await base(TABLE_ELIGIBILITY)
      .select({
        maxRecords: limit,
        sort: [{ field: "Created Date", direction: "desc" }],
        filterByFormula,
      })
      .all()) as unknown as AirtableRecord[];

    return records.map((r) => {
      const f = r.fields || {};
      const clientId = Array.isArray(f["Client"]) ? String(f["Client"][0] || "") : null;
      return {
        id: r.id,
        clientId: clientId || null,
        clientName: asText(f["Client Name"]) || asText(f["Name"]) || null,
        leadType: normalizeLeadType(f["Lead Type"]),
        eligibilityCategory: asText(f["Eligibility Category"]),
        status: normalizeEligibilityStatus(f["Status"]),
        requestedAt: asIso(f["Created Date"]) || asIso(f["Requested At"]),
        checkedAt: asIso(f["Verification Date"]) || asIso(f["Checked At"]),
        notes: asText(f["Eligibility Notes"]) || asText(f["Notes"]),
        confidence: asNumber(f["Confidence"]) || null,
      };
    });
  } catch (e: any) {
    if (tableMissingError(e)) return [];
    throw e;
  }
}

export async function getBenefitscrmStatus(): Promise<BenefitsCrmStatusSummary> {
  const [clients, followups, eligibility] = await Promise.all([
    listBenefitscrmClients({ limit: 200 }),
    listBenefitscrmFollowups({ limit: 200 }),
    listBenefitscrmEligibility({ limit: 200 }),
  ]);

  const byStatus: Record<string, number> = {};
  const byLeadType: Record<string, number> = {};
  for (const c of clients) {
    const s = c.status || "Unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;
    const t = c.leadType || "Unknown";
    byLeadType[t] = (byLeadType[t] || 0) + 1;
  }

  const fu = {
    total: followups.length,
    pending: followups.filter((f) => f.status === "pending" || f.status === "due_now").length,
    overdue: followups.filter((f) => f.status === "overdue").length,
    completed: followups.filter((f) => f.status === "completed").length,
  };

  const eligPending = eligibility.filter((e) => e.status === "pending").length;
  const eligVerified = eligibility.filter((e) => e.status === "verified" || e.status === "eligible").length;
  const eligDenied = eligibility.filter((e) => e.status === "ineligible").length;
  const eligNeedsInfo = eligibility.filter((e) => e.status === "needs_review").length;

  const durationsMin: number[] = [];
  for (const e of eligibility) {
    if (!e.requestedAt || !e.checkedAt) continue;
    const a = new Date(e.requestedAt).getTime();
    const b = new Date(e.checkedAt).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) continue;
    durationsMin.push(Math.round((b - a) / 60000));
  }

  const avgMinutes = durationsMin.length ? Math.round(durationsMin.reduce((s, x) => s + x, 0) / durationsMin.length) : null;

  // Posture heuristic: lots of overdue followups or errors drives degraded.
  let posture: BenefitsCrmStatusSummary["posture"] = "nominal";
  if (fu.overdue > 0 || eligNeedsInfo > 0) posture = "degraded";
  if (fu.overdue > 10) posture = "critical";

  return {
    posture,
    lastSync: new Date().toISOString(),
    counts: {
      clients: clients.length,
      byStatus,
      byLeadType,
      followups: fu,
      eligibility: {
        total: eligibility.length,
        pending: eligPending,
        verified: eligVerified,
        denied: eligDenied,
        needsInfo: eligNeedsInfo,
        avgMinutes,
      },
    },
  };
}

export function listBenefitscrmAuditSignals(input: { limit?: number }) {
  const limit = Math.max(1, Math.min(200, Number(input.limit || 50) || 50));
  return listSignals({ prefix: "benefitscrm.", limit });
}

