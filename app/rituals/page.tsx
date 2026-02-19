"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type RitualDefinition = {
  key: string;
  name: string;
  description: string;
  steps: { kind: string; params: any }[];
};

type RitualRun = {
  id: string;
  ritualKey: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  source?: { type: string; eventId?: string };
  steps: { index: number; kind: string; status: string; error?: string }[];
};

export default function RitualsPage() {
  const [rituals, setRituals] = useState<RitualDefinition[]>([]);
  const [runs, setRuns] = useState<RitualRun[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [r1, r2] = await Promise.all([
      fetch("/api/rituals", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/rituals/runs?limit=60", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setRituals(Array.isArray(r1?.rituals) ? r1.rituals : []);
    setRuns(Array.isArray(r2?.runs) ? r2.runs : []);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : "refresh_failed"));
    const t = setInterval(() => refresh().catch(() => {}), 2500);
    return () => clearInterval(t);
  }, [refresh]);

  const trigger = async (ritualKey: string) => {
    setBusyKey(ritualKey);
    setError(null);
    try {
      const res = await fetch("/api/rituals/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualKey }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "trigger_failed");
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "trigger_failed");
    } finally {
      setBusyKey(null);
    }
  };

  const runsByRitual = useMemo(() => {
    const map = new Map<string, RitualRun[]>();
    runs.forEach((r) => {
      const list = map.get(r.ritualKey) || [];
      list.push(r);
      map.set(r.ritualKey, list);
    });
    return map;
  }, [runs]);

  return (
    <SurfaceFrame
      title="Rituals"
      description="Book of Ceremonies: named sequences that orchestrate the constellation. Every run is logged and published into the Event Bus."
      activation="active"
      links={[
        { href: "/timeline", label: "Timeline" },
        { href: "/broadcast/operations", label: "Broadcast" },
        { href: "/system/status", label: "System" },
        { href: "/uoi", label: "UOI" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            rituals: {rituals.length} • runs: {runs.length}
          </div>
          <button className="xom3-btn xom3-btnSecondary" onClick={() => refresh()}>
            Refresh
          </button>
        </div>
        {error ? (
          <div style={{ marginTop: 10, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{error}</div>
        ) : null}
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Canon</div>
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {rituals.map((r) => {
            const recent = runsByRitual.get(r.key) || [];
            return (
              <details
                key={r.key}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                }}
              >
                <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{r.key}</span>
                    <span style={{ fontWeight: 650 }}>{r.name}</span>
                    <span style={{ color: "var(--text-2)", fontSize: 12 }}>{r.description}</span>
                    <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>steps={r.steps.length}</span>
                  </div>
                  <button
                    className="xom3-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      trigger(r.key);
                    }}
                    disabled={busyKey === r.key}
                  >
                    {busyKey === r.key ? "Running…" : "Run"}
                  </button>
                </summary>

                <div style={{ marginTop: 10, color: "var(--text-2)" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>Recent runs</div>
                  {recent.length === 0 ? (
                    <div style={{ padding: "8px 0", color: "var(--text-2)" }}>No runs yet.</div>
                  ) : (
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {recent.slice(0, 6).map((run) => (
                        <details
                          key={run.id}
                          style={{
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.06)",
                            background: "rgba(255,255,255,0.02)",
                            padding: "8px 10px",
                          }}
                        >
                          <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-1)" }}>
                                {new Date(run.startedAt).toLocaleTimeString()}
                              </span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{run.id}</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: run.status === "failed" ? "rgb(239,68,68)" : "var(--text-2)" }}>
                                {run.status.toUpperCase()}
                              </span>
                              {run.source?.type ? (
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
                                  source={run.source.type}
                                </span>
                              ) : null}
                            </div>
                            <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                              steps={run.steps.length}
                            </span>
                          </summary>

                          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                            {run.steps.map((s) => (
                              <div
                                key={`${run.id}_${s.index}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  borderRadius: 8,
                                  padding: "6px 8px",
                                  border: "1px solid rgba(255,255,255,0.06)",
                                  background: "rgba(0,0,0,0.14)",
                                }}
                              >
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>#{s.index}</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{s.kind}</span>
                                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>{String(s.status).toUpperCase()}</span>
                                  {s.error ? (
                                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgb(239,68,68)" }}>{s.error}</span>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </SurfaceFrame>
  );
}
