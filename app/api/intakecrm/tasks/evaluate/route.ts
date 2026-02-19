import { NextResponse } from "next/server";
import { resolveIntakecrmContext, requireIntakecrmWriteAccess } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { evaluateTenantSla } from "@/lib/intakecrm/sla/intakecrm-sla-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = resolveIntakecrmContext(req);
  const access = requireIntakecrmWriteAccess(ctx.actor);
  if (!access.ok) {
    const error = "error" in access ? access.error : "forbidden";
    return NextResponse.json({ ok: false, error }, { status: 403 });
  }

  const res = evaluateTenantSla(ctx.tenant);
  return NextResponse.json({ ok: true, tenantId: ctx.tenant, ...res }, { headers: { "Cache-Control": "no-store" } });
}
