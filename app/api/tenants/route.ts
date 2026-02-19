import { NextResponse } from "next/server";
import { getHi5TenantSettings } from "@/lib/system/hi5-settings-store";
import { loadHeartbeat } from "@/lib/system/hi5-heartbeat-store";
import { listRecentGolden } from "@/lib/system/hi5-golden-path-store";
import { getTenantKey, isHi5Enabled } from "@/lib/system/tenant";

// STRIKE 6: v0 stub endpoint (static JSON)
export async function GET() {
  const tenant = getTenantKey();

  const workflowsHb = loadHeartbeat("workflow", tenant);
  const scrapersHb = loadHeartbeat("scraper", tenant);
  const pipeline = listRecentGolden(tenant, 50);

  const workflowErrors = Object.values(workflowsHb.entries || {}).filter((e: any) => String(e?.status || "") === "error").length;
  const scraperErrors = Object.values(scrapersHb.entries || {}).filter((e: any) => String(e?.status || "") === "error").length;
  const pipelineErrors = pipeline.filter((r) => r.lastError).length;

  const { settings } = isHi5Enabled()
    ? await getHi5TenantSettings().catch(() => ({ settings: null as any }))
    : ({ settings: null as any } as any);
  const automationEnabled = settings?.automationEnabled ?? null;
  const lastToggleAt = settings?.updatedAt ?? null;

  return NextResponse.json(
    {
      ok: true,
      tenants: [
        {
          id: tenant,
          name: tenant === "default" ? "Default Tenant" : tenant,
          domain: null,
          status: "active",
          lastSeen: new Date().toISOString(),
          posture: "nominal",
          automation: {
            enabled: Boolean(automationEnabled),
            lastToggleAt,
          },
          health: {
            workflows: Object.keys(workflowsHb.entries || {}).length,
            scrapers: Object.keys(scrapersHb.entries || {}).length,
            errors: workflowErrors + scraperErrors,
          },
          pipelines: {
            recent: pipeline.length,
            errors: pipelineErrors,
          },
        },
      ],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
