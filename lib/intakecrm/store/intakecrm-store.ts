import fs from "node:fs";
import path from "node:path";
import type { Lead, LeadTimelineEvent } from "../intakecrm-types";
import { listOpus1Leads, getOpus1LeadStats, getOpus1LeadById, type Opus1Lead } from "../../opus1/leads";

const STORE_DIR = path.join(process.cwd(), ".xom3", "intakecrm");
const LEADS_FILE = path.join(STORE_DIR, "leads.json");
const MAX_LEADS = 20000;

// Environment flag to determine data source
const USE_OPUS1 = process.env.USE_OPUS1_DATA === "true" || process.env.NODE_ENV === "production";

type GlobalIntakecrmLeadState = {
  __xom3_intakecrm_leads_loaded__?: boolean;
  __xom3_intakecrm_leads__?: Lead[];
  __xom3_intakecrm_lead_seq__?: number;
};

function g(): GlobalIntakecrmLeadState {
  return globalThis as any;
}

function ensureLoaded() {
  const gg = g();
  if (gg.__xom3_intakecrm_leads_loaded__) return;
  gg.__xom3_intakecrm_leads_loaded__ = true;
  gg.__xom3_intakecrm_leads__ = gg.__xom3_intakecrm_leads__ || [];

  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (!fs.existsSync(LEADS_FILE)) return;
    const raw = fs.readFileSync(LEADS_FILE, "utf8");
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) gg.__xom3_intakecrm_leads__ = parsed as Lead[];
  } catch {
    // best-effort
  }
}

function persistBestEffort() {
  try {
    const gg = g();
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(LEADS_FILE, JSON.stringify((gg.__xom3_intakecrm_leads__ || []).slice(0, MAX_LEADS), null, 2), "utf8");
  } catch {
    // best-effort
  }
}

function nextLeadId() {
  const gg = g();
  gg.__xom3_intakecrm_lead_seq__ = (gg.__xom3_intakecrm_lead_seq__ || 0) + 1;
  return `lead_${Date.now()}_${gg.__xom3_intakecrm_lead_seq__}`;
}

function normalizeEmail(v: string | undefined) {
  const s = String(v || "").trim().toLowerCase();
  return s || undefined;
}

function normalizePhone(v: string | undefined) {
  const raw = String(v || "").trim();
  if (!raw) return undefined;
  const digits = raw.replace(/[^\d+]/g, "");
  return digits || undefined;
}

export async function listLeads(tenantId: string) {
  if (USE_OPUS1) {
    // Pull from Opus 1 Airtable and map to intakeCRM format
    try {
      const opus1Leads = await listOpus1Leads({ limit: 500 });
      return opus1Leads.map(mapOpus1ToIntakeCRM);
    } catch (error) {
      console.error("Failed to fetch from Opus 1, falling back to local:", error);
      // Fall back to local storage
    }
  }

  // Local storage fallback
  ensureLoaded();
  return (g().__xom3_intakecrm_leads__ || []).filter((l) => l.tenantId === tenantId);
}

function mapOpus1ToIntakeCRM(opus1Lead: Opus1Lead): Lead {
  return {
    leadId: `opus1_${opus1Lead.id}`,
    tenantId: "xom3",
    airtableId: opus1Lead.id,
    name: opus1Lead.name,
    email: opus1Lead.email,
    phone: opus1Lead.phone,
    source: opus1Lead.source || "Opus 1",
    posture: mapOpus1StatusToPosture(opus1Lead.status),
    assignedTo: opus1Lead.assignedPersona,
    tags: [],
    createdAt: opus1Lead.dateReceived || new Date().toISOString(),
    updatedAt: opus1Lead.lastModified || new Date().toISOString(),
    timeline: [],
    messagesSent: opus1Lead.messagesSent,
    totalCallAttempts: opus1Lead.totalCallAttempts,
    responseCount: opus1Lead.responseCount,
  };
}

function mapOpus1StatusToPosture(status: string | null): "new" | "working" | "closed" {
  if (!status) return "new";
  const s = status.toLowerCase();
  if (s.includes("new")) return "new";
  if (s.includes("qualified") || s.includes("hot") || s.includes("working")) return "working";
  if (s.includes("contacted") || s.includes("nurture") || s.includes("closed")) return "closed";
  return "new";
}

