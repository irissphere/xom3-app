"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import { ritualDefinitionToVisualGraph } from "@/lib/rituals/studio";

type Ritual = { key: string; name: string; description?: string; steps: Array<{ kind: string; params?: any }> };
type VisualGraph = ReturnType<typeof ritualDefinitionToVisualGraph>;

export default function RitualStudioPage() {
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [rRes, runsRes] = await Promise.all([
          fetch("/api/rituals", { cache: "no-store" }),
          fetch("/api/rituals/runs?limit=50", { cache: "no-store" }),
        ]);
        const [rJson, runsJson] = await Promise.all([rRes.json(), runsRes.json()]);
        if (stopped) return;
        if (!rJson?.ok) throw new Error("rituals_load_failed");
        setRituals(rJson.rituals || []);
        setRuns(runsJson?.ok ? runsJson.runs || [] : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "studio_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedKey && rituals.length > 0) setSelectedKey(rituals[0].key);
  }, [rituals, selectedKey]);

  const selectedRitual = useMemo(() => rituals.find((r) => r.key === selectedKey) || null, [rituals, selectedKey]);
  const selectedRun = useMemo(() => runs.find((r) => r.id === selectedRunId) || null, [runs, selectedRunId]);

  const graph: VisualGraph | null = useMemo(() => {
    if (!selectedRitual) return null;
    return ritualDefinitionToVisualGraph(selectedRitual as any, selectedRun);
  }, [selectedRitual, selectedRun]);

  const trigger = async () => {
    if (!selectedRitual) return;
    try {
      await fetch("/api/rituals/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ritualId: selectedRitual.key, reason: "ritual-studio" }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceFrame
      title="Ritual Studio"
      description="Visual spellbook for rituals (read-only visualization + instance overlay)."
      activation={selectedRun?.status === "running" ? "active" : "dormant"}
      links={[
        { href: "/sovereigns", label: "Constellation Map" },
        { href: "/cos", label: "COS" },
      ]}
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 360px", gap: 14 }}>
        {/* Left: ritual list */}
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
          <div style={{ fontWeight: 800 }}>Rituals</div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {rituals.map((r) => (
              <button
                key={r.key}
                onClick={() => {
                  setSelectedKey(r.key);
                  setSelectedRunId("");
                }}
                className="xom3-btn xom3-btnSecondary"
                style={{
                  justifyContent: "space-between",
                  width: "100%",
                  background: selectedKey === r.key ? "rgba(245,158,11,0.14)" : undefined,
                  borderColor: selectedKey === r.key ? "rgba(245,158,11,0.35)" : undefined,
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.key}</span>
                <span style={{ color: "var(--text-2)", fontSize: 12 }}>{r.steps?.length || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: graph view */}
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{selectedRitual?.name || selectedRitual?.key || "—"}</div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                {selectedRitual?.key ? `ritualId: ${selectedRitual.key}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="xom3-btn xom3-btnSecondary" onClick={trigger} disabled={!selectedRitual}>
                Trigger ritual
              </button>
              <a className="xom3-btn xom3-btnSecondary" href="/api/rituals" target="_blank" rel="noreferrer">
                view canon (api)
              </a>
            </div>
          </div>

          {!graph ? (
            <div className="xom3-mono" style={{ marginTop: 12, color: "var(--text-2)", fontSize: 12 }}>
              select a ritual…
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {graph.nodes.map((n) => (
                <div
                  key={n.nodeId}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(0,0,0,0.18)",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>{n.nodeId}</div>
                    <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                      {n.type}
                      {n.status ? ` • ${n.status}` : ""}
                    </div>
                  </div>
                  <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                    {n.label}
                  </div>
                </div>
              ))}
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                edges: {graph.edges.length}
              </div>
            </div>
          )}
        </div>

        {/* Right: step detail + trigger panel */}
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
          <div style={{ fontWeight: 800 }}>Instance overlay</div>
          <div className="xom3-mono" style={{ marginTop: 8, color: "var(--text-2)", fontSize: 12 }}>
            Select a run to overlay step status.
          </div>
          <select
            aria-label="Ritual run selection"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
          >
            <option value="">(none)</option>
            {runs
              .filter((r) => !selectedKey || r.ritualKey === selectedKey)
              .slice(0, 40)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} • {r.status}
                </option>
              ))}
          </select>

          {selectedRun ? (
            <div style={{ marginTop: 12 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                status: {selectedRun.status}
              </div>
              {selectedRun.steps?.some((s: any) => s.error) ? (
                <div style={{ marginTop: 10, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  error present in steps
                </div>
              ) : null}
              <pre style={{ marginTop: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedRun, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="xom3-mono" style={{ marginTop: 12, color: "var(--text-2)", fontSize: 12 }}>
              no run selected
            </div>
          )}
        </div>
      </div>
    </SurfaceFrame>
  );
}
