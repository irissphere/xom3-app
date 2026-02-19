import type { Hi5Features, Hi5Plan } from "./hi5-subscription";
import {
  airtableFindFirstByTextField,
  airtableFindFirstByTextFieldVerbose,
  airtableControlFindFirstByNormalizedTextFieldVerbose,
  airtableControlListRecordsVerbose,
  airtableUpsertByTextFieldVerbose,
  getAirtableControlTableName,
  hasAirtableCoreConfig,
} from "./airtable";
import { getTenantKey as getPrimaryTenantKey, isHi5Enabled } from "./tenant";

export type Hi5TenantSettings = {
  tenant: string;
  automationEnabled: boolean | null;
  plan: Hi5Plan | null;
  features: Hi5Features | null;
  updatedAt?: string;
};

// Never default to "hi5" implicitly — that causes accidental base/table writes.
const DEFAULT_TENANT = "default";
const DEFAULT_TENANT_FIELD = "Tenant";
const DEFAULT_AUTOMATION_FIELD = "automation_enabled";
const DEFAULT_PLAN_FIELD = "plan";
const DEFAULT_UPDATED_AT_FIELD = "updated_at";

function getTenantFieldName(): string {
  // Prefer explicit config, but default to "Tenant" (matches the cockpit docs/UI),
  // while still supporting legacy "tenant".
  const raw = (process.env.HI5_CONTROL_FIELD_TENANT || DEFAULT_TENANT_FIELD).trim();
  return raw || DEFAULT_TENANT_FIELD;
}

function getAutomationFieldName(): string {
  return (process.env.HI5_CONTROL_FIELD_AUTOMATION_ENABLED || DEFAULT_AUTOMATION_FIELD).trim() || DEFAULT_AUTOMATION_FIELD;
}

function getPlanFieldName(): string {
  return (process.env.HI5_CONTROL_FIELD_PLAN || DEFAULT_PLAN_FIELD).trim() || DEFAULT_PLAN_FIELD;
}

function getUpdatedAtFieldName(): string {
  return (process.env.HI5_CONTROL_FIELD_UPDATED_AT || DEFAULT_UPDATED_AT_FIELD).trim() || DEFAULT_UPDATED_AT_FIELD;
}

function isUnknownFieldError(err: string | null | undefined): boolean {
  if (!err) return false;
  const e = err.toLowerCase();
  return (
    e.includes("unknown field") ||
    e.includes("unknown field name") ||
    e.includes("unknown_field") ||
    e.includes("unknown_field_name")
  );
}

function extractUnknownFieldName(err: string | null | undefined): string | null {
  if (!err) return null;
  // Common Airtable shape: "UNKNOWN_FIELD_NAME: Unknown field name: \"updated_at\""
  const m =
    err.match(/unknown field name:\s*["']?([^"']+)["']?/i) ||
    err.match(/unknown field\s*[:=]\s*["']?([^"']+)["']?/i);
  return m?.[1]?.trim() || null;
}

function getTenantKey(): string {
  // If HI5 is enabled, allow explicit HI5 tenant override; otherwise use the primary tenant.
  const raw = (process.env.HI5_TENANT_KEY || "").trim();
  if (isHi5Enabled() && raw) return raw;
  return getPrimaryTenantKey() || DEFAULT_TENANT;
}

function hasAirtableConfig(): boolean {
  return hasAirtableCoreConfig() && Boolean(getAirtableControlTableName());
};

function getControlTable(): string | null {
  return getAirtableControlTableName();
}

function parseBoolish(v: any): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
    if (["enabled", "enable"].includes(s)) return true;
    if (["disabled", "disable"].includes(s)) return false;
    if (["checked", "check", "x"].includes(s)) return true;
    if (["unchecked", "uncheck"].includes(s)) return false;
  }
  return null;
}

function parsePlan(v: any): Hi5Plan | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s === "core" || s === "pro" || s === "custom" || s === "trial" ? (s as Hi5Plan) : null;
}

