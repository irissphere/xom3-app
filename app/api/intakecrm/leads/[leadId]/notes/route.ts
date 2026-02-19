import { NextResponse } from "next/server";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getLeadById, appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";
import { emitSignal } from "@/lib/uoi/signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(c.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const lead = await getLeadById(c.tenant, leadId);
  if (!lead) return NextResponse.json({ ok: false, error: "lead_not_found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const text = normalizeText(body?.text);
  if (!text) return NextResponse.json({ ok: false, error: "missing_text" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ ok: false, error: "text_too_long" }, { status: 400 });

  const evt = await appendTimelineEvent(c.tenant, leadId, { type: "intakecrm.lead.note", payload: { text } });
  if (!evt) return NextResponse.json({ ok: false, error: "note_write_failed" }, { status: 500 });

  emitSignal({
    source: "intakecrm",
    type: "intakecrm.lead.note.added",
    priority: "low",
    payload: { tenantId: c.tenant, leadId, eventId: evt.eventId },
  });

  return NextResponse.json({ ok: true, tenantId: c.tenant, leadId, event: evt }, { headers: { "Cache-Control": "no-store" } });
}

















