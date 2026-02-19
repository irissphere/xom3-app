import { NextResponse } from "next/server";
import { getBenefitscrmStatus } from "@/lib/benefitscrm/benefitscrm-airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBenefitscrmStatus();
    return NextResponse.json(
      { ok: true, data, timestamp: new Date().toISOString(), degraded: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    const msg = e?.message || "benefitscrm_status_failed";

    // Degraded-safe posture: keep cockpit surfaces alive even when Airtable is missing/misconfigured.
    return NextResponse.json(
      {
        ok: true,
        degraded: true,
        degradedReason: "airtable_unavailable",
        error: msg,
        timestamp: new Date().toISOString(),
        data: {
          posture: "degraded",
          lastSync: null,
          counts: {
            clients: 0,
            byStatus: {},
            byLeadType: {},
            followups: { total: 0, pending: 0, overdue: 0, completed: 0 },
            eligibility: { total: 0, pending: 0, verified: 0, denied: 0, needsInfo: 0, avgMinutes: null },
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
