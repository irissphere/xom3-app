"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type SystemStatus = {
  ok: boolean;
  timestamp: string;
  started: boolean;
  startedAt: string | null;
  posture: "idle" | "running" | "error" | "draining" | string;
  eventLoopStatus: {
    running: boolean;
    intervalMs: number | null;
    lastTickAt: string | null;
    lastError: string | null;
    logSize: number;
  };
  log: Array<any>;
};

function chipStyles(posture: string) {
  if (posture === "running") return { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.28)" };
  if (posture === "error") return { bg: "rgba(239,68,68,0.14)", fg: "rgb(239,68,68)", border: "rgba(239,68,68,0.28)" };
  if (posture === "draining") return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" };
  return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
}

export default function SystemStatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/system/status?limit=60", { cache: "no-store" });
    const json = (await res.json()) as SystemStatus;
    setStatus(json);
  }, []);

  useEffect(() => {
    fetchStatus().catch(() => {});
    const interval = setInterval(() => fetchStatus().catch(() => {}), 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const posture = status?.posture || "idle";
  const chip = useMemo(() => chipStyles(posture), [posture]);

  const onStart = async () => {
    setBusy("start");
    try {
      await fetch("/api/system/start", { method: "POST" });
      await fetchStatus();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SurfaceFrame
      title="System — Status"
      description="System posture and sovereign heartbeat. This surface is alive when the System Sovereign is running."
      activation={status?.eventLoopStatus?.running ? "active" : "dormant"}
      links={[
        { href: "/api/diagnostics", label: "Diagnostics (JSON)" },
        { href: "/uoi", label: "UOI Observatory" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)", letterSpacing: "0.08em" }}>
              SYSTEM SOVEREIGN
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
                startedAt: {status?.startedAt || "--"} • lastTick: {status?.eventLoopStatus?.lastTickAt || "--"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => fetchStatus()} disabled={busy !== null}>
              Refresh
            </button>
            <button className="xom3-btn xom3-btnPrimary" onClick={onStart} disabled={busy !== null}>
              {busy === "start" ? "Starting…" : "Start System Sovereign"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10 }}>
          <Metric label="Loop running" value={status?.eventLoopStatus?.running ? "YES" : "NO"} />
          <Metric label="Interval" value={status?.eventLoopStatus?.intervalMs ? `${status.eventLoopStatus.intervalMs}ms` : "--"} />
          <Metric label="Log size" value={String(status?.eventLoopStatus?.logSize ?? "--")} />
          <Metric label="Last error" value={status?.eventLoopStatus?.lastError || "--"} />
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 700 }}>System heartbeat log</div>
          <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            polling every 3s • last seen: {status?.timestamp || "--"}
          </div>
        </div>

        {!status?.log || status.log.length === 0 ? (
          <div style={{ padding: "12px 0", color: "var(--text-2)" }}>No ticks recorded yet.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {[...status.log].reverse().slice(0, 30).map((entry, idx) => (
              <details
                key={`${entry.tickAt || entry.timestamp || "tick"}-${idx}`}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                }}
              >
                <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                    {entry.tickAt || entry.timestamp || "tick"}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: entry.error ? "rgb(239,68,68)" : "var(--text-2)" }}>
                    {entry.error
                      ? `error: ${entry.error}`
                      : `heartbeat: ${entry.heartbeat?.status || "unknown"} • uptime: ${entry.heartbeat?.uptime ?? "--"}s`}
                  </span>
                </summary>
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
                  {JSON.stringify(entry, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}
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
