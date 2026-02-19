import { NextResponse } from "next/server";
import { emitSignal } from "@/lib/uoi/signals";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getIntakecrmTask, patchIntakecrmTask } from "@/lib/intakecrm/intakecrm-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeText(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await ctx.params;
  const c = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(c.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const existing = getIntakecrmTask(c.tenant, taskId);
  if (!existing) return NextResponse.json({ ok: false, error: "task_not_found" }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const status = normalizeText(body?.status);
  const assignedTo = normalizeText(body?.assignedTo);
  const dueAt = normalizeText(body?.dueAt);
  const notes = normalizeText(body?.notes);

  const isCompleting = status === "completed" && existing.status !== "completed";
  const completedAt = isCompleting ? new Date().toISOString() : existing.completedAt;

  const next = patchIntakecrmTask(c.tenant, taskId, {
    status: (status as any) || existing.status,
    assignedTo: assignedTo ?? existing.assignedTo,
    dueAt: dueAt ?? existing.dueAt,
    notes: notes ?? existing.notes,
    completedAt,
  });
  if (!next) return NextResponse.json({ ok: false, error: "task_update_failed" }, { status: 500 });

  emitSignal({
    source: "intakecrm",
    type: isCompleting ? "intakecrm.task.completed" : "intakecrm.task.updated",
    priority: isCompleting ? "medium" : "low",
    payload: { tenant: c.tenant, leadId: next.leadId, taskId: next.taskId, status: next.status },
  });

  return NextResponse.json({ ok: true, tenant: c.tenant, task: next }, { headers: { "Cache-Control": "no-store" } });
}
