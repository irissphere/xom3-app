import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { listOpus1Leads } from "@/lib/opus1/leads";
import { listLeads } from "@/lib/intakecrm/store/intakecrm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function param(url: URL, key: string): string {
  return (url.searchParams.get(key) || "").trim();
}

const STATUS_TO_POSTURE: Record<string, string> = {
  "New Lead": "new",
  "Contacted": "working",
  "Nurture": "working",
  "Qualified": "working",
  "Hot Lead": "working",
  "Working": "working",
  "Appointment": "working",
  "Enrolled": "closed",
  "Not Interested": "closed",
  "Dead": "closed",
  "Closed": "closed",
};

export async function GET(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const url = new URL(req.url);

  const q = param(url, "q").toLowerCase();
  const posture = param(url, "posture").toLowerCase();
  const status = param(url, "status");
  const persona = param(url, "persona");
  const source = param(url, "source");

  const isProduction = process.env.NODE_ENV === "production" || process.env.USE_OPUS1_DATA === "true";

  if (isProduction) {
    try {
      const opus1Leads = await listOpus1Leads({
        q: q || undefined,
        status: status || undefined,
        persona: persona || undefined,
        source: source || undefined,
        limit: 500,
      });

      let items = opus1Leads.map((l) => ({
        leadId: `opus1_${l.id}`,
        airtableId: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        posture: STATUS_TO_POSTURE[l.status || ""] || (l.status || "new").toLowerCase(),
        status: l.status,
        assignedTo: l.assignedPersona,
        source: l.source,
        messagesSent: l.messagesSent,
        totalCallAttempts: l.totalCallAttempts,
        responseCount: l.responseCount,
        state: l.state,
        zip: l.zip,
        tags: [],
        createdAt: l.dateReceived || new Date().toISOString(),
        updatedAt: l.lastModified || new Date().toISOString(),
        lastContact: l.lastContact,
      }));

      if (posture) {
        items = items.filter((l) => l.posture === posture);
      }

      return NextResponse.json(
        { ok: true, tenantId: ctx.tenant, total: items.length, items },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      console.error("[intakecrm/leads] Opus 1 fetch failed, falling back:", err);
    }
  }

  // Fallback to local store
  let items = await listLeads(ctx.tenant);

  if (posture) {
    items = items.filter((l) => String(l.posture).toLowerCase() === posture);
  }

  if (q) {
    items = items.filter((l) => {
      const hay = `${l.leadId} ${l.name || ""} ${l.email || ""} ${l.phone || ""} ${(l.tags || []).join(" ")} ${l.source || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json(
    { ok: true, tenantId: ctx.tenant, total: items.length, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
