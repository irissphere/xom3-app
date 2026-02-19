import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { listOpus1Leads } from "@/lib/opus1/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const url = new URL(req.url);
  const persona = (url.searchParams.get("persona") || "").trim();

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.USE_OPUS1_DATA === "true";

  if (!isProduction) {
    return NextResponse.json({
      ok: true,
      comingSoon: true,
      message: "Connect Opus 1 (USE_OPUS1_DATA=true) for live persona funnel",
      byPersona: {},
      personas: [],
      total: 0,
    });
  }

  try {
    const opus1Leads = await listOpus1Leads({
      persona: persona || undefined,
      limit: 500,
    });

    const byPersona: Record<
      string,
      { total: number; byStatus: Record<string, number> }
    > = {};

    for (const lead of opus1Leads) {
      const p = lead.assignedPersona || "Unassigned";
      if (!byPersona[p]) {
        byPersona[p] = { total: 0, byStatus: {} };
      }
      byPersona[p].total++;
      const status = lead.status || "New Lead";
      byPersona[p].byStatus[status] =
        (byPersona[p].byStatus[status] || 0) + 1;
    }

    const personas = Object.keys(byPersona).sort();
    const total = opus1Leads.length;

    return NextResponse.json(
      {
        ok: true,
        tenantId: ctx.tenant,
        byPersona,
        personas,
        total,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[intakecrm/pipeline] Failed:", err);
    return NextResponse.json(
      { ok: false, error: "pipeline_fetch_failed" },
      { status: 500 }
    );
  }
}
