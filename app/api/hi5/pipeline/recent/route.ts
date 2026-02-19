import { NextResponse } from "next/server";
import { listRecentGolden } from "@/lib/system/hi5-golden-path-store";
import { getTenantKey } from "@/lib/system/tenant";
import { HI5_ENABLED } from "@/lib/system/hi5-feature";

function tenantKey(): string {
  return getTenantKey();
}

export async function GET(req: Request) {
  if (!HI5_ENABLED) {
    return NextResponse.json(
      { ok: true, hi5Enabled: false, tenant: null, records: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(25, parseInt(url.searchParams.get("limit") || "10")));
  const tenant = (url.searchParams.get("tenant") || tenantKey()).toString().trim() || tenantKey();
  const records = listRecentGolden(tenant, limit);
  return NextResponse.json({ ok: true, tenant, records }, { headers: { "Cache-Control": "no-store" } });
}
