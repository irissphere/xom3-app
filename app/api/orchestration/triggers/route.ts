import { NextResponse } from "next/server";
import { getTenantKey } from "@/lib/system/tenant";
import { ensureOrchestrationBound, listOrchestrationTriggers } from "@/lib/orchestration";
import { ensureSignalsBridgeBound } from "@/lib/signals/signal-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTenant(req: Request): string {
  const h = req.headers;
  const v = (h.get("x-xom3-tenant") || h.get("x-tenant-key") || "").trim();
  return v || getTenantKey();
}

export async function GET(req: Request) {
  ensureSignalsBridgeBound();
  ensureOrchestrationBound();
  const tenantId = resolveTenant(req);
  const triggers = listOrchestrationTriggers(tenantId);
  return NextResponse.json({ ok: true, tenantId, triggers }, { headers: { "Cache-Control": "no-store" } });
}
