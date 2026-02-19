import { NextResponse } from "next/server";
import { getTenantKey } from "@/lib/system/tenant";
import { emitOperatorDashboardSignal } from "@/lib/operator/operator-dashboard-signal-emitter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headerTenant(req: Request): string {
  const h = req.headers;
  const t = (h.get("x-xom3-tenant") || h.get("x-tenant-key") || "").trim();
  return t || getTenantKey();
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tenantId = headerTenant(req);
  const type = String(body?.type || "").trim();
  if (type !== "operator.dashboard.viewed" && type !== "operator.dashboard.error") {
    return NextResponse.json({ ok: false, error: "invalid_signal_type" }, { status: 400 });
  }

  const payload = body?.payload || {};
  const priority = type === "operator.dashboard.error" ? "high" : "low";

  emitOperatorDashboardSignal({
    tenantId,
    type,
    priority,
    payload: { ...payload, tenantId },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
