import { NextResponse } from "next/server";
import { hasAirtableCoreConfig } from "@/lib/system/airtable";

export async function GET() {
  const startedAt = Date.now();

  const checks: Record<string, { ok: boolean; message: string; ms?: number }> = {};

  const airtableConfigured = hasAirtableCoreConfig();
  checks.airtable = {
    ok: airtableConfigured,
    message: airtableConfigured ? "Airtable configured" : "Airtable missing AIRTABLE_API_KEY/AIRTABLE_BASE_ID",
  };

  const runnerType = process.env.AUTOMATION_RUNNER_TYPE || "stub";
  const n8nUrl = process.env.N8N_BASE_URL || "http://localhost:5678";

  if (runnerType === "n8n-rest") {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${n8nUrl}/healthz`, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      checks.n8n = { ok: res.ok, message: res.ok ? `Connected to n8n at ${n8nUrl}` : `n8n returned ${res.status}`, ms: Date.now() - t0 };
    } catch (e: any) {
      checks.n8n = {
        ok: false,
        message: e?.name === "AbortError" ? "n8n connection timed out" : `Failed to connect to n8n: ${e?.message || "unknown_error"}`,
        ms: Date.now() - t0,
      };
    }
  } else {
    checks.n8n = { ok: true, message: `Automation runner=${runnerType} (n8n not required)` };
  }

  const ok = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok,
      posture: ok ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      checks,
      ms: Date.now() - startedAt,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
