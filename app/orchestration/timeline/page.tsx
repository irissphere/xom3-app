"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Instance = {
  instanceId: string;
  triggerId: string;
  tenantId: string;
  eventType: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  actions: { actionId: string; type: string; status: string; timestamp: string; error?: string }[];
};

function badgeStyle(status: string): React.CSSProperties {
  if (status === "completed") return { background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.28)", color: "rgb(34,197,94)" };
  if (status === "failed") return { background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.22)", color: "rgb(248,113,113)" };
  return { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.26)", color: "rgb(245,158,11)" };
}

export default function OrchestrationTimelinePage() {
  const [tenantId, setTenantId] = useState("xom3");
  const [instances, setInstances] = useState<Instance[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(() => ({ "x-xom3-tenant": tenantId }), [tenantId]);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [sRes, sigRes] = await Promise.all([
          fetch("/api/orchestration/state?limit=200", { headers, cache: "no-store" }),
          fetch(`/api/signals/recent?tenantId=${encodeURIComponent(tenantId)}&prefix=orchestration.&limit=120`, { cache: "no-store" }),
        ]);
        const [sJson, sigJson] = await Promise.all([sRes.json(), sigRes.json()]);
        if (stopped) return;
        if (!sJson?.ok) throw new Error("timeline_load_failed");
        setInstances(Array.isArray(sJson.instances) ? sJson.instances : []);
        setSignals(Array.isArray(sigJson?.items) ? sigJson.items : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "timeline_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [headers, tenantId]);

  return (
    <SurfaceFrame
      title="Orchestration — Timeline"
      description="Visual chain: CRM → GTM → Social → CRM → COS, expressed as orchestration instances + Signals."
      activation="active"
      links={[
        { href: "/orchestration", label: "Orchestration Dashboard" },
        { href: "/orchestration/triggers", label: "Trigger Controls" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            TENANT
          </div>
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--text-0)",
              outline: "none",
              width: 220,
            }}
            placeholder="xom3"
          />
          <div style={{ flex: 1 }} />
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            instances={instances.length} • signals={signals.length}
          </div>
        </div>
        {error ? (
          <div className="xom3-mono" style={{ marginTop: 10, color: "rgb(239,68,68)", fontSize: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 14, marginTop: 14 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Instances</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {instances.slice(0, 60).map((i) => (
              <div
                key={i.instanceId}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{i.triggerId}</div>
                  <div
                    className="xom3-mono"
                    style={{
                      ...badgeStyle(i.error ? "failed" : i.completedAt ? "completed" : "pending"),
                      padding: "6px 10px",
                      borderRadius: 999,
                      fontSize: 11,
                    }}
                  >
                    {i.error ? "FAILED" : i.completedAt ? "COMPLETED" : "RUNNING"}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  event={i.eventType} • instance={i.instanceId} • started={new Date(i.startedAt).toLocaleString()}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {i.actions.map((a) => (
                    <div key={a.actionId} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <div className="xom3-mono" style={{ fontSize: 12 }}>
                        {a.type}
                      </div>
                      <div className="xom3-mono" style={{ ...badgeStyle(a.status), padding: "6px 10px", borderRadius: 999, fontSize: 11 }}>
                        {String(a.status).toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>

                {i.error ? (
                  <div className="xom3-mono" style={{ marginTop: 8, color: "rgb(248,113,113)", fontSize: 12 }}>
                    error: {i.error}
                  </div>
                ) : null}
              </div>
            ))}
            {instances.length === 0 ? <div className="xom3-subtle">No instances yet.</div> : null}
          </div>
        </div>

        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Signals (orchestration.*)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {signals.slice(0, 60).map((s) => (
              <div
                key={s.signalId}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 750 }}>{s.type}</div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {s.severity}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  {new Date(s.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {signals.length === 0 ? <div className="xom3-subtle">No orchestration signals yet.</div> : null}
          </div>
        </div>
      </div>
    </SurfaceFrame>
  );
}
