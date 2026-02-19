import { NextResponse } from "next/server";
import { loadHeartbeat, upsertHeartbeatEntry, type HeartbeatStatus } from "@/lib/system/hi5-heartbeat-store";
import { getTenantKey } from "@/lib/system/tenant";

function allowWrites(req: Request): boolean {
  // Allow in dev by default. In prod require explicit opt-in.
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.ALLOW_HEARTBEAT_WRITE !== "true") return false;

  const token = process.env.HEARTBEAT_TOKEN;
  if (!token) return true; // opt-in without token

  const supplied =
    req.headers.get("x-hi5-heartbeat-token") ||
    new URL(req.url).searchParams.get("token");
  return supplied === token;
}

function tenantKey(): string {
  return getTenantKey();
}

export async function GET() {
  const tenant = tenantKey();
  const snapshot = loadHeartbeat("workflow", tenant);
  return NextResponse.json({ ok: true, tenant, snapshot }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!allowWrites(req)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tenant = (body?.tenant || tenantKey()).toString().trim() || tenantKey();
  const key = (body?.key || body?.workflowKey || "").toString().trim();
  if (!key) return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });

  const status = (body?.status || "unknown") as HeartbeatStatus;
  const update = {
    status,
    label: body?.label ? String(body.label) : undefined,
    lastRunAt: body?.lastRunAt ? String(body.lastRunAt) : undefined,
    lastSuccessAt: body?.lastSuccessAt ? String(body.lastSuccessAt) : undefined,
    lastErrorAt: body?.lastErrorAt ? String(body.lastErrorAt) : undefined,
    lastError: body?.lastError ? String(body.lastError).slice(0, 500) : undefined,
  };

  const snapshot = upsertHeartbeatEntry("workflow", tenant, key, update);
  return NextResponse.json({ ok: true, tenant, snapshot }, { headers: { "Cache-Control": "no-store" } });
}
