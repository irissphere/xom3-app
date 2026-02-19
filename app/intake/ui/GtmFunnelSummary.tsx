"use client";

import { useEffect, useState } from "react";

type FunnelSummary = {
  ok: boolean;
  funnels: Array<{ id: string; name: string; stages: Array<{ stageId: string; name: string; count: number }> }>;
};

export function GtmFunnelSummary() {
  const [data, setData] = useState<FunnelSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/gtm/funnels/summary?limit=500", { cache: "no-store" });
        const json = (await res.json()) as FunnelSummary;
        if (stopped) return;
        if (json?.ok) {
          setData(json);
          setError(null);
        } else {
          setError("funnels_load_failed");
        }
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "funnels_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 4000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 850 }}>Funnels</div>
          <div className="xom3-subtle" style={{ marginTop: 6 }}>
            Read-only posture: stage counts by entity.
          </div>
        </div>
        <a className="xom3-btn xom3-btnSecondary" href="/api/gtm/funnels/registry">
          View canon (API)
        </a>
      </div>

      {error ? (
        <div className="xom3-mono" style={{ marginTop: 12, color: "rgb(248,113,113)", fontSize: 12 }}>
          {error}
        </div>
      ) : !data ? (
        <div className="xom3-mono" style={{ marginTop: 12, color: "var(--text-2)", fontSize: 12 }}>
          loading…
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          {data.funnels.map((f) => (
            <div key={f.id} className="xom3-glass xom3-glassEdge" style={{ padding: 14, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 750 }}>{f.name}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  id: {f.id}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                {f.stages.map((s) => (
                  <div
                    key={s.stageId}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.16)",
                    }}
                  >
                    <div className="xom3-mono" style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {s.name}
                    </div>
                    <div className="xom3-mono" style={{ marginTop: 6, fontSize: 20, color: "var(--text-0)", fontWeight: 900 }}>
                      {s.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
