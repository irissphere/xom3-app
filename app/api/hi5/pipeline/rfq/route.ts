import { NextResponse } from "next/server";
import { updateGoldenRecord } from "@/lib/system/hi5-golden-path-store";
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
  const id = (body?.id || body?.pipelineId || "").toString().trim();
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });

  const record = updateGoldenRecord(tenant, id, {
    step: "rfq_generated",
    rfqStatus: body?.rfqStatus ?? "generated",
    assignedVendor: body?.assignedVendor ?? null,
    lastError: null,
  });

  if (!record) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const rfqWebhook = process.env.HI5_N8N_RFQ_WEBHOOK_URL;
  const webhook = rfqWebhook
    ? await triggerWebhook(rfqWebhook, { tenant, pipelineId: id, ...body })
    : { ok: false, status: 0 };

  return NextResponse.json(
    {
      ok: true,
      tenant,
      record,
      webhook: {
        configured: Boolean(rfqWebhook),
        triggered: webhook.ok,
        status: rfqWebhook ? webhook.status : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
