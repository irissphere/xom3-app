"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Trigger = { triggerId: string; source: string; eventType: string; enabled: boolean; actions: any[] };
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

export default function OrchestrationDashboardPage() {
  const [tenantId, setTenantId] = useState<string>("xom3");
  const [status, setStatus] = useState<{ bound: boolean } | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [tRes, sRes, sigRes] = await Promise.all([
          fetch("/api/orchestration/triggers", { headers: { "x-xom3-tenant": tenantId }, cache: "no-store" }),
          fetch(`/api/orchestration/state?limit=120`, { headers: { "x-xom3-tenant": tenantId }, cache: "no-store" }),
          fetch(`/api/signals/recent?tenantId=${encodeURIComponent(tenantId)}&prefix=orchestration.&limit=60`, { cache: "no-store" }),
        ]);
        const [tJson, sJson, sigJson] = await Promise.all([tRes.json(), sRes.json(), sigRes.json()]);
        if (stopped) return;
        if (!tJson?.ok || !sJson?.ok) throw new Error("orchestration_load_failed");
        setStatus(sJson.status || null);
        setTriggers(Array.isArray(tJson.triggers) ? tJson.triggers : []);
        setInstances(Array.isArray(sJson.instances) ? sJson.instances : []);
        setSignals(Array.isArray(sigJson?.items) ? sigJson.items : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "orchestration_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [tenantId]);

  const posture = useMemo(() => {
    const anyFailed = instances.some((i) => i.error || i.actions.some((a) => a.status === "failed"));
    if (anyFailed) return "degraded";
    if (status?.bound) return "active";
    return "inactive";
  }, [instances, status?.bound]);

  const enabledCount = useMemo(() => triggers.filter((t) => t.enabled).length, [triggers]);
  const errorCount = useMemo(() => instances.filter((i) => i.error).length, [instances]);

  return (
    <SurfaceFrame
      title="Orchestration — Unified GTM ↔ CRM ↔ Social ↔ COS"
      description="Signals → match triggers → execute cross-sovereign actions → persist instances. Tenant-safe, additive-only."
      activation={posture === "active" ? "active" : posture === "degraded" ? "active" : "dormant"}
      links={[
        { href: "/orchestration/triggers", label: "Trigger Controls" },
        { href: "/orchestration/timeline", label: "Orchestration Timeline" },
        { href: "/intakecrm", label: "intakecrm" },
        { href: "/revenue-loop", label: "Revenue Loop" },
        { href: "/social", label: "Social" },
        { href: "/cos", label: "COS" },
      ]}
      footerNote="Tenancy boundary is header-driven: x-xom3-tenant. GTM outbound tenancy is inferred via intent carrier for orchestration-owned outbound."
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
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
            posture: {posture} • bound: {String(status?.bound ?? false)} • triggersEnabled: {enabledCount}/{triggers.length} • failures: {errorCount}
          </div>
        </div>
        {error ? (
          <div className="xom3-mono" style={{ marginTop: 10, color: "rgb(239,68,68)", fontSize: 12 }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Cross-lane flow map</div>
          <div className="xom3-mono" style={{ marginTop: 10, color: "var(--text-2)", fontSize: 12, lineHeight: 1.6 }}>
            CRM → GTM → CRM
            <br />
            CRM → Social → CRM
            <br />
            Revenue Loop → GTM
            <br />
            CRM → COS
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {triggers.slice(0, 10).map((t) => (
              <div
                key={t.triggerId}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: "rgba(0,0,0,0.18)",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{t.triggerId}</div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {t.enabled ? "enabled" : "disabled"}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  on {t.eventType} → {t.actions?.map((a) => a.type).join(" → ") || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Recent orchestration signals</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {signals.slice(0, 18).map((s) => (
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
                  <div style={{ fontWeight: 800 }}>{s.type}</div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {s.severity}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  {new Date(s.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {signals.length === 0 ? <div style={{ color: "var(--text-2)" }}>No orchestration signals yet.</div> : null}
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 800 }}>Recent orchestration instances</div>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            {instances.length} visible
          </div>
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {instances.slice(0, 16).map((i) => (
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
                <div className="xom3-mono" style={{ color: i.error ? "rgb(248,113,113)" : "var(--text-2)", fontSize: 12 }}>
                  {i.error ? "failed" : i.completedAt ? "completed" : "running"}
                </div>
              </div>
              <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                instance={i.instanceId} • event={i.eventType} • started={new Date(i.startedAt).toLocaleString()}
              </div>
              {i.error ? (
                <div className="xom3-mono" style={{ marginTop: 6, color: "rgb(248,113,113)", fontSize: 12 }}>
                  error: {i.error}
                </div>
              ) : null}
            </div>
          ))}
          {instances.length === 0 ? <div className="xom3-subtle">No orchestration instances yet.</div> : null}
        </div>
      </div>
    </SurfaceFrame>
  );
}
