"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function CosBrainPage() {
  const [ctx, setCtx] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (refresh = false) => {
    try {
      const res = await fetch(`/api/cos/brain${refresh ? "?refresh=1" : ""}`, { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(String(json?.error || "brain_load_failed"));
      setCtx(json.context);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "brain_load_error");
    }
  };

  useEffect(() => {
    let stopped = false;
    const loop = async () => {
      if (stopped) return;
      await load(false);
    };
    loop().catch(() => {});
    const interval = setInterval(() => loop().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedScenes = useMemo(() => {
    const entries = Object.entries((ctx?.sceneWeights || {}) as Record<string, number>);
    return entries.sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [ctx]);

  const sortedGraphs = useMemo(() => {
    const entries = Object.entries((ctx?.graphWeights || {}) as Record<string, number>);
    return entries.sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [ctx]);

  return (
    <SurfaceFrame
      title="COS — Brain Posture"
      description="Adaptive orchestration posture, policy matches, and routing weights (read-only)."
      activation={ctx?.lastEvaluationAt ? "active" : "dormant"}
      links={[
        { href: "/cos", label: "COS Dashboard" },
        { href: "/cos/graphs", label: "Scene Graphs" },
      ]}
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
              BRAIN POSTURE
            </div>
            <div className="xom3-mono" style={{ marginTop: 8, color: "var(--text-2)", fontSize: 12 }}>
              lastEvaluationAt: {ctx?.lastEvaluationAt ? new Date(ctx.lastEvaluationAt).toISOString() : "--"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => load(true)}>
              Re-evaluate now
            </button>
            <a className="xom3-btn xom3-btnSecondary" href="/api/cos/brain" target="_blank" rel="noreferrer">
              view (api)
            </a>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Active policies</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {(ctx?.activePolicies || []).map((p: any) => (
            <div key={p.policyId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-1)" }}>
                  {p.policyId}
                </div>
                <div className="xom3-mono" style={{ fontSize: 12, color: p.matched ? "rgb(34,197,94)" : "var(--text-2)" }}>
                  {p.matched ? "MATCHED" : "inactive"}
                </div>
              </div>
            </div>
          ))}
          {(!ctx?.activePolicies || ctx.activePolicies.length === 0) && (
            <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
              none
            </div>
          )}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Scene weights</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {sortedScenes.map(([id, w]) => (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              <span>{id}</span>
              <span style={{ color: w > 0 ? "rgb(34,197,94)" : w < 0 ? "rgb(239,68,68)" : "var(--text-2)" }}>{Number(w).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Graph weights</div>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {sortedGraphs.map(([id, w]) => (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              <span>{id}</span>
              <span style={{ color: w > 0 ? "rgb(34,197,94)" : w < 0 ? "rgb(239,68,68)" : "var(--text-2)" }}>{Number(w).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Routing hints</div>
        <pre style={{ marginTop: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(ctx?.routingHints || {}, null, 2)}
        </pre>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Posture snapshot</div>
        <pre style={{ marginTop: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(ctx?.posture || {}, null, 2)}
        </pre>
      </div>
    </SurfaceFrame>
  );
}
