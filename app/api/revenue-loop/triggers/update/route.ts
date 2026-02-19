import { NextResponse } from "next/server";
import { getTenantKey } from "@/lib/system/tenant";
import { ensureRevenueLoopBound, updateRevenueLoopTrigger } from "@/lib/revenue-loop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTenant(req: Request): string {
  const h = req.headers;
  const v = (h.get("x-xom3-tenant") || h.get("x-tenant-key") || "").trim();
  return v || getTenantKey();
}

export async function POST(req: Request) {
  ensureRevenueLoopBound();
  const tenantId = resolveTenant(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const triggerId = typeof body?.triggerId === "string" ? body.triggerId : "";
  const patch = (body?.patch && typeof body.patch === "object" ? body.patch : {}) as any;
  if (!triggerId) return NextResponse.json({ ok: false, error: "triggerId_required" }, { status: 400 });

  const result = updateRevenueLoopTrigger(tenantId, { triggerId, patch });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error, triggers: result.triggers }, { status: 404 });
  return NextResponse.json({ ok: true, tenantId, triggers: result.triggers }, { headers: { "Cache-Control": "no-store" } });
}
