"use client";

import { useEffect, useState } from "react";

type ActiveResponse = {
  ok: boolean;
  byCampaign: Record<string, { campaignId: string; name: string; activeCount: number; totalCount: number }>;
  activeCount: number;
};

export function GtmCampaignsPanel() {
  const [data, setData] = useState<ActiveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/gtm/campaigns/active?limit=120", { cache: "no-store" });
        const json = (await res.json()) as ActiveResponse;
        if (stopped) return;
        if (json?.ok) {
          setData(json);
          setError(null);
        } else {
          setError("campaigns_load_failed");
        }
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "campaigns_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Campaigns</div>
        <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          active: {data?.activeCount ?? 0}
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 10, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{error}</div>
      ) : !data ? (
        <div style={{ marginTop: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>loading…</div>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {Object.values(data.byCampaign || {}).map((c) => (
            <div
              key={c.campaignId}
              style={{
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(0,0,0,0.18)",
                padding: "10px 12px",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ marginTop: 4, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  id: {c.campaignId}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                  active {c.activeCount} / total {c.totalCount}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
