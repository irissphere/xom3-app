"use client";

import type { OperatorDashboardContext } from "../page";
import { fetchOperatorTenantConfigPosture } from "@/lib/operator/operator-dashboard-fetch";
import { OperatorPanelFrame, PanelError, PostureChip, useOperatorPanel } from "./OperatorDashboardPanelKit";

type TenantPostureOk = Extract<Awaited<ReturnType<typeof fetchOperatorTenantConfigPosture>>, { ok: true }>;
type TenantPostureData = TenantPostureOk["data"];

async function load(ctx: OperatorDashboardContext): Promise<TenantPostureData> {
  const res = await fetchOperatorTenantConfigPosture(ctx.headers);
  if (!res.ok) throw new Error("error" in res ? res.error : "tenant_config_load_failed");
  return res.data;
}

function chipTone(p: string) {
  if (p === "OK") return "ok" as const;
  if (p === "Missing") return "missing" as const;
  if (p === "Error") return "error" as const;
  if (p === "Degraded") return "degraded" as const;
  return "neutral" as const;
}

export default function TenantConfigPanel(props: { ctx: OperatorDashboardContext }) {
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "tenant_config",
    refreshMs: 8000,
    load,
  });

  const rows = state.data?.posture || [];

  return (
    <OperatorPanelFrame title="Tenant Config Posture" hint={`tenant=${props.ctx.tenant} • checks=${rows.length || 0}`}>
      {state.error ? <PanelError label="Tenant config degraded" error={state.error} /> : null}
      {rows.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((r: any) => (
            <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 760 }}>{r.label}</div>
                {r.detail ? (
                  <div className="xom3-mono" style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
                    {r.detail}
                  </div>
                ) : null}
              </div>
              <PostureChip label={String(r.posture)} tone={chipTone(r.posture)} />
            </div>
          ))}
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