function parseFeatures(fields: any): Hi5Features | null {
  if (!fields || typeof fields !== "object") return null;

  const leadIntake = parseBoolish(fields.lead_intake);
  const vendorRFQ = parseBoolish(fields.vendor_rfq);
  const responsePositioning = parseBoolish(fields.response_positioning);
  const linkedin = parseBoolish(fields.scraper_linkedin);
  const twitter = parseBoolish(fields.scraper_twitter);
  const instagram = parseBoolish(fields.scraper_instagram);

  const hasAny =
    leadIntake !== null ||
    vendorRFQ !== null ||
    responsePositioning !== null ||
    linkedin !== null ||
    twitter !== null ||
    instagram !== null;

  if (!hasAny) return null;

  return {
    leadIntake: leadIntake ?? false,
    vendorRFQ: vendorRFQ ?? false,
    responsePositioning: responsePositioning ?? false,
    scrapers: {
      linkedin: linkedin ?? false,
      twitter: twitter ?? false,
      instagram: instagram ?? false,
    },
  };
}

function coerceTenantSettings(tenant: string, fields: any): Hi5TenantSettings {
  const automationField = getAutomationFieldName();
  const planField = getPlanFieldName();
  const updatedAtField = getUpdatedAtFieldName();

  // Be tolerant of legacy/alternate column names (read-path only).
  const automationEnabled = parseBoolish(
    fields?.[automationField] ??
      fields?.automation_enabled ??
      fields?.automationEnabled ??
      fields?.enabled ??
      fields?.["Automation Enabled"]
  );
  const plan = parsePlan(fields?.[planField] ?? fields?.plan ?? fields?.Plan);
  const features = parseFeatures(fields);
  return {
    tenant,
    automationEnabled,
    plan,
    features,
    updatedAt: typeof (fields?.[updatedAtField] ?? fields?.updated_at) === "string"
      ? (fields?.[updatedAtField] ?? fields?.updated_at)
      : undefined,
  };
}

async function airtableUpsertAutomationEnabled(tenant: string, enabled: boolean): Promise<Hi5TenantSettings | null> {
  const table = getControlTable();
  if (!table) return null;

  const tenantField = getTenantFieldName();
  const automationField = getAutomationFieldName();
  const updatedAtField = getUpdatedAtFieldName();

  const firstAttempt = await airtableUpsertByTextFieldVerbose<any>(table, tenantField, tenant, {
    [automationField]: enabled,
    [updatedAtField]: new Date().toISOString(),
  } as any);

  if (firstAttempt.record) return coerceTenantSettings(tenant, firstAttempt.record.fields || {});

  // Common failure: `updated_at` field doesn't exist in the table.
  // Retry without updatedAt rather than failing the entire write path.
  const err = (firstAttempt.error || "").toLowerCase();
  if (err.includes("unknown field") || err.includes("unknown field name") || err.includes("cannot create field")) {
    const retry = await airtableUpsertByTextFieldVerbose<any>(table, tenantField, tenant, {
      [automationField]: enabled,
    } as any);
    if (retry.record) return coerceTenantSettings(tenant, retry.record.fields || {});
  }

  return null;
}

async function airtableGetTenantSettings(tenant: string): Promise<Hi5TenantSettings | null> {
  const table = getControlTable();
  if (!table) return null;

  const tenantField = getTenantFieldName();

  // 1) Primary attempt: configured tenant field
  const primary = await airtableControlFindFirstByNormalizedTextFieldVerbose<any>(table, tenantField, tenant);
  if (primary.record) return coerceTenantSettings(tenant, primary.record.fields || {});

  // 2) If the configured field is wrong (common), fall back to legacy + canonical
  // while keeping the read-path tolerant.
  const fallbackFields = Array.from(new Set(["Tenant", "tenant"])).filter(f => f !== tenantField);
  for (const f of fallbackFields) {
    const res = await airtableControlFindFirstByNormalizedTextFieldVerbose<any>(table, f, tenant);
    if (res.record) return coerceTenantSettings(tenant, res.record.fields || {});
  }

  // No record found (or query error). Caller diagnostics will surface null settings.
  return null;
}

export async function probeHi5ControlTable(): Promise<{
  ok: boolean;
  status: number | null;
  error: string | null;
  sample: { id: string; Tenant?: any; tenant?: any }[];
}> {
  const table = getControlTable();
  if (!hasAirtableConfig() || !table) {
    return { ok: false, status: null, error: "airtable_not_configured", sample: [] };
  }

  // Do NOT pass fields[]=... here. Airtable will 422 if ANY field name is unknown.
  // We just want to confirm the table is reachable and show a tiny sample.
  const res = await airtableControlListRecordsVerbose<any>(table, 3);
  return {
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    error: res.error,
    sample: (res.records || []).map(r => ({
      id: r.id,
      Tenant: (r.fields as any)?.Tenant,
      tenant: (r.fields as any)?.tenant,
    })),
  };
}

