import { NextResponse } from "next/server";
import { ensureGtmFunnelsBound, gtmFunnels, listFunnelEntities } from "@/lib/gtm/funnels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureGtmFunnelsBound();
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(800, Number(limitParam) || 400)) : 400;
  const entities = listFunnelEntities(limit);

  const stageCounts: Record<string, number> = {};
  for (const e of entities) {
    const k = `${e.funnelId}:${e.stageId}`;
    stageCounts[k] = (stageCounts[k] || 0) + 1;
  }

  const funnels = gtmFunnels.map((f) => ({
    id: f.id,
    name: f.name,
    stages: f.stages.map((s) => ({
      stageId: s.stageId,
      name: s.name,
      count: stageCounts[`${f.id}:${s.stageId}`] || 0,
    })),
  }));

  return NextResponse.json({ ok: true, funnels, entityCount: entities.length }, { headers: { "Cache-Control": "no-store" } });
}
