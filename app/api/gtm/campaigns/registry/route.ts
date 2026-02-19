import { NextResponse } from "next/server";
import { gtmCampaigns } from "@/lib/gtm/campaigns";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, campaigns: gtmCampaigns }, { headers: { "Cache-Control": "no-store" } });
}
