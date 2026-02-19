// lib/system/airtable.ts
// Minimal Airtable REST client (no dependency on airtable npm package).

export type AirtableRecord<TFields extends Record<string, any> = Record<string, any>> = {
  id: string;
  createdTime?: string;
  fields: TFields;
};

type AirtableListResponse<TFields extends Record<string, any>> = {
  records?: AirtableRecord<TFields>[];
  offset?: string;
};

type AirtableErrorResponse =
  | { error?: { type?: string; message?: string } }
  | { error?: string }
  | { errors?: string[] }
  | Record<string, any>;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function hasAirtableCoreConfig(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

export function getAirtableControlTableName(): string | null {
  return (
    process.env.AIRTABLE_CONTROL_TABLE ||
    // Back-compat with earlier naming in this repo
    process.env.AIRTABLE_TABLE_HI5_SETTINGS ||
    null
  );
}

function airtableBaseId(): string {
  return requireEnv("AIRTABLE_BASE_ID");
}

function airtableControlBaseId(): string {
  // Allow the HI5 control surface table to live in a different base than the cockpit’s main base.
  // This prevents “wrong base” 403/404 confusion when operators keep control tables in Opus/USHA.
  return (process.env.AIRTABLE_CONTROL_BASE_ID || "").trim() || airtableBaseId();
}

function airtableApiKey(): string {
  return requireEnv("AIRTABLE_API_KEY");
}

function airtableHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${airtableApiKey()}`,
    "Content-Type": "application/json",
    accept: "application/json",
  };
}

function tableBaseUrl(tableName: string, baseIdOverride?: string): string {
  const base = (baseIdOverride || "").trim() || airtableBaseId();
  const table = encodeURIComponent(tableName);
  return `https://api.airtable.com/v0/${base}/${table}`;
}

function escapeAirtableFormulaString(value: string): string {
  // Airtable formula string literal uses single quotes. Escape embedded single quotes.
  return value.replace(/'/g, "\\'");
}

function normalizeTextForFormula(value: string): string {
  return value.trim().toLowerCase();
}

function extractAirtableErrorMessage(data: any): string | null {
  if (!data) return null;
  const d = data as AirtableErrorResponse;
  if (typeof (d as any)?.error === "string") return (d as any).error;
  if (Array.isArray((d as any)?.errors) && (d as any).errors.length) return String((d as any).errors[0]);
  const e = (d as any)?.error;
  if (e && typeof e === "object") {
    const type = e.type ? String(e.type) : "";
    const msg = e.message ? String(e.message) : "";
    const combined = [type, msg].filter(Boolean).join(": ");
    return combined || null;
  }
  return null;
}

async function airtableFetchJson<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    const data = (await res.json().catch(() => null)) as T | null;
    const error = res.ok ? null : extractAirtableErrorMessage(data);
    return { ok: res.ok, status: res.status, data, error };
  } catch {
    return { ok: false, status: 0, data: null, error: "network_error" };
  }
}

export async function airtableFindFirstByTextField<TFields extends Record<string, any>>(
  tableName: string,
  fieldName: string,
  fieldValue: string
): Promise<AirtableRecord<TFields> | null> {
  const url = new URL(tableBaseUrl(tableName));
  url.searchParams.set(
    "filterByFormula",
    `{${fieldName}}='${escapeAirtableFormulaString(fieldValue)}'`
  );
  url.searchParams.set("maxRecords", "1");

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  const rec = res.data?.records?.[0];
  return rec?.id ? rec : null;
}

export async function airtableFindFirstByTextFieldVerbose<TFields extends Record<string, any>>(
  tableName: string,
  fieldName: string,
  fieldValue: string
): Promise<{ record: AirtableRecord<TFields> | null; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName));
  url.searchParams.set(
    "filterByFormula",
    `{${fieldName}}='${escapeAirtableFormulaString(fieldValue)}'`
  );
  url.searchParams.set("maxRecords", "1");

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  const rec = res.data?.records?.[0];
  return { record: rec?.id ? rec : null, status: res.status, error: res.error };
}

export async function airtableFindFirstByNormalizedTextFieldVerbose<TFields extends Record<string, any>>(
  tableName: string,
  fieldName: string,
  fieldValue: string
): Promise<{ record: AirtableRecord<TFields> | null; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName));
  const normalized = normalizeTextForFormula(fieldValue);
  url.searchParams.set(
    "filterByFormula",
    `LOWER(TRIM({${fieldName}}))='${escapeAirtableFormulaString(normalized)}'`
  );
  url.searchParams.set("maxRecords", "1");

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  const rec = res.data?.records?.[0];
  return { record: rec?.id ? rec : null, status: res.status, error: res.error };
}