export async function getLeadById(tenantId: string, leadId: string) {
  if (USE_OPUS1) {
    // Check Opus 1 first
    try {
      // Handle both opus1_ prefixed IDs and direct Airtable IDs
      const airtableId = leadId.startsWith("opus1_") ? leadId.slice(6) : leadId;
      const lead = await getOpus1LeadById(airtableId);
      if (lead) return mapOpus1ToIntakeCRM(lead);
    } catch (error) {
      console.error("Failed to fetch from Opus 1:", error);
    }
  }

  // Local storage fallback
  ensureLoaded();
  return (g().__xom3_intakecrm_leads__ || []).find((l) => l.tenantId === tenantId && l.leadId === leadId) || null;
}

export async function findLeadByEmailOrPhone(tenantId: string, email?: string, phone?: string) {
  if (USE_OPUS1) {
    // Check Opus 1 first
    try {
      const opus1Leads = await listOpus1Leads({ limit: 500 });
      const e = normalizeEmail(email);
      const p = normalizePhone(phone);

      const found = opus1Leads.find((l) => {
        const le = normalizeEmail(l.email);
        const lp = normalizePhone(l.phone);
        if (e && le && e === le) return true;
        if (p && lp && p === lp) return true;
        return false;
      });

      if (found) return mapOpus1ToIntakeCRM(found);
    } catch (error) {
      console.error("Failed to fetch from Opus 1:", error);
    }
  }

  // Local storage fallback
  ensureLoaded();
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  return (
    (g().__xom3_intakecrm_leads__ || []).find((l) => {
      if (l.tenantId !== tenantId) return false;
      const le = normalizeEmail(l.email);
      const lp = normalizePhone(l.phone);
      if (e && le && e === le) return true;
      if (p && lp && p === lp) return true;
      return false;
    }) || null
  );
}

export function createLead(tenantId: string, data: Partial<Omit<Lead, "leadId" | "tenantId" | "createdAt" | "updatedAt" | "timeline">>) {
  ensureLoaded();
  const now = new Date().toISOString();
  const lead: Lead = {
    leadId: nextLeadId(),
    tenantId,
    name: data.name,
    email: normalizeEmail(data.email as any),
    phone: normalizePhone(data.phone as any),
    source: data.source,
    posture: (data.posture as any) || "new",
    assignedTo: data.assignedTo,
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt: now,
    updatedAt: now,
    timeline: [],
  };
  g().__xom3_intakecrm_leads__!.unshift(lead);
  if (g().__xom3_intakecrm_leads__!.length > MAX_LEADS) g().__xom3_intakecrm_leads__!.pop();
  persistBestEffort();
  return lead;
}

export function updateLead(tenantId: string, leadId: string, patch: Partial<Lead>) {
  ensureLoaded();
  const items = g().__xom3_intakecrm_leads__ || [];
  const idx = items.findIndex((l) => l.tenantId === tenantId && l.leadId === leadId);
  if (idx < 0) return null;
  const prev = items[idx]!;
  const next: Lead = {
    ...prev,
    ...patch,
    tenantId: prev.tenantId,
    leadId: prev.leadId,
    email: patch.email !== undefined ? normalizeEmail(patch.email) : prev.email,
    phone: patch.phone !== undefined ? normalizePhone(patch.phone) : prev.phone,
    updatedAt: new Date().toISOString(),
  };
  items.splice(idx, 1, next);
  persistBestEffort();
  return next;
}

export async function appendTimelineEvent(tenantId: string, leadId: string, evt: Omit<LeadTimelineEvent, "eventId" | "timestamp"> & { eventId?: string; timestamp?: string }) {
  const lead = await getLeadById(tenantId, leadId);
  if (!lead) return null;
  const event: LeadTimelineEvent = {
    eventId: evt.eventId || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: evt.type,
    timestamp: evt.timestamp || new Date().toISOString(),
    payload: evt.payload,
  };
  lead.timeline = [event, ...(lead.timeline || [])];
  updateLead(tenantId, leadId, { timeline: lead.timeline });
  return event;
}
