import { NextResponse } from "next/server";
import { listBenefitscrmClients } from "@/lib/benefitscrm/benefitscrm-airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const status = url.searchParams.get("status") || "";
    const leadType = url.searchParams.get("leadType") || "";
    const limit = url.searchParams.get("limit") || "50";

    const items = await listBenefitscrmClients({ q, status, leadType, limit: Number(limit) });
    return NextResponse.json(
      { ok: true, total: items.length, items, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "benefitscrm_clients_failed", timestamp: new Date().toISOString() },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
