import { NextResponse } from "next/server";
import { getTenantKey } from "@/lib/system/tenant";
import { hasAirtableCoreConfig, getAirtableControlTableName } from "@/lib/system/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Posture = "OK" | "Missing" | "Error" | "Degraded";

function resolveTenantId(req: Request): string {
  const h = req.headers;
  const v = (h.get("x-xom3-tenant") || h.get("x-tenant-key") || "").trim();
  return v || getTenantKey();
}

function postureRow(input: { key: string; label: string; posture: Posture; detail?: string | null }) {
  return { key: input.key, label: input.label, posture: input.posture, detail: input.detail || null };
}

function envPresent(name: string): boolean {
  return Boolean(String(process.env[name] || "").trim());
}

function socialTokensConnected(): { posture: Posture; detail: string | null } {
  const tokens = [
    "TWITTER_ACCESS_TOKEN",
    "INSTAGRAM_ACCESS_TOKEN",
    "YOUTUBE_ACCESS_TOKEN",
    "LINKEDIN_ACCESS_TOKEN",
    "FACEBOOK_ACCESS_TOKEN",
    "TIKTOK_ACCESS_TOKEN",
  ];
  const present = tokens.filter(envPresent);
  if (present.length === 0) return { posture: "Missing", detail: "no platform tokens found" };
  return { posture: "OK", detail: `${present.length} token(s) present` };
}

export async function GET(req: Request) {
  const tenantId = resolveTenantId(req);
  const timestamp = new Date().toISOString();

  const airtableConfigured = hasAirtableCoreConfig();
  const controlTable = getAirtableControlTableName();

  const n8nBase = String(process.env.N8N_BASE_URL || "").trim();
  const n8nKey = String(process.env.N8N_API_KEY || "").trim();

  const social = socialTokensConnected();

  const posture = [
    postureRow({
      key: "airtable",
      label: "Airtable config",
      posture: airtableConfigured ? (controlTable ? "OK" : "Degraded") : "Missing",
      detail: airtableConfigured ? (controlTable ? "base+control configured" : "base configured, control table missing") : "AIRTABLE_API_KEY/AIRTABLE_BASE_ID missing",
    }),
    postureRow({
      key: "n8n",
      label: "n8n config",
      posture: n8nBase ? (n8nKey ? "OK" : "Degraded") : "Missing",
      detail: n8nBase ? (n8nKey ? "base+api key present" : "N8N_BASE_URL present, N8N_API_KEY missing") : "N8N_BASE_URL missing",
    }),
    postureRow({ key: "social_tokens", label: "Social tokens", posture: social.posture, detail: social.detail }),
    postureRow({ key: "intakecrm", label: "intakecrm enabled", posture: "OK", detail: null }),
    postureRow({ key: "social_sovereign", label: "Social Posting sovereign", posture: "OK", detail: null }),
    postureRow({ key: "revenue_loop", label: "Revenue Loop enabled", posture: "OK", detail: null }),
  ];

  return NextResponse.json({ ok: true, tenantId, timestamp, posture }, { headers: { "Cache-Control": "no-store" } });
}
