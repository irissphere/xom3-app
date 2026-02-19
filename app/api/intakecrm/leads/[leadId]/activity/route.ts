import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getLeadById } from "@/lib/intakecrm/store/intakecrm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ActivityItem = {
  id: string;
  type: "call" | "sms" | "email" | "note" | "status_change";
  label: string;
  timestamp: string;
  payload?: Record<string, unknown>;
};

export async function GET(
  req: Request,
  ctx: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const lead = await getLeadById(c.tenant, leadId);
  if (!lead)
    return NextResponse.json(
      { ok: false, error: "lead_not_found" },
      { status: 404 }
    );

  const items: ActivityItem[] = [];

  // Opus 1 stats as activity summaries
  const msgs = lead.messagesSent ?? 0;
  const calls = lead.totalCallAttempts ?? 0;
  const responses = lead.responseCount ?? 0;
  if (msgs > 0) {
    items.push({
      id: `sms_summary_${lead.leadId}`,
      type: "sms",
      label: `${msgs} text${msgs !== 1 ? "s" : ""} sent`,
      timestamp: lead.updatedAt,
      payload: { count: msgs },
    });
  }
  if (calls > 0) {
    items.push({
      id: `call_summary_${lead.leadId}`,
      type: "call",
      label: `${calls} call attempt${calls !== 1 ? "s" : ""}${responses > 0 ? `, ${responses} response${responses !== 1 ? "s" : ""}` : ""}`,
      timestamp: lead.updatedAt,
      payload: { totalCallAttempts: calls, responseCount: responses },
    });
  }

  // Timeline events
  const timeline = lead.timeline ?? [];
  for (const evt of timeline) {
    let type: ActivityItem["type"] = "note";
    let label = evt.type;
    if (evt.type === "intakecrm.lead.note") {
      type = "note";
      label = "Note added";
    } else if (evt.type?.includes("call")) {
      type = "call";
    } else if (evt.type?.includes("sms") || evt.type?.includes("text")) {
      type = "sms";
    } else if (evt.type?.includes("email")) {
      type = "email";
    } else if (evt.type?.includes("lead.updated") || evt.type?.includes("status")) {
      type = "status_change";
    }
    items.push({
      id: evt.eventId,
      type,
      label: typeof evt.payload?.text === "string" ? evt.payload.text.slice(0, 80) + (evt.payload.text.length > 80 ? "…" : "") : label,
      timestamp: evt.timestamp,
      payload: evt.payload,
    });
  }

  // Sort by timestamp descending
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json(
    { ok: true, items, leadId },
    { headers: { "Cache-Control": "no-store" } }
  );
}
