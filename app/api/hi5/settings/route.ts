import { NextResponse } from "next/server";
import { getHi5TenantSettings } from "@/lib/system/hi5-settings-store";
import { getAirtableControlTableName, hasAirtableCoreConfig } from "@/lib/system/airtable";
import { HI5_ENABLED } from "@/lib/system/hi5-feature";

function hasAirtableConfig(): boolean {
  return hasAirtableCoreConfig() && Boolean(getAirtableControlTableName());
}

export async function GET() {
  if (!HI5_ENABLED) {
    return NextResponse.json({
      configured: false,
      source: "disabled",
      tenant: null,
      enabled: false,
      plan: null,
      features: null,
      updatedAt: null,
      hi5Enabled: false,
    });
  }

  const result = await getHi5TenantSettings();

  return NextResponse.json({
    configured: hasAirtableConfig(),
    source: result.source,
    tenant: result.settings?.tenant ?? null,
    enabled: result.settings?.automationEnabled ?? null,
    plan: result.settings?.plan ?? null,
    features: result.settings?.features ?? null,
    updatedAt: result.settings?.updatedAt ?? null,
  });
}
