"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SurfaceFrame from "@/app/components/SurfaceFrame";
import Link from "next/link";
import { useIntakecrmHeaders, useIntakecrmTenantPreference } from "../ui/intakecrm-tenant-preference";

type Lead = {
  leadId: string;
  tenantId: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  posture: "new" | "working" | "closed";
  assignedTo?: string;
  createdAt: string;
};

export default function IntakecrmLeadsPage() {
  const { tenant, setTenant } = useIntakecrmTenantPreference();
  const headers = useIntakecrmHeaders({ tenant, actorLabel: "intakecrm_leads" });
  const [items, setItems] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [posture, setPosture] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (posture) params.set("posture", posture);
      const res = await fetch(`/api/intakecrm/leads?${params.toString()}`, { headers, cache: "no-store" });
      const json = await res.json();
      if (!json?.ok) throw new Error(String(json?.error || "leads_load_failed"));
      setItems(json.items || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "leads_load_error");
    } finally {
      setLoading(false);
    }
  }, [headers, posture, q]);

  useEffect(() => {
    fetchLeads().catch(() => {});
  }, [fetchLeads]);

  useEffect(() => {
    const t = setTimeout(() => fetchLeads().catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, posture, headers, fetchLeads]);

  const counts = useMemo(() => {
    const c = { new: 0, working: 0, closed: 0 };
    for (const l of items) c[l.posture] += 1;
    return c;
  }, [items]);

  return (
    <SurfaceFrame
      title="intakecrm — Leads"
      description="Tenant-scoped lead intake and triage."
      activation={items.length ? "active" : "dormant"}
      links={[
        { href: "/intakecrm/dashboard", label: "Dashboard" },
        { href: "/intakecrm/tasks", label: "Tasks" },
        { href: "/intakecrm/intake", label: "Manual Intake" },
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
            new: {counts.new} • working: {counts.working} • closed: {counts.closed} • total: {items.length}
            {loading ? " • loading…" : ""}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search leads…"
              style={{ width: 240, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            />
            <select
              aria-label="Lead posture filter"
              value={posture}
              onChange={(e) => setPosture(e.target.value)}
              style={{ width: 180, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)", color: "var(--text-0)" }}
            >
              <option value="">All postures</option>
              <option value="new">new</option>
              <option value="working">working</option>
              <option value="closed">closed</option>
            </select>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => fetchLeads()}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
        {items.length === 0 ? (
          <div style={{ color: "var(--text-2)" }}>{loading ? "loading…" : "No leads yet."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((l) => (
              <Link
                key={l.leadId}
                href={`/intakecrm/leads/${encodeURIComponent(l.leadId)}`}
                className="xom3-glass xom3-glassEdge"
                style={{ display: "block", padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,0.18)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800 }}>{l.name || l.email || l.phone || l.leadId}</div>
                  <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
                    {l.posture} • {new Date(l.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
                  {l.email || "--"} • {l.phone || "--"} • {l.source || "unknown"}
                </div>
              </Link>
            ))}
          </div>
        )}
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