export async function getHi5TenantSettings(): Promise<{
  settings: Hi5TenantSettings | null;
  source: "airtable" | "none";
}> {
  // If HI5 is not enabled, do not touch the control table at all.
  // This prevents accidental writes/reads against a non-HI5 base.
  if (!isHi5Enabled()) return { settings: null, source: "none" };

  const tenant = getTenantKey();

  if (hasAirtableConfig()) {
    const settings = await airtableGetTenantSettings(tenant);
    return { settings, source: "airtable" };
  }

  return { settings: null, source: "none" };
}

export async function getHi5AutomationEnabled(): Promise<{ enabled: boolean | null; source: "airtable" | "none" }> {
  const { settings, source } = await getHi5TenantSettings();
  return { enabled: settings?.automationEnabled ?? null, source };
}

export async function setHi5AutomationEnabled(
  enabled: boolean
): Promise<{
  settings: Hi5TenantSettings | null;
  source: "airtable" | "none";
  write?: { ok: boolean; status: number; error: string | null };
}> {
  // Hard gate: if HI5 is not enabled, never write.
  if (!isHi5Enabled()) {
    return { settings: null, source: "none", write: { ok: false, status: 0, error: "hi5_disabled" } };
  }

  const tenant = getTenantKey();

  if (hasAirtableConfig()) {
    const table = getControlTable();
    if (!table) return { settings: null, source: "none" };

    const tenantField = getTenantFieldName();
    const automationField = getAutomationFieldName();
    const updatedAtField = getUpdatedAtFieldName();

    const firstAttempt = await airtableUpsertByTextFieldVerbose<any>(table, tenantField, tenant, {
      [automationField]: enabled,
      [updatedAtField]: new Date().toISOString(),
    } as any);

    if (firstAttempt.record) {
      return {
        settings: coerceTenantSettings(tenant, firstAttempt.record.fields || {}),
        source: "airtable",
        write: { ok: true, status: firstAttempt.status, error: null },
      };
    }

    // If Airtable complains about a missing field, figure out WHICH field and only retry when it's the updatedAt field.
    if (isUnknownFieldError(firstAttempt.error)) {
      const unknownField = extractUnknownFieldName(firstAttempt.error);
      // Most common: `updated_at` isn't present in the table. Retry without it.
      if (!unknownField || unknownField === updatedAtField || unknownField === DEFAULT_UPDATED_AT_FIELD) {
        const retry = await airtableUpsertByTextFieldVerbose<any>(table, "tenant", tenant, {
          [automationField]: enabled,
        } as any);
        if (retry.record) {
          return {
            settings: coerceTenantSettings(tenant, retry.record.fields || {}),
            source: "airtable",
            write: { ok: true, status: retry.status, error: null },
          };
        }
        return { settings: null, source: "airtable", write: { ok: false, status: retry.status, error: retry.error } };
      }

      // Next most common: someone set HI5_CONTROL_FIELD_AUTOMATION_ENABLED to a display label
      // (or wrong casing/underscores) that doesn't match the Airtable field key.
      // If Airtable says the automation field is unknown, retry using the default field name.
      if (unknownField === automationField && automationField !== DEFAULT_AUTOMATION_FIELD) {
        const retry = await airtableUpsertByTextFieldVerbose<any>(table, tenantField, tenant, {
          [DEFAULT_AUTOMATION_FIELD]: enabled,
        } as any);
        if (retry.record) {
          return {
            settings: coerceTenantSettings(tenant, retry.record.fields || {}),
            source: "airtable",
            write: { ok: true, status: retry.status, error: null },
          };
        }
        return { settings: null, source: "airtable", write: { ok: false, status: retry.status, error: retry.error } };
      }
    }

    return { settings: null, source: "airtable", write: { ok: false, status: firstAttempt.status, error: firstAttempt.error } };
  }

  return { settings: null, source: "none", write: { ok: false, status: 0, error: "persistence_not_configured" } };
}
