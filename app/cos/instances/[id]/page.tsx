"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SurfaceFrame from "@/app/components/SurfaceFrame";

export default function CosInstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [instance, setInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        if (!id) return;
        const res = await fetch(`/api/cos/instances/${encodeURIComponent(id)}`, { cache: "no-store" });
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

  const advance = async () => {
    try {
      await fetch(`/api/cos/instances/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <SurfaceFrame
      title="COS — Scene Instance"
      description="Step-by-step scene timeline and posture. Read-only in this strike (advance available for debugging)."
      activation={instance?.status === "running" ? "active" : "dormant"}
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
                <div style={{ fontWeight: 800 }}>{instance.sceneId}</div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  instance: {instance.instanceId} • crew: {instance.crewId}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                  status: {instance.status} • step {instance.currentStepIndex}
                </div>
                <button className="xom3-btn xom3-btnSecondary" onClick={advance}>
                  Advance (debug)
                </button>
              </div>
            </div>
          </div>

          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 700 }}>Steps</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {(instance.steps || []).map((s: any, idx: number) => (
                <div
                  key={`${s.stepId}_${idx}`}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(0,0,0,0.18)",
                    padding: "10px 12px",
                    opacity: idx < instance.currentStepIndex ? 0.92 : 1,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 800 }}>
                      {idx + 1}. {s.stepId}
                    </div>
                    <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                      {s.type} • {s.status}
                    </div>
                  </div>
                  {s.error ? (
                    <div style={{ marginTop: 8, color: "rgb(239,68,68)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.error}</div>
                  ) : null}
                  {s.output ? (
                    <pre style={{ marginTop: 8, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(s.output, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </SurfaceFrame>
  );
}
