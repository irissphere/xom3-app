import { NextResponse } from "next/server";

const TENANT_ACTIONS = [
  "toggle_automation",
  "refresh_tenant",
  "reset_errors",
  "flush_pipelines",
  "restart_workflows",
  "restart_scrapers",
] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = String(body?.action || "").trim();
  const payload = body?.payload ?? null;
  if (!action) return NextResponse.json({ ok: false, error: "missing_action" }, { status: 400 });

  const recognized = (TENANT_ACTIONS as readonly string[]).includes(action);

  // STRIKE 9: verbs and routing exist; destructive behavior comes later.
  return NextResponse.json(
    {
      ok: true,
      tenant: id,
      action,
      recognized,
      accepted: true,
      message: recognized
        ? `Tenant action accepted: ${id}:${action}`
        : `Tenant action accepted (unrecognized): ${id}:${action}`,
      payloadEcho: payload,
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
