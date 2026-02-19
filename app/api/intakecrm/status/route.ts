import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getOpus1LeadStats } from "@/lib/opus1/leads";
import { listLeads } from "@/lib/intakecrm/store/intakecrm-store";
import { getTasksByTenant } from "@/lib/intakecrm/tasks/intakecrm-task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function mapStatusToPosture(status: string): string {
  return STATUS_TO_POSTURE[status] || status.toLowerCase();
}

export async function GET(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const url = new URL(req.url);
  const extended = url.searchParams.get("extended") === "1";

  let leadCount = 0;
  let postureCounts: Record<string, number> = {};
  let sourceCounts: Record<string, number> = {};
  let todayCount = 0;
  let weekCount = 0;

  try {
    const stats = await getOpus1LeadStats();
    leadCount = stats.total;
    todayCount = stats.today;
    weekCount = stats.thisWeek;
    sourceCounts = stats.bySource;

    for (const [status, count] of Object.entries(stats.byStatus)) {
      const posture = mapStatusToPosture(status);
      postureCounts[posture] = (postureCounts[posture] || 0) + count;
    }
  } catch (err) {
    console.error("[intakecrm/status] Failed to fetch Opus 1 stats, falling back to local:", err);
    try {
      const leads = await listLeads(ctx.tenant);
      leadCount = leads.length;
      for (const l of leads) {
        const p = String(l.posture || "unknown");
        postureCounts[p] = (postureCounts[p] || 0) + 1;
        const s = String(l.source || "unknown");
        sourceCounts[s] = (sourceCounts[s] || 0) + 1;
      }
    } catch {
      // best-effort
    }
  }

  const tasks = getTasksByTenant(ctx.tenant);
  const overdue = tasks.filter((t) => t.status === "overdue").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  const payload: Record<string, unknown> = {
    ok: true,
    tenant: ctx.tenant,
    counts: {
      leads: leadCount,
      leadPosture: postureCounts,
      leadSource: sourceCounts,
      leadsToday: todayCount,
      leadsThisWeek: weekCount,
      tasks: { total: tasks.length, pending, overdue, completed },
    },
    now: new Date().toISOString(),
  };

  if (extended) {
    try {
      const leads = await listLeads(ctx.tenant);
      const recentLeads = leads
        .slice()
        .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        .slice(0, 8);
      payload.recentLeads = recentLeads;
    } catch {
      payload.recentLeads = [];
    }

    const pendingTasks = tasks
      .filter((t) => t.status === "pending" || t.status === "overdue")
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .slice(0, 10);
    payload.pendingTasks = pendingTasks;
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
