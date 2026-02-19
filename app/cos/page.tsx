"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Crew = { id: string; name: string; persona: string; members: string[]; epochTags: string[] };
type Scene = { id: string; name: string; crewId: string; description: string; triggers: any[]; steps: any[] };
type Instance = { instanceId: string; sceneId: string; crewId: string; status: string; startedAt: number; currentStepIndex: number };

export default function CosPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [cRes, sRes, iRes] = await Promise.all([
          fetch("/api/cos/crews", { cache: "no-store" }),
          fetch("/api/cos/scenes", { cache: "no-store" }),
          fetch("/api/cos/instances?limit=60", { cache: "no-store" }),
        ]);
        const [cJson, sJson, iJson] = await Promise.all([cRes.json(), sRes.json(), iRes.json()]);
        if (stopped) return;
        if (!cJson?.ok || !sJson?.ok || !iJson?.ok) throw new Error("cos_load_failed");
        setCrews(cJson.crews || []);
        setScenes(sJson.scenes || []);
        setInstances(iJson.instances || []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "cos_load_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 2500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const activeCount = useMemo(() => instances.filter((i) => i.status === "running" || i.status === "paused").length, [instances]);

  const trigger = async (type: string) => {
    try {
      await fetch("/api/cos/trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "event", type, payload: {} }) });
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceFrame
      title="COS — Constellation Orchestration"
      description="Crews, scenes, and macro orchestration across lanes. Read-only posture in this strike."
      activation={activeCount > 0 ? "active" : "dormant"}
      links={[
        { href: "/broadcast/operations", label: "Broadcast Operations" },
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
              ORCHESTRATION POSTURE
            </div>
            <div style={{ marginTop: 8, color: "var(--text-1)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              crews={crews.length} • scenes={scenes.length} • activeInstances={activeCount}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => trigger("operator.enterDemoMode")}>
              Trigger: operator.enterDemoMode
            </button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => trigger("productCreated")}>
              Trigger: productCreated
            </button>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => trigger("system.lowActivity")}>
              Trigger: system.lowActivity
            </button>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Crews</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {crews.map((c) => (
            <div key={c.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{c.name}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  id: {c.id} • persona: {c.persona}
                </div>
              </div>
              <div style={{ marginTop: 8, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                members: {c.members.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ fontWeight: 700 }}>Scenes</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {scenes.map((s) => (
            <div key={s.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{s.name}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  id: {s.id} • crew: {s.crewId} • steps: {s.steps?.length || 0}
                </div>
              </div>
              <div style={{ marginTop: 8, color: "var(--text-2)" }}>{s.description}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Scene instances</div>
          <a className="xom3-btn xom3-btnSecondary" href="/api/cos/instances?limit=200">
            view (api)
          </a>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {instances.slice(0, 30).map((i) => (
            <a
              key={i.instanceId}
              href={`/cos/instances/${encodeURIComponent(i.instanceId)}`}
              className="xom3-glass xom3-glassEdge"
              style={{ display: "block", padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,0.18)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{i.sceneId}</div>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  {i.status} • step {i.currentStepIndex}
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
