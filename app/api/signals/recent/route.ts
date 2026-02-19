import { NextResponse } from "next/server";
import { listSignals, getSignalsCounts } from "@/lib/signals/signal-store";
import { ensureSignalsBridgeBound } from "@/lib/signals/signal-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  ensureSignalsBridgeBound();
  const url = new URL(req.url);
  const tenantId = (url.searchParams.get("tenantId") || "").trim() || undefined;
  const prefix = (url.searchParams.get("prefix") || "").trim() || undefined;
  const severity = (url.searchParams.get("severity") || "").trim() as any;
  const limit = Number(url.searchParams.get("limit") || "100");

  const items = listSignals({ tenantId, prefix, severity: severity || undefined, limit });
  const counts = getSignalsCounts({ tenantId, prefix });
  return NextResponse.json({ ok: true, counts, items }, { headers: { "Cache-Control": "no-store" } });
}
