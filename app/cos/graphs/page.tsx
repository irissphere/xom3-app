"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Graph = { id: string; name: string; description: string; entryNodes: string[]; exitNodes: string[]; nodes: any[]; edges: any[]; triggers: any[] };
type GraphInstance = { instanceId: string; graphId: string; status: string; startedAt: number; completedAt?: number; activeNodes: any[]; completedNodes: string[] };

export default function CosGraphsPage() {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [instances, setInstances] = useState<GraphInstance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [gRes, iRes] = await Promise.all([
          fetch("/api/cos/graphs", { cache: "no-store" }),
          fetch("/api/cos/graphs/instances?limit=60", { cache: "no-store" }),
        ]);
        const [gJson, iJson] = await Promise.all([gRes.json(), iRes.json()]);
        if (stopped) return;
        if (!gJson?.ok || !iJson?.ok) throw new Error("cos_graph_load_failed");
        setGraphs(gJson.graphs || []);
        setInstances(iJson.instances || []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "cos_graph_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const activeCount = useMemo(() => instances.filter((i) => i.status === "running").length, [instances]);

  const trigger = async (type: string) => {
    try {
      await fetch("/api/cos/graphs/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "event", type, payload: {} }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceFrame
      title="COS — Scene Graphs"
      description="Graph-driven orchestration, branching, and parallel groups (read-only)."
      activation={activeCount > 0 ? "active" : "dormant"}
      links={[
        { href: "/cos", label: "COS Dashboard" },
        { href: "/sovereigns", label: "Constellation Map" },
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
              GRAPH POSTURE
            </div>
            <div style={{ marginTop: 8, color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              graphs={graphs.length} • activeInstances={activeCount}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => trigger("productCreated")}>
              Trigger: productCreated
            </button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => trigger("operator.enterDemoMode")}>
              Trigger: operator.enterDemoMode
            </button>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Graphs</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {graphs.map((g) => (
            <div key={g.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{g.name}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  id: {g.id} • nodes: {g.nodes?.length || 0} • edges: {g.edges?.length || 0}
                </div>
              </div>
              <div style={{ marginTop: 8, color: "var(--text-2)" }}>{g.description}</div>
              <div className="xom3-mono" style={{ marginTop: 8, color: "var(--text-2)", fontSize: 12 }}>
                entry: {g.entryNodes.join(", ")} • exit: {g.exitNodes.join(", ")} • triggers: {(g.triggers || []).map((t: any) => t.eventType).join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Graph instances</div>
          <a className="xom3-btn xom3-btnSecondary" href="/api/cos/graphs/instances?limit=200">
            view (api)
          </a>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {instances.slice(0, 30).map((i) => (
            <a
              key={i.instanceId}
              href={`/cos/graphs/instances/${encodeURIComponent(i.instanceId)}`}
              className="xom3-glass xom3-glassEdge"
              style={{ display: "block", padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,0.18)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{i.graphId}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  {i.status} • activeNodes {i.activeNodes?.length || 0} • completed {i.completedNodes?.length || 0}
                </div>
              </div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                instance: {i.instanceId} • started: {new Date(i.startedAt).toISOString()}
              </div>
            </a>
          ))}
        </div>
      </div>
    </SurfaceFrame>
  );
}
