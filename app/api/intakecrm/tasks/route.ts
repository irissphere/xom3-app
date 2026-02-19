import { NextResponse } from "next/server";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { getTasksByTenant } from "@/lib/intakecrm/tasks/intakecrm-task-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const url = new URL(req.url);
  const leadId = (url.searchParams.get("leadId") || "").trim();
  const status = (url.searchParams.get("status") || "").trim().toLowerCase();
  const assignedTo = (url.searchParams.get("assignedTo") || "").trim();

  let items = getTasksByTenant(ctx.tenant);
  if (leadId) items = items.filter((t) => t.leadId === leadId);
  if (status) items = items.filter((t) => t.status === (status as any));
  if (assignedTo) items = items.filter((t) => (t.assignedTo || "") === assignedTo);
  items = items.slice().sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return NextResponse.json(
    { ok: true, tenantId: ctx.tenant, total: items.length, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
