import { NextResponse } from "next/server";
import { callN8n } from "@/lib/integrations/n8n-client";
import { getQueue, getStats } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function computeNextPublishAt(items: Array<{ scheduledAt?: string; status: string }>): string | null {
  const scheduled = items
    .filter((i) => i.status === "scheduled" && typeof i.scheduledAt === "string" && Number.isFinite(Date.parse(i.scheduledAt)))
    .map((i) => i.scheduledAt as string)
    .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  return scheduled || null;
}

function localQueueSnapshot(degraded: boolean, degradedReason: string) {
  const items = getQueue();
  const stats = getStats();
  const now = new Date().toISOString();

  return NextResponse.json(
    {
      ok: true,
      timestamp: now,
      total: items.length,
      counts: {
        scheduled: stats.scheduled,
        publishing: items.filter((i) => i.status === "publishing").length,
        failed: stats.failed,
        draft: (stats as any).draft ?? items.filter((i) => i.status === "draft").length,
      },
      nextPublishAt: computeNextPublishAt(items as any),
      items,
      degraded,
      degradedReason,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET() {
  const hookPath = process.env.N8N_WEBHOOK_SOCIAL_QUEUE_PATH;
  if (!hookPath) return localQueueSnapshot(true, "n8n_unconfigured");

  try {
    const json = await callN8n(hookPath);
    return NextResponse.json(json, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return localQueueSnapshot(true, "n8n_unreachable");
  }
}
