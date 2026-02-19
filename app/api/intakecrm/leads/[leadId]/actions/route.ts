import { NextResponse } from "next/server";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getLeadById } from "@/lib/intakecrm/store/intakecrm-store";
import { updateOpus1LeadStatus } from "@/lib/opus1/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_OPUS1 = process.env.USE_OPUS1_DATA === "true" || process.env.NODE_ENV === "production";

export type LeadAction = "doesnt_qualify" | "take_over" | "schedule_appointment" | "transfer" | "mark_hot" | "nurture";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leadId: string }> }
) {
  const { leadId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(c.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const lead = await getLeadById(c.tenant, leadId);
  if (!lead)
    return NextResponse.json(
      { ok: false, error: "lead_not_found" },
      { status: 404 }
    );

  let body: { action: LeadAction; payload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const { action } = body;
  if (!action || !["doesnt_qualify", "take_over", "schedule_appointment", "transfer", "mark_hot", "nurture"].includes(action)) {
    return NextResponse.json(
      { ok: false, error: "invalid_action" },
      { status: 400 }
    );
  }

  const airtableId = lead.airtableId ?? (leadId.startsWith("opus1_") ? leadId.slice(6) : null);

  // schedule_appointment and transfer – open calendar or show coming soon
  if (action === "schedule_appointment" || action === "transfer") {
    const calendarUrl = process.env.CALENDAR_SCHEDULE_URL?.trim();
    if (action === "schedule_appointment" && !calendarUrl) {
      return NextResponse.json({
        ok: false,
        comingSoon: true,
        message: "Set CALENDAR_SCHEDULE_URL to enable scheduling",
      }, { status: 503 });
    }
    if (action === "transfer") {
      return NextResponse.json({
        ok: true,
        action,
        message: "Use your phone system to transfer this call",
      });
    }
    return NextResponse.json({
      ok: true,
      action,
      calendarUrl: calendarUrl!,
      message: "Open calendar to schedule",
    });
  }

  // Status updates require Opus 1
  if (!USE_OPUS1 || !airtableId) {
    return NextResponse.json({
      ok: false,
      comingSoon: true,
      message: "Connect Opus 1 (USE_OPUS1_DATA) to update lead status",
    }, { status: 503 });
  }

  let status: string;
  switch (action) {
    case "doesnt_qualify":
      status = "Not Interested";
      break;
    case "take_over":
      status = "Working";
      break;
    case "mark_hot":
      status = "Hot Lead";
      break;
    case "nurture":
      status = "Nurture";
      break;
    default:
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  const updated = await updateOpus1LeadStatus(airtableId, status);
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "opus1_update_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    action,
    leadId,
    message: `Lead marked: ${action.replace(/_/g, " ")}`,
  });
}
