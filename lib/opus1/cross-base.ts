// Cross-Base Lead Lookup
// Checks PulseVera and P Lead Base for matching records by phone or email
// Returns Airtable URLs for viewing history in other bases

import Airtable from "airtable";

const PULSEVERA_BASE_ID = "appkplIuoOe4VLKC4";
const PULSEVERA_OLDTAKE_TABLE = "oldtake";

const P_LEAD_BASE_ID = "appMoQG9hTbjPKueC";
const P_LEAD_TABLE = "P Lead Base Data";

type AirtableRecord = { id: string; fields: Record<string, unknown> };

function getBase(baseId: string) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) throw new Error("AIRTABLE_API_KEY not configured");
  return new Airtable({ apiKey }).base(baseId);
}

function normalizePhone(phone: string | null | undefined): string {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  return raw.replace(/[^\d]/g, "").slice(-10);
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email || "").trim().toLowerCase();
}

export interface CrossBaseLink {
  base: string;
  baseId: string;
  tableId: string;
  recordId: string;
  label: string;
  name: string | null;
  url: string;
}

async function searchPulseVera(phone: string, email: string): Promise<CrossBaseLink | null> {
  if (!phone && !email) return null;

  try {
    const base = getBase(PULSEVERA_BASE_ID);
    const filterParts: string[] = [];

    if (phone) {
      filterParts.push(`FIND("${phone}", SUBSTITUTE(SUBSTITUTE({Phone Number}, "-", ""), " ", ""))`);
    }
    if (email) {
      filterParts.push(`LOWER({Email}) = "${email}"`);
    }

    const formula = filterParts.length > 1 ? `OR(${filterParts.join(",")})` : filterParts[0] || "";

    const records = (await base(PULSEVERA_OLDTAKE_TABLE)
      .select({ maxRecords: 1, filterByFormula: formula })
      .all()) as unknown as AirtableRecord[];

    if (records.length > 0) {
      const r = records[0]!;
      const firstName = String(r.fields["First Name"] || "");
      const lastName = String(r.fields["Last Name"] || "");
      const name = [firstName, lastName].filter(Boolean).join(" ") || null;
      return {
        base: "PulseVera Lead Messaging",
        baseId: PULSEVERA_BASE_ID,
        tableId: "tbltQkcEcqpxe6WXL",
        recordId: r.id,
        label: "PulseVera History",
        name,
        url: `https://airtable.com/${PULSEVERA_BASE_ID}/tbltQkcEcqpxe6WXL/${r.id}`,
      };
    }
  } catch (err) {
    console.error("[cross-base] PulseVera lookup failed:", err);
  }

  return null;
}

async function searchPLeadBase(phone: string, email: string): Promise<CrossBaseLink | null> {
  if (!phone && !email) return null;

  try {
    const base = getBase(P_LEAD_BASE_ID);
    const filterParts: string[] = [];

    if (phone) {
      filterParts.push(`FIND("${phone}", SUBSTITUTE(SUBSTITUTE({Phone Number}, "-", ""), " ", ""))`);
    }
    if (email) {
      filterParts.push(`LOWER({Email}) = "${email}"`);
    }

    const formula = filterParts.length > 1 ? `OR(${filterParts.join(",")})` : filterParts[0] || "";

    const records = (await base(P_LEAD_TABLE)
      .select({ maxRecords: 1, filterByFormula: formula })
      .all()) as unknown as AirtableRecord[];

    if (records.length > 0) {
      const r = records[0]!;
      const firstName = String(r.fields["First Name"] || "");
      const lastName = String(r.fields["Last Name"] || "");
      const name = [firstName, lastName].filter(Boolean).join(" ") || null;
      return {
        base: "P Lead Base Data",
        baseId: P_LEAD_BASE_ID,
        tableId: "tblNoAtiu9Ti5ciKU",
        recordId: r.id,
        label: "P Lead Base History",
        name,
        url: `https://airtable.com/${P_LEAD_BASE_ID}/tblNoAtiu9Ti5ciKU/${r.id}`,
      };
    }
  } catch (err) {
    console.error("[cross-base] P Lead Base lookup failed:", err);
  }

  return null;
}

export async function findCrossBaseLinks(
  phone: string | null | undefined,
  email: string | null | undefined
): Promise<CrossBaseLink[]> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedPhone && !normalizedEmail) return [];

  const results = await Promise.allSettled([
    searchPulseVera(normalizedPhone, normalizedEmail),
    searchPLeadBase(normalizedPhone, normalizedEmail),
  ]);

  const links: CrossBaseLink[] = [];
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      links.push(result.value);
    }
  }

  return links;
}
