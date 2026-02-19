import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getLeadById } from "@/lib/intakecrm/store/intakecrm-store";
import { findCrossBaseLinks } from "@/lib/opus1/cross-base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);

  const lead = await getLeadById(c.tenant, leadId);
  if (!lead) {
    return NextResponse.json({ ok: false, error: "lead_not_found", links: [] }, { status: 404 });
  }

  try {
    const links = await findCrossBaseLinks(lead.phone, lead.email);
    return NextResponse.json(
      { ok: true, tenantId: c.tenant, leadId, links },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[cross-base] Lookup failed:", err);
    return NextResponse.json(
      { ok: true, tenantId: c.tenant, leadId, links: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
