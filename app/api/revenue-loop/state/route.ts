import { NextResponse } from "next/server";
import { callN8n } from "@/lib/integrations/n8n-client";
import { getRecentOutboundItems } from "@/lib/gtm/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function minIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function localRevenueLoopState(limit: number) {
  const items = getRecentOutboundItems(limit);

  const counts = { queued: 0, sending: 0, sent: 0, failed: 0 };
  let lastTriggeredAt: string | null = null;
  let lastAutoPostAt: string | null = null;
  let nextScheduledAt: string | null = null;

  for (const i of items) {
    if ((counts as any)[i.status] !== undefined) (counts as any)[i.status] += 1;
    lastTriggeredAt = lastTriggeredAt || i.createdAt || null;
    if (i.status === "sent") lastAutoPostAt = lastAutoPostAt || i.updatedAt || i.createdAt || null;
    if (i.status === "queued" && i.scheduledAt) nextScheduledAt = minIso(nextScheduledAt, i.scheduledAt);
  }

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    counts,
    lastTriggeredAt,
    lastAutoPostAt,
    nextScheduledAt,
    sample: items.slice(0, 12),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(10, Math.min(200, Number(url.searchParams.get("limit") || "60") || 60));

  const hookPath = process.env.N8N_WEBHOOK_REVENUE_STATE_PATH;
  if (hookPath) {
    try {
      const json = await callN8n(hookPath);
      return NextResponse.json(json, { headers: { "Cache-Control": "no-store" } });
    } catch {
      // fall through
    }
  }

  const degradedReason = hookPath ? "n8n_unreachable" : "n8n_unconfigured";
  return NextResponse.json(
    { ...localRevenueLoopState(limit), degraded: true, degradedReason },
    { headers: { "Cache-Control": "no-store" } }
  );
}
