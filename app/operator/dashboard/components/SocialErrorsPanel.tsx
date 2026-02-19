"use client";

import type { OperatorDashboardContext } from "../page";
import { fetchOperatorSocialErrors } from "@/lib/operator/operator-dashboard-fetch";
import { OperatorPanelFrame, PanelEmpty, PanelError, PostureChip, useOperatorPanel } from "./OperatorDashboardPanelKit";

type SocialErrorsOk = Extract<Awaited<ReturnType<typeof fetchOperatorSocialErrors>>, { ok: true }>;
type SocialErrorsData = SocialErrorsOk["data"];

async function load(ctx: OperatorDashboardContext): Promise<SocialErrorsData> {
  const res = await fetchOperatorSocialErrors(ctx.headers);
  if (!res.ok) throw new Error("error" in res ? res.error : "social_errors_load_failed");
  return res.data;
}

export default function SocialErrorsPanel(props: { ctx: OperatorDashboardContext }) {
  const { state, refresh } = useOperatorPanel({
    ctx: props.ctx,
    panel: "social_errors",
    refreshMs: 4500,
    load,
  });

  const items = state.data?.items || [];

  const retry = async (postId: string) => {
    await fetch("/api/social/publish", {
      method: "POST",
      headers: props.ctx.headers,
      body: JSON.stringify({ postId }),
    }).catch(() => {});
    await refresh();
  };

  return (
    <OperatorPanelFrame title="Social Errors" hint={`failed=${items.length} • retry routes to /api/social/publish`}>
      {state.error ? <PanelError label="Social errors degraded" error={state.error} /> : null}
      {!state.error && items.length === 0 ? <PanelEmpty label="No failed posts." /> : null}

      {!state.error && items.length > 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {items.slice(0, 6).map((p: any) => (
            <div key={p.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 800 }}>{p.platform} • {p.id}</div>
                <PostureChip label={`retry ${p.retryCount || 0}`} tone="degraded" />
              </div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                {p.errorMessage || "unknown_error"}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <button className="xom3-btn xom3-btnPrimary" onClick={() => retry(p.id)}>
                  Retry
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </OperatorPanelFrame>
  );
}
