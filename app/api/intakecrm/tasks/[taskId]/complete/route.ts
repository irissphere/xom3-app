import { NextResponse } from "next/server";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getTaskById, updateTask } from "@/lib/intakecrm/tasks/intakecrm-task-store";
import { appendTimelineEvent } from "@/lib/intakecrm/store/intakecrm-store";
import { emitIntakecrmSignal } from "@/lib/intakecrm/intakecrm-signal-emitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(c.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const existing = getTaskById(c.tenant, taskId);
  if (!existing) return NextResponse.json({ ok: false, error: "task_not_found" }, { status: 404 });

  const completedAt = new Date().toISOString();
  const next = updateTask(c.tenant, taskId, { status: "completed", completedAt });
  if (!next) return NextResponse.json({ ok: false, error: "task_update_failed" }, { status: 500 });

  appendTimelineEvent(c.tenant, next.leadId, { type: "intakecrm.task.completed", payload: { taskId: next.taskId, taskType: next.type } });

  emitIntakecrmSignal({
    tenantId: c.tenant,
    type: "intakecrm.task.completed",
    priority: "medium",
    payload: { leadId: next.leadId, taskId: next.taskId, taskType: next.type },
  });

  return NextResponse.json({ ok: true, tenantId: c.tenant, task: next }, { headers: { "Cache-Control": "no-store" } });
}
