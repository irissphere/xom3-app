"use client";

import Link from "next/link";
import type { OperatorDashboardContext } from "../page";
import { fetchOperatorRevenueLoopState, fetchOperatorRevenueLoopTriggers } from "@/lib/operator/operator-dashboard-fetch";
import { OperatorPanelFrame, PanelError, PostureChip, useOperatorPanel } from "./OperatorDashboardPanelKit";

type StateOk = Extract<Awaited<ReturnType<typeof fetchOperatorRevenueLoopState>>, { ok: true }>;
type TriggersOk = Extract<Awaited<ReturnType<typeof fetchOperatorRevenueLoopTriggers>>, { ok: true }>;
type StateData = StateOk["data"];
type TriggersData = TriggersOk["data"];

async function load(ctx: OperatorDashboardContext): Promise<{ state: StateData; triggers: TriggersData["items"] }> {
  const [s, t] = await Promise.all([fetchOperatorRevenueLoopState(ctx.headers), fetchOperatorRevenueLoopTriggers(ctx.headers)]);
  if (!s.ok) throw new Error("error" in s ? s.error : "fetch_failed");
  if (!t.ok) throw new Error("error" in t ? t.error : "fetch_failed");
  return { state: s.data, triggers: t.data.items || [] };
}

export default function RevenueLoopPanel(props: { ctx: OperatorDashboardContext }) {
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "revenue_loop",
    refreshMs: 5000,
    load,
  });

  const d = state.data;
  const st = d?.state;
  const triggers = d?.triggers || [];

  return (
    <OperatorPanelFrame
      title="Revenue Loop Activity"
      hint={st ? `queued=${st.counts.queued} • sent=${st.counts.sent} • failed=${st.counts.failed}` : "loading…"}
      right={
        <Link className="xom3-btn xom3-btnSecondary" href="/broadcast/operations">
          Revenue loop
        </Link>
      }
    >
      {state.error ? <PanelError label="Revenue loop degraded" error={state.error} /> : null}

      {st ? (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            lastTriggered: {st.lastTriggeredAt ? new Date(st.lastTriggeredAt).toLocaleString() : "—"} • lastAutoPost:{" "}
            {st.lastAutoPostAt ? new Date(st.lastAutoPostAt).toLocaleString() : "—"} • nextScheduled:{" "}
            {st.nextScheduledAt ? new Date(st.nextScheduledAt).toLocaleString() : "—"}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {triggers.slice(0, 6).map((tr: any) => (
              <PostureChip key={tr.id} label={`${tr.enabled ? "ON" : "OFF"} ${tr.label}`} tone={tr.enabled ? "ok" : "missing"} />
            ))}
          </div>
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
