"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type LoopState = {
  tenantId: string;
  lastTriggeredAt: string;
  lastTriggerType: string;
  lastPostId?: string;
  lastError?: string;
};

type Trigger = {
  triggerId: string;
  type: string;
  platformTargets: string[];
  templateId: string;
  enabled: boolean;
};

export default function RevenueLoopPage() {
  const [tenantId, setTenantId] = useState<string>("xom3");
  const [state, setState] = useState<LoopState | null>(null);
  const [status, setStatus] = useState<{ bound: boolean } | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [stRes, trRes, sigRes, qRes] = await Promise.all([
          fetch("/api/revenue-loop/state", { cache: "no-store" }),
          fetch("/api/revenue-loop/triggers", { cache: "no-store" }),
          fetch("/api/signals/recent?prefix=revenue.loop.&limit=60", { cache: "no-store" }),
          // Social queue is filtered by clientId; revenue loop enqueues with clientId=tenantId
          fetch(`/api/social/posts?clientId=${encodeURIComponent(tenantId)}`, { cache: "no-store" }),
        ]);
        const [stJson, trJson, sigJson, qJson] = await Promise.all([stRes.json(), trRes.json(), sigRes.json(), qRes.json()]);
        if (stopped) return;
        if (!stJson?.ok || !trJson?.ok) throw new Error("revenue_loop_load_failed");

        const nextTenant = String(stJson?.tenantId || trJson?.tenantId || tenantId);
        setTenantId(nextTenant);
        setStatus(stJson.status || null);
        setState(stJson.state || null);
        setTriggers(Array.isArray(trJson.triggers) ? trJson.triggers : []);
        setSignals(Array.isArray(sigJson?.items) ? sigJson.items : []);
        setQueue(Array.isArray(qJson?.data?.items) ? qJson.data.items : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "revenue_loop_error");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3500);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const posture = useMemo(() => {
    if (state?.lastError) return "degraded";
    if (status?.bound) return "active";
    return "inactive";
  }, [state?.lastError, status?.bound]);

  const enabledCount = useMemo(() => triggers.filter((t) => t.enabled).length, [triggers]);

  return (
    <SurfaceFrame
      title="Revenue Loop — intakecrm ↔ social"
      description="Closed-circuit GTM lift: intakecrm signals → auto posts → momentum → compounding."
      activation={posture === "active" ? "active" : posture === "degraded" ? "active" : "dormant"}
      links={[
        { href: "/revenue-loop/triggers", label: "Trigger Controls" },
        { href: "/revenue-loop/timeline", label: "Loop Timeline" },
        { href: "/intakecrm/dashboard", label: "intakecrm" },
        { href: "/social", label: "Social" },
      ]}
      footerNote="Tenant boundary is header-driven: x-xom3-tenant. Revenue Loop enqueues social posts with clientId=tenantId."
    >
      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
          tenant: {tenantId} • posture: {posture} • bound: {String(status?.bound ?? false)} • triggersEnabled: {enabledCount}/{triggers.length} • lastTrigger:{" "}
          {state?.lastTriggerType || "—"} • lastTriggeredAt: {state?.lastTriggeredAt ? new Date(state.lastTriggeredAt).toLocaleString() : "—"} • lastPostId:{" "}
          {state?.lastPostId || "—"}
        </div>
        {state?.lastError ? (
          <div className="xom3-mono" style={{ marginTop: 10, color: "rgb(239,68,68)", fontSize: 12 }}>
            lastError: {state.lastError}
          </div>
        ) : null}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Recent loop signals (revenue.loop.*)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {signals.slice(0, 18).map((s) => (
              <div key={s.signalId} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
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
            {signals.length === 0 ? <div style={{ color: "var(--text-2)" }}>No loop signals yet.</div> : null}
          </div>
        </div>

        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Recent social queue (clientId = tenant)</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {queue.slice(0, 18).map((q) => (
              <div key={q.id} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {q.platform} · {q.status}
                  </div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {q.scheduledAt ? new Date(q.scheduledAt).toLocaleString() : new Date(q.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  {q.content}
                </div>
              </div>
            ))}
            {queue.length === 0 ? <div style={{ color: "var(--text-2)" }}>No tenant-tagged queue items yet.</div> : null}
          </div>
        </div>
      </div>
    </SurfaceFrame>
  );
}
