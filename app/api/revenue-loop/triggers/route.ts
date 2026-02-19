import { NextResponse } from "next/server";
import { callN8n } from "@/lib/integrations/n8n-client";
import { getTenantKey } from "@/lib/system/tenant";
import { ensureRevenueLoopBound, listRevenueLoopTriggers } from "@/lib/revenue-loop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function envBool(name: string, defaultValue: boolean): boolean {
  const raw = (process.env[name] || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return defaultValue;
}

function localTriggersSnapshot(tenant: string) {
  ensureRevenueLoopBound();
  const items = listRevenueLoopTriggers(tenant);
  return {
    ok: true,
    tenant,
    items,
    total: items.length,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenant = (url.searchParams.get("tenant") || getTenantKey()).toString().trim() || getTenantKey();

  const preferN8n = envBool("REVENUE_LOOP_TRIGGERS_PREFER_N8N", true);
  const hookPath = process.env.N8N_WEBHOOK_REVENUE_TRIGGERS_PATH;

  if (preferN8n && hookPath) {
    try {
      const json = await callN8n(hookPath);
      return NextResponse.json(json, { headers: { "Cache-Control": "no-store" } });
    } catch {
      // fall through
    }
  }

  const degradedReason = hookPath ? (preferN8n ? "n8n_unreachable" : "n8n_bypassed") : "n8n_unconfigured";
  return NextResponse.json(
    { ...localTriggersSnapshot(tenant), degraded: true, degradedReason },
    { headers: { "Cache-Control": "no-store" } }
  );
}
