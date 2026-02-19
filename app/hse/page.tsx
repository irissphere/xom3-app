"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type HseStatus = {
  ok: boolean;
  timestamp: string;
  initialized: boolean;
  posture: "idle" | "normal" | "protective" | "recovery" | "aggressive" | string;
  listenerCount: number;
  state: any | null;
};

function chipStyles(posture: string) {
  if (posture === "aggressive") return { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.28)" };
  if (posture === "recovery") return { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", border: "rgba(239,68,68,0.28)" };
  if (posture === "protective") return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
  if (posture === "normal") return { bg: "rgba(6,182,212,0.12)", fg: "rgb(6,182,212)", border: "rgba(6,182,212,0.22)" };
  return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
}

export default function HsePage() {
  const [status, setStatus] = useState<HseStatus | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/hse/status", { cache: "no-store" });
    const json = (await res.json()) as HseStatus;
    setStatus(json);
  }, []);

  useEffect(() => {
    fetchStatus().catch(() => {});
    const interval = setInterval(() => fetchStatus().catch(() => {}), 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const posture = status?.posture || "idle";
  const chip = useMemo(() => chipStyles(posture), [posture]);

  return (
    <SurfaceFrame
      title="HSE — Health Signal Engine"
      description="Hyperstate synthesis: stability, risk, drift, pressure, anomaly clusters. This surface becomes alive when state is actively updating."
      activation={status?.initialized ? "active" : "dormant"}
      links={[
        { href: "/uoi", label: "UOI Observatory" },
        { href: "/system/status", label: "System Status" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
              HSE STATE
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: chip.bg,
                  border: `1px solid ${chip.border}`,
                  color: chip.fg,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                POSTURE: {String(posture).toUpperCase()}
              </div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                initialized: {status?.initialized ? "YES" : "NO"} • listeners: {status?.listenerCount ?? 0} • lastUpdated:{" "}
                {status?.state?.lastUpdated || "--"}
              </div>
            </div>
          </div>

          <button className="xom3-btn xom3-btnSecondary" onClick={() => fetchStatus()}>
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
          <Metric label="Risk (aggregate)" value={fmt01(status?.state?.vectors?.risk?.aggregate_risk)} />
          <Metric label="Pressure (aggregate)" value={fmt01(status?.state?.vectors?.pressure?.aggregate_pressure)} />
          <Metric label="Stability" value={fmt01(status?.state?.stability?.overall_stability)} />
          <Metric label="Anomalies (critical/high)" value={`${status?.state?.anomalies?.critical ?? 0}/${status?.state?.anomalies?.high ?? 0}`} />
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>State snapshot</div>
        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-1)",
          }}
        >
          {JSON.stringify(status?.state || null, null, 2)}
        </pre>
      </div>
    </SurfaceFrame>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ gridColumn: "span 3", minWidth: 160 }}>
      <div style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-0)" }}>{value}</div>
    </div>
  );
}

function fmt01(n: any): string {
  if (typeof n !== "number") return "--";
  return String(Math.round(n * 1000) / 1000);
}
