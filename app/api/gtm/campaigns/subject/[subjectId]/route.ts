import { NextResponse } from "next/server";
import { ensureGtmCampaignsBound, listCampaignInstancesForSubject } from "@/lib/gtm/campaigns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ subjectId: string }> }) {
  ensureGtmCampaignsBound();
  const { subjectId } = await ctx.params;
  const instances = listCampaignInstancesForSubject(String(subjectId || ""));
  return NextResponse.json({ ok: true, instances, count: instances.length }, { headers: { "Cache-Control": "no-store" } });
}
