"use client";

import { useEffect, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function HeartbeatPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const res = await fetch("/api/signals/recent?limit=120", { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (!json?.ok) throw new Error(String(json?.error || "signals_load_failed"));
        setSignals(json.items || []);
        setCounts(json.counts || null);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "heartbeat_load_error");
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
    <SurfaceFrame
      title="Heartbeat"
      description="Signals by severity + time window (disk-backed in dev)."
      activation={counts?.error > 0 ? "active" : "dormant"}
      links={[
        { href: "/intakecrm/dashboard", label: "intakecrm Dashboard" },
        { href: "/timeline", label: "Timeline" },
      ]}
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
          total: {counts?.total ?? "--"} • info: {counts?.info ?? "--"} • warning: {counts?.warning ?? "--"} • error: {counts?.error ?? "--"}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "grid", gap: 10 }}>
          {signals.slice(0, 120).map((s) => (
            <div key={s.signalId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{s.type}</div>
                <div className="xom3-mono" style={{ color: s.severity === "error" ? "rgb(239,68,68)" : s.severity === "warning" ? "rgb(251,191,36)" : "var(--text-2)", fontSize: 12 }}>
                  {s.severity}
                </div>
              </div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                tenant: {s.tenantId} • {new Date(s.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
          {signals.length === 0 ? <div style={{ color: "var(--text-2)" }}>No signals recorded yet.</div> : null}
        </div>
      </div>
    </SurfaceFrame>
  );
}
