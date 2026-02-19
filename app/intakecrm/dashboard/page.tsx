"use client";

import { useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import Link from "next/link";
import { useIntakecrmHeaders, useIntakecrmTenantPreference } from "../ui/intakecrm-tenant-preference";

export default function IntakecrmDashboardPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { tenant, setTenant } = useIntakecrmTenantPreference();
  const headers = useIntakecrmHeaders({ tenant, actorLabel: "intakecrm_dashboard" });

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        setLoading(true);
        const [lRes, tRes, sRes] = await Promise.all([
          fetch("/api/intakecrm/leads", { headers, cache: "no-store" }),
          fetch("/api/intakecrm/tasks", { headers, cache: "no-store" }),
          fetch("/api/signals/recent?prefix=intakecrm.&limit=60", { cache: "no-store" }),
        ]);
        const [lJson, tJson, sJson] = await Promise.all([lRes.json(), tRes.json(), sRes.json()]);
        if (stopped) return;
        if (!lJson?.ok || !tJson?.ok || !sJson?.ok) throw new Error("dashboard_load_failed");
        setLeads(lJson.items || []);
        setTasks(tJson.items || []);
        setSignals(sJson.items || []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "dashboard_load_error");
      } finally {
        if (!stopped) setLoading(false);
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 3000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [headers]);

  const posture = useMemo(() => {
    const overdue = tasks.filter((t) => t.status === "overdue").length;
    if (overdue > 0) return "degraded";
    if (leads.length > 0) return "active";
    return "inactive";
  }, [tasks, leads]);

  const counts = useMemo(() => {
    const c = { newLeads: 0, pending: 0, overdue: 0, escalated: 0 };
    for (const l of leads) if (l.posture === "new") c.newLeads += 1;
    for (const t of tasks) {
      if (t.status === "pending") c.pending += 1;
      if (t.status === "overdue") c.overdue += 1;
      if (t.escalated) c.escalated += 1;
    }
    return c;
  }, [leads, tasks]);

  return (
    <SurfaceFrame
      title="intakecrm — Dashboard"
      description="One-screen awareness: leads, tasks, SLA, and signals."
      activation={posture === "active" ? "active" : posture === "degraded" ? "active" : "dormant"}
      links={[
        { href: "/intakecrm/intake", label: "Manual Intake" },
        { href: "/intakecrm/leads", label: "Leads" },
        { href: "/intakecrm/tasks", label: "Tasks" },
        { href: "/heartbeat", label: "Heartbeat" },
      ]}
    >
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)" }}>
            TENANT
          </div>
          <input value={tenant} onChange={(e) => setTenant(e.target.value)} style={{ width: 220, ...inputStyle() }} />
          <div style={{ flex: 1 }} />
          <Link className="xom3-btn xom3-btnSecondary" href="/intakecrm">
            IntakeCRM
          </Link>
        </div>
      </div>

      {error ? (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, color: "rgb(239,68,68)" }}>
          {error}
        </div>
      ) : null}

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
        <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
          posture: {posture} • newLeads: {counts.newLeads} • pendingTasks: {counts.pending} • overdue: {counts.overdue} • escalated: {counts.escalated}
          {loading ? " • loading…" : ""}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Recent leads</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {leads.slice(0, 12).map((l) => (
              <a
                key={l.leadId}
                href={`/intakecrm/leads/${encodeURIComponent(l.leadId)}`}
                className="xom3-glass xom3-glassEdge"
                style={{ display: "block", padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,0.18)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 800 }}>{l.name || l.email || l.phone || l.leadId}</div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {l.posture}
                  </div>
                </div>
              </a>
            ))}
            {leads.length === 0 ? <div style={{ color: "var(--text-2)" }}>{loading ? "loading…" : "No leads."}</div> : null}
          </div>
        </div>

        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
          <div style={{ fontWeight: 800 }}>Signals (intakecrm.*)</div>
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
            {signals.length === 0 ? <div style={{ color: "var(--text-2)" }}>No signals yet.</div> : null}
          </div>
        </div>
      </div>
    </SurfaceFrame>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
  };
}
