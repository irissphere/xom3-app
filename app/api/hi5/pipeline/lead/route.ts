import { NextResponse } from "next/server";
import { createGoldenLead } from "@/lib/system/hi5-golden-path-store";
import { getTenantKey } from "@/lib/system/tenant";
import { HI5_ENABLED } from "@/lib/system/hi5-feature";

function tenantKey(): string {
  return getTenantKey();
}

async function triggerWebhook(url: string, payload: any): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function POST(req: Request) {
  if (!HI5_ENABLED) {
    return NextResponse.json({ ok: false, error: "hi5_disabled" }, { status: 403 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tenant = (body?.tenant || tenantKey()).toString().trim() || tenantKey();
  const record = createGoldenLead(tenant, {
    name: body?.name,
    email: body?.email,
    phone: body?.phone,
    company: body?.company,
    message: body?.message,
    source: body?.source,
  } as any);

  // Optional: trigger n8n lead intake webhook if configured
  const leadWebhook = process.env.HI5_N8N_LEAD_INTAKE_WEBHOOK_URL;
  const webhook = leadWebhook
    ? await triggerWebhook(leadWebhook, { tenant, pipelineId: record.id, ...body })
    : { ok: false, status: 0 };

  return NextResponse.json(
    {
      ok: true,
      tenant,
      record,
      webhook: {
        configured: Boolean(leadWebhook),
        triggered: webhook.ok,
        status: leadWebhook ? webhook.status : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
