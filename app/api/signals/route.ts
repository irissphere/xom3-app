import { NextResponse } from "next/server";
import { ensureSignalsBridgeBound } from "@/lib/signals/signal-bridge";
import { listSignals } from "@/lib/signals/signal-store";
import { getTenantKey } from "@/lib/system/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveTenantId(req: Request): string {
  const h = req.headers;
  const v = (h.get("x-xom3-tenant") || h.get("x-tenant-key") || "").trim();
  return v || getTenantKey();
}

type Domain = "intakecrm" | "social" | "revenue-loop" | "other";

function classify(rec: { type: string; payload: any }): Domain {
  const t = String(rec.type || "");
  if (t.startsWith("intakecrm.")) return "intakecrm";
  if (t.startsWith("gtm.")) return "revenue-loop";
  const p = rec.payload;
  if (p && typeof p === "object" && typeof (p as any).signalType === "string") return "social";
  return "other";
}

function parseScope(raw: string | null): Domain[] {
  const s = (raw || "").trim();
  if (!s) return ["intakecrm", "social", "revenue-loop"];
  const parts = s
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  const out: Domain[] = [];
  for (const p of parts) {
    if (p === "intakecrm") out.push("intakecrm");
    else if (p === "social") out.push("social");
    else if (p === "revenue-loop" || p === "revenue_loop" || p === "revenueloop") out.push("revenue-loop");
  }
  return out.length ? out : ["intakecrm", "social", "revenue-loop"];
}

export async function GET(req: Request) {
  ensureSignalsBridgeBound();
  const url = new URL(req.url);
  const tenantId = resolveTenantId(req);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || "50") || 50));
  const scopes = parseScope(url.searchParams.get("scope"));
  const allowOther = url.searchParams.get("includeOther") === "true";

  const raw = listSignals({ tenantId, limit: Math.max(100, limit * 3) });
  const items = raw
    .map((s) => ({ ...s, domain: classify(s as any) }))
    .filter((s) => (allowOther ? true : scopes.includes((s as any).domain)))
    .slice(0, limit);

  return NextResponse.json(
    { ok: true, tenantId, total: items.length, items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
