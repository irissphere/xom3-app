import { NextResponse } from "next/server";
import { hasAirtableCoreConfig, getAirtableControlTableName } from "@/lib/system/airtable";
import { getHi5TenantSettings, probeHi5ControlTable } from "@/lib/system/hi5-settings-store";
import { loadHeartbeat } from "@/lib/system/hi5-heartbeat-store";
import { getTenantKey, isHi5Enabled } from "@/lib/system/tenant";
import { HI5_ENABLED } from "@/lib/system/hi5-feature";

function allowDiagnostics(): boolean {
  // By default: enabled in dev, disabled in prod unless explicitly allowed.
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_DIAGNOSTICS === "true";
}

export async function GET(req: Request) {
  if (!allowDiagnostics()) return new NextResponse(null, { status: 404 });

  const url = new URL(req.url);
  const includeEnvKeys = url.searchParams.get("envKeys") === "true";

  const controlTable = getAirtableControlTableName();
  const hasAirtable = hasAirtableCoreConfig() && Boolean(controlTable);

  const tenantKey = getTenantKey();
  const workflowHeartbeat = loadHeartbeat("workflow", tenantKey);
  const scraperHeartbeat = loadHeartbeat("scraper", tenantKey);

  let hi5: Awaited<ReturnType<typeof getHi5TenantSettings>> | null = null;
  let hi5Error: string | null = null;
  let hi5ControlProbe: Awaited<ReturnType<typeof probeHi5ControlTable>> | null = null;

  const hi5GloballyEnabled = HI5_ENABLED && isHi5Enabled();

  try {
    hi5 = hi5GloballyEnabled ? await getHi5TenantSettings() : null;
  } catch (e: any) {
    hi5Error = e?.message || "unknown_error";
  }

  try {
    hi5ControlProbe = hi5GloballyEnabled
      ? await probeHi5ControlTable()
      : { ok: false, status: null, error: "hi5_disabled", sample: [] };
  } catch (e: any) {
    hi5ControlProbe = { ok: false, status: 0, error: e?.message || "probe_error", sample: [] };
  }

  const envKeyFilter = (k: string) =>
    k.startsWith("AIRTABLE_") ||
    k.startsWith("HI5_") ||
    k.startsWith("TENANT_") ||
    k.startsWith("VERCEL") ||
    k.startsWith("NEXT_PUBLIC_");

  return NextResponse.json(
    {
      ok: true,
      timestamp: new Date().toISOString(),
      tenantKey,
      runtime: {
        nodeEnv: process.env.NODE_ENV || "unknown",
        vercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV || null,
        vercelUrl: process.env.VERCEL_URL || null,
      },
      airtable: {
        configured: hasAirtable,
        hasApiKey: !!process.env.AIRTABLE_API_KEY,
        hasBaseId: !!process.env.AIRTABLE_BASE_ID,
        hasControlTable: !!controlTable,
        controlTable: controlTable || null,
        // USHA health is separate in this repo but useful to expose as a boolean
        hasUshaBaseId: !!process.env.AIRTABLE_USHA_BASE_ID,
      },
      hi5: {
        enabled: hi5GloballyEnabled,
        tenantKey,
        source: hi5?.source || "none",
        recordFound: Boolean(hi5?.settings),
        settings: hi5?.settings || null,
        error: hi5Error,
        controlProbe: hi5ControlProbe,
        fieldOverrides: {
          tenant: process.env.HI5_CONTROL_FIELD_TENANT || null,
          automationEnabled: process.env.HI5_CONTROL_FIELD_AUTOMATION_ENABLED || null,
          plan: process.env.HI5_CONTROL_FIELD_PLAN || null,
          updatedAt: process.env.HI5_CONTROL_FIELD_UPDATED_AT || null,
        },
      },
      heartbeats: {
        workflows: workflowHeartbeat,
        scrapers: scraperHeartbeat,
      },
      env: includeEnvKeys
        ? {
            keys: Object.keys(process.env).filter(envKeyFilter).sort(),
          }
        : undefined,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
