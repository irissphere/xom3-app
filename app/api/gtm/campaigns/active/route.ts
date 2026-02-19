import { NextResponse } from "next/server";
import { ensureGtmCampaignsBound, listCampaignInstances, gtmCampaigns } from "@/lib/gtm/campaigns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  ensureGtmCampaignsBound();
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(300, Number(limitParam) || 120)) : 120;

  const instances = listCampaignInstances(limit);
  const active = instances.filter((i) => i.status === "active");
  const byCampaign = Object.fromEntries(
    gtmCampaigns.map((c) => [
      c.id,
      {
        campaignId: c.id,
        name: c.name,
        activeCount: active.filter((x) => x.campaignId === c.id).length,
        totalCount: instances.filter((x) => x.campaignId === c.id).length,
      },
    ])
  );

  return NextResponse.json(
    {
      ok: true,
      activeCount: active.length,
      instances,
      byCampaign,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