export async function airtableListRecordsByFieldsVerbose<TFields extends Record<string, any>>(
  tableName: string,
  fields: string[],
  maxRecords: number = 3
): Promise<{ records: AirtableRecord<TFields>[]; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName));
  url.searchParams.set("maxRecords", String(Math.max(1, Math.min(maxRecords, 10))));
  for (const f of fields) {
    if (f && f.trim().length) url.searchParams.append("fields[]", f.trim());
  }

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  return { records: res.data?.records || [], status: res.status, error: res.error };
}

export async function airtableCreateRecord<TFields extends Record<string, any>>(
  tableName: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields> | null> {
  const res = await airtableFetchJson<AirtableRecord<TFields>>(tableBaseUrl(tableName), {
    method: "POST",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  });
  return res.ok && res.data?.id ? res.data : null;
}

export async function airtablePatchRecord<TFields extends Record<string, any>>(
  tableName: string,
  recordId: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields> | null> {
  const res = await airtableFetchJson<AirtableRecord<TFields>>(`${tableBaseUrl(tableName)}/${recordId}`, {
    method: "PATCH",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  });
  return res.ok && res.data?.id ? res.data : null;
}

export async function airtableUpsertByTextField<TFields extends Record<string, any>>(
  tableName: string,
  keyFieldName: string,
  keyFieldValue: string,
  fields: Partial<TFields>
): Promise<AirtableRecord<TFields> | null> {
  const existing = await airtableFindFirstByTextField<TFields>(tableName, keyFieldName, keyFieldValue);
  if (!existing) {
    return airtableCreateRecord<TFields>(tableName, { ...(fields as any), [keyFieldName]: keyFieldValue } as Partial<TFields>);
  }
  return airtablePatchRecord<TFields>(tableName, existing.id, fields);
}

export async function airtableUpsertByTextFieldVerbose<TFields extends Record<string, any>>(
  tableName: string,
  keyFieldName: string,
  keyFieldValue: string,
  fields: Partial<TFields>
): Promise<{ record: AirtableRecord<TFields> | null; status: number; error: string | null }> {
  const existing = await airtableFindFirstByTextField<TFields>(tableName, keyFieldName, keyFieldValue);

  if (!existing) {
    const res = await airtableFetchJson<AirtableRecord<TFields>>(tableBaseUrl(tableName), {
      method: "POST",
      headers: airtableHeaders(),
      body: JSON.stringify({ fields: { ...(fields as any), [keyFieldName]: keyFieldValue } }),
    });
    return { record: res.ok && res.data?.id ? res.data : null, status: res.status, error: res.error };
  }

  const res = await airtableFetchJson<AirtableRecord<TFields>>(`${tableBaseUrl(tableName)}/${existing.id}`, {
    method: "PATCH",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields }),
  });
  return { record: res.ok && res.data?.id ? res.data : null, status: res.status, error: res.error };
}

// Convenience wrappers for the HI5 control table (which can live in a separate base)
export async function airtableControlFindFirstByNormalizedTextFieldVerbose<TFields extends Record<string, any>>(
  tableName: string,
  fieldName: string,
  fieldValue: string
): Promise<{ record: AirtableRecord<TFields> | null; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName, airtableControlBaseId()));
  const normalized = normalizeTextForFormula(fieldValue);
  url.searchParams.set(
    "filterByFormula",
    `LOWER(TRIM({${fieldName}}))='${escapeAirtableFormulaString(normalized)}'`
  );
  url.searchParams.set("maxRecords", "1");

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  const rec = res.data?.records?.[0];
  return { record: rec?.id ? rec : null, status: res.status, error: res.error };
}

export async function airtableControlListRecordsByFieldsVerbose<TFields extends Record<string, any>>(
  tableName: string,
  fields: string[],
  maxRecords: number = 3
): Promise<{ records: AirtableRecord<TFields>[]; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName, airtableControlBaseId()));
  url.searchParams.set("maxRecords", String(Math.max(1, Math.min(maxRecords, 10))));
  for (const f of fields) {
    if (f && f.trim().length) url.searchParams.append("fields[]", f.trim());
  }

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  return { records: res.data?.records || [], status: res.status, error: res.error };
}

export async function airtableControlListRecordsVerbose<TFields extends Record<string, any>>(
  tableName: string,
  maxRecords: number = 3
): Promise<{ records: AirtableRecord<TFields>[]; status: number; error: string | null }> {
  const url = new URL(tableBaseUrl(tableName, airtableControlBaseId()));
  url.searchParams.set("maxRecords", String(Math.max(1, Math.min(maxRecords, 10))));

  const res = await airtableFetchJson<AirtableListResponse<TFields>>(url.toString(), {
    method: "GET",
    headers: airtableHeaders(),
  });

  return { records: res.data?.records || [], status: res.status, error: res.error };
}
