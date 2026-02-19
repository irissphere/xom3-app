"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function CosGraphInstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [instance, setInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        if (!id) return;
        const res = await fetch(`/api/cos/graphs/instances/${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = await res.json();
        if (stopped) return;
        if (!json?.ok) throw new Error(String(json?.error || "instance_load_failed"));
        setInstance(json.instance);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "instance_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [id]);

  return (
    <SurfaceFrame
      title="COS — Graph Instance"
      description="Node timeline, parallel groups, and branching posture (read-only)."
      activation={instance?.status === "running" ? "active" : "dormant"}
      links={[
        { href: "/cos/graphs", label: "Graph List" },
        { href: "/cos", label: "COS Dashboard" },
      ]}
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      {!instance ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            loading…
          </div>
        </div>
      ) : (
        <>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>{instance.graphId}</div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  instance: {instance.instanceId}
                </div>
              </div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                status: {instance.status} • active {instance.activeNodes?.length || 0} • completed {instance.completedNodes?.length || 0}
              </div>
            </div>
          </div>

          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>Active nodes</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {(instance.activeNodes || []).map((n: any) => (
                <div key={n.nodeId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>{n.nodeId}</div>
                    <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                      sceneInstance: {n.sceneInstanceId} • {n.status}
                    </div>
                  </div>
                </div>
              ))}
              {(!instance.activeNodes || instance.activeNodes.length === 0) && (
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  none
                </div>
              )}
            </div>
          </div>

          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>Parallel groups</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {Object.values(instance.parallelGroups || {}).map((pg: any) => (
                <div key={pg.groupId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>{pg.groupId}</div>
                    <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                      {pg.status} • {pg.completedNodeIds?.length || 0}/{pg.nodeIds?.length || 0}
                    </div>
                  </div>
                  <div className="xom3-mono" style={{ marginTop: 8, color: "var(--text-2)", fontSize: 12 }}>
                    nodes: {pg.nodeIds?.join(", ")}
                  </div>
                </div>
              ))}
              {Object.keys(instance.parallelGroups || {}).length === 0 && (
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  none
                </div>
              )}
            </div>
          </div>

          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>Completed nodes</div>
            <div className="xom3-mono" style={{ marginTop: 10, color: "var(--text-2)", fontSize: 12 }}>
              {(instance.completedNodes || []).join(", ") || "none"}
            </div>
          </div>
        </>
      )}
    </SurfaceFrame>
  );
}
