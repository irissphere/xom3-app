"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UoiStatusResponse = {
  ok: boolean;
  timestamp: string;
  posture: "idle" | "running" | "error" | string;
  startInfo?: { started: boolean; startedAt: string | null };
  eventLoopStatus?: {
    running: boolean;
    intervalMs: number | null;
    lastTickAt: string | null;
    lastError: string | null;
    logSize: number;
  };
  queues?: {
    signals: { pending: number };
    directives: { pending: number; handlers: number };
  };
  heartbeatLog?: Array<Record<string, any>>;
  lastTick?: string | null;
};

function postureStyles(posture: string) {
  switch (posture) {
    case "running":
      return { bg: "rgba(34,197,94,0.15)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.25)" };
    case "error":
      return { bg: "rgba(239,68,68,0.15)", fg: "rgb(239,68,68)", border: "rgba(239,68,68,0.25)" };
    case "idle":
    default:
      return { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" };
  }
}

export default function UoiPage() {
  const [status, setStatus] = useState<UoiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/uoi/status", { cache: "no-store" });
    const json = (await res.json()) as UoiStatusResponse;
    setStatus(json);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus().catch(() => setLoading(false));
    const interval = setInterval(() => {
      fetchStatus().catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const posture = status?.posture || "idle";
  const postureUi = useMemo(() => postureStyles(posture), [posture]);

  const onStart = async () => {
    setBusy("start");
    try {
      await fetch("/api/uoi/start", { method: "POST" });
      await fetchStatus();
    } finally {
      setBusy(null);
    }
  };

  const onFlush = async () => {
    setBusy("flush");
    try {
      await fetch("/api/uoi/flush", { method: "POST" });
      await fetchStatus();
    } finally {
      setBusy(null);
    }
  };

  const onTestDirective = async () => {
    setBusy("test");
    try {
      await fetch("/api/uoi/test-directive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TRIGGER_ALERT",
          target: "operator",
          reason: "UOI Observatory: test directive",
        }),
      });
      await fetchStatus();
    } finally {
      setBusy(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-0)", color: "var(--text-0)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 20px" }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(6,182,212,0.12)",
                  border: "1px solid rgba(6,182,212,0.22)",
                  color: "rgb(6,182,212)",
                }}
              >
                UOI
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 780, letterSpacing: "-0.02em" }}>Unified Operational Intelligence</div>
                <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  Observatory • heartbeat • directives • queues
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: postureUi.bg,
                border: `1px solid ${postureUi.border}`,
                color: postureUi.fg,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              POSTURE: {String(posture).toUpperCase()}
            </div>
            <button
              onClick={() => fetchStatus()}
              disabled={busy !== null}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                color: "var(--text-0)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              Refresh
            </button>
            <button
              onClick={onStart}
              disabled={busy !== null}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(34,197,94,0.30)",
                background: "rgba(34,197,94,0.12)",
                color: "rgb(34,197,94)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy === "start" ? "Starting…" : "Start UOI"}
            </button>
            <button
              onClick={onFlush}
              disabled={busy !== null}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(245,158,11,0.30)",
                background: "rgba(245,158,11,0.10)",
                color: "rgb(245,158,11)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy === "flush" ? "Flushing…" : "Flush queues"}
            </button>
            <button
              onClick={onTestDirective}
              disabled={busy !== null}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(168,85,247,0.30)",
                background: "rgba(168,85,247,0.10)",
                color: "rgb(168,85,247)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy === "test" ? "Issuing…" : "Trigger test directive"}
            </button>
          </div>
        </header>

        <section style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
          <div style={{ gridColumn: "span 12", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: 16 }}>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Metric label="Event loop" value={status?.eventLoopStatus?.running ? "RUNNING" : "STOPPED"} />
              <Metric label="Interval" value={status?.eventLoopStatus?.intervalMs ? `${status.eventLoopStatus.intervalMs}ms` : "--"} />
              <Metric label="Started at" value={status?.startInfo?.startedAt || "--"} />
              <Metric label="Last tick" value={status?.eventLoopStatus?.lastTickAt || "--"} />
              <Metric label="Last error" value={status?.eventLoopStatus?.lastError || "--"} />
              <Metric label="Signals pending" value={String(status?.queues?.signals?.pending ?? "--")} />
              <Metric label="Directives pending" value={String(status?.queues?.directives?.pending ?? "--")} />
              <Metric label="Directive handlers" value={String(status?.queues?.directives?.handlers ?? "--")} />
              <Metric label="Log size" value={String(status?.eventLoopStatus?.logSize ?? "--")} />
            </div>
          </div>

          <div style={{ gridColumn: "span 12", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>Heartbeat timeline</div>
              <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                polling every 3s • last seen: {status?.timestamp || "--"}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: "18px 0", color: "var(--text-2)" }}>Loading…</div>
            ) : !status?.heartbeatLog || status.heartbeatLog.length === 0 ? (
              <div style={{ padding: "18px 0", color: "var(--text-2)" }}>No ticks recorded yet.</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {[...status.heartbeatLog].reverse().slice(0, 30).map((entry, idx) => (
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
                        {entry.error ? `error: ${entry.error}` : `${entry.signalsProcessed ?? 0} signals → ${entry.directivesCreated ?? 0} directives`}
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
        </section>

        {!loading && status && status.ok === false ? (
          <div style={{ marginTop: 14, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            status error: {JSON.stringify(status)}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 160 }}>
      <div style={{ color: "var(--text-2)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 4, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-0)" }}>{value}</div>
    </div>
  );
}
