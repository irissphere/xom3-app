"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import SurfaceFrame from "@/app/components/SurfaceFrame";

type Lead = {
  leadId: string;
  airtableId?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  posture: string;
  status: string | null;
  assignedTo: string | null;
  source: string | null;
  messagesSent: number | null;
  totalCallAttempts: number | null;
  responseCount: number | null;
  state: string | null;
  zip: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastContact: string | null;
};

type Task = {
  taskId: string;
  leadId: string;
  type: string;
  dueAt: string;
  status: string;
  assignedTo: string | null;
};

type Status = {
  ok: boolean;
  tenant: string;
  counts: {
    leads: number;
    leadPosture: Record<string, number>;
    leadSource: Record<string, number>;
    leadsToday: number;
    leadsThisWeek: number;
    tasks: { total: number; pending: number; overdue: number; completed: number };
  };
};

const POSTURE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  new: { bg: "rgba(59, 130, 246, 0.15)", fg: "rgb(96, 165, 250)", border: "rgba(59, 130, 246, 0.3)" },
  working: { bg: "rgba(245, 158, 11, 0.15)", fg: "rgb(251, 191, 36)", border: "rgba(245, 158, 11, 0.3)" },
  closed: { bg: "rgba(34, 197, 94, 0.15)", fg: "rgb(74, 222, 128)", border: "rgba(34, 197, 94, 0.3)" },
};

const STATUS_OPTIONS = ["", "New Lead", "Nurture", "Contacted", "Qualified", "Hot Lead", "Working", "Appointment", "Enrolled", "Not Interested"];
const PERSONA_OPTIONS = ["", "Preston", "Jay"];

export default function IntakeCrmPage() {
  const [tenant] = useState("xom3");
  const [status, setStatus] = useState<Status | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPersona, setFilterPersona] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intake, setIntake] = useState({ name: "", email: "", phone: "", source: "manual_operator" });
  const [intakePosture, setIntakePosture] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-xom3-tenant": tenant,
      "x-xom3-role": "operator",
      "x-xom3-actor-label": "intakecrm_ui",
    }),
    [tenant]
  );

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filterStatus) params.set("status", filterStatus);
      if (filterPersona) params.set("persona", filterPersona);

      const [sRes, lRes, tRes] = await Promise.all([
        fetch("/api/intakecrm/status", { headers, cache: "no-store" }),
        fetch(`/api/intakecrm/leads?${params.toString()}`, { headers, cache: "no-store" }),
        fetch("/api/intakecrm/tasks", { headers, cache: "no-store" }),
      ]);
      const sJson = await sRes.json();
      const lJson = await lRes.json();
      const tJson = await tRes.json();
      setStatus(sJson?.ok ? sJson : null);
      setLeads(Array.isArray(lJson?.items) ? lJson.items : []);
      setTasks(Array.isArray(tJson?.items) ? tJson.items : []);
    } catch {
      setStatus(null);
    }
  }, [headers, q, filterStatus, filterPersona]);

  useEffect(() => {
    let stopped = false;
    const tick = () => {
      if (!stopped) fetchData();
    };
    tick();
    const interval = setInterval(tick, 8000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [fetchData]);

  const submitIntake = async () => {
    setIntakePosture("sending");
    try {
      const res = await fetch("/api/intakecrm/intake", { method: "POST", headers, body: JSON.stringify(intake) });
      if (!res.ok) throw new Error("request_failed");
      setIntakePosture("sent");
      setIntake({ name: "", email: "", phone: "", source: "manual_operator" });
      setTimeout(() => setIntakePosture("idle"), 1200);
      fetchData();
    } catch {
      setIntakePosture("error");
      setTimeout(() => setIntakePosture("idle"), 1600);
    }
  };

  const postureCounts = status?.counts?.leadPosture || {};
  const totalLeads = status?.counts?.leads ?? 0;

  return (
    <SurfaceFrame
      title="intakecrm"
      description="CRM Lead Management — Opus 1 Pipeline"
      activation="active"
      links={[
        { href: "/intakecrm/leads", label: "Leads" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/social", label: "Social Posting" },
        { href: "/console", label: "Operator Console" },
      ]}
      footerNote={`Connected to Opus 1 Airtable · ${totalLeads} total leads`}
    >
      {/* Summary Bar */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SummaryCard
          label="Total Leads"
          value={String(totalLeads)}
          tone="neutral"
          active={!filterStatus && !filterPersona}
          onClick={() => { setFilterStatus(""); setFilterPersona(""); }}
        />
        {Object.entries(postureCounts).map(([posture, count]) => (
          <SummaryCard
            key={posture}
            label={posture}
            value={String(count)}
            tone={posture as "new" | "working" | "closed"}
            active={false}
          />
        ))}
        <SummaryCard
          label="Today"
          value={String(status?.counts?.leadsToday ?? 0)}
          tone="neutral"
          active={false}
        />
        <SummaryCard
          label="This Week"
          value={String(status?.counts?.leadsThisWeek ?? 0)}
          tone="neutral"
          active={false}
        />
        {(status?.counts?.tasks?.overdue ?? 0) > 0 && (
          <SummaryCard
            label="Overdue Tasks"
            value={String(status?.counts?.tasks?.overdue)}
            tone="danger"
            active={false}
          />
        )}
      </div>

      {/* Filters & Search */}
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            style={inputStyle({ flex: "1 1 200px" })}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, phone..."
          />
          <select
            style={selectStyle()}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            title="Filter by lead status"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            style={selectStyle()}
            value={filterPersona}
            onChange={(e) => setFilterPersona(e.target.value)}
            title="Filter by assigned persona"
          >
            <option value="">All Personas</option>
            {PERSONA_OPTIONS.filter(Boolean).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            className="xom3-btn xom3-btnSecondary"
            style={{ fontSize: 13 }}
            onClick={() => setIntakeOpen(!intakeOpen)}
          >
            {intakeOpen ? "Close Intake" : "+ New Lead"}
          </button>
        </div>
      </div>

      {/* Collapsible Intake Form */}
      {intakeOpen && (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 10, borderLeft: "3px solid rgba(59, 130, 246, 0.5)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Manual Lead Intake</div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
              posture: {intakePosture}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Name">
              <input
                style={inputStyle()}
                value={intake.name}
                onChange={(e) => setIntake((s) => ({ ...s, name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </Field>
            <Field label="Source">
              <input
                style={inputStyle()}
                value={intake.source}
                onChange={(e) => setIntake((s) => ({ ...s, source: e.target.value }))}
                placeholder="manual_operator"
              />
            </Field>
            <Field label="Email">
              <input
                style={inputStyle()}
                value={intake.email}
                onChange={(e) => setIntake((s) => ({ ...s, email: e.target.value }))}
                placeholder="jane@company.com"
              />
            </Field>
            <Field label="Phone">
              <input
                style={inputStyle()}
                value={intake.phone}
                onChange={(e) => setIntake((s) => ({ ...s, phone: e.target.value }))}
                placeholder="+15551234567"
              />
            </Field>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="xom3-btn xom3-btnSecondary" onClick={() => setIntakeOpen(false)}>
              Cancel
            </button>
            <button className="xom3-btn xom3-btnPrimary" onClick={submitIntake} disabled={intakePosture === "sending"}>
              Submit Intake
            </button>
          </div>
        </div>
      )}

      {/* Tasks Summary (compact) */}
      {tasks.length > 0 && (
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>TASKS</span>
              <span className="xom3-subtle" style={{ fontSize: 13 }}>
                {status?.counts?.tasks?.pending ?? 0} pending · {status?.counts?.tasks?.overdue ?? 0} overdue · {status?.counts?.tasks?.completed ?? 0} done
              </span>
            </div>
            <Link className="xom3-btn xom3-btnSecondary" href="/intakecrm/tasks" style={{ fontSize: 12 }}>
              View Queue
            </Link>
          </div>
        </div>
      )}

      {/* Lead Table */}
      <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ fontWeight: 750, fontSize: 15 }}>
            Leads
            {(filterStatus || filterPersona) && (
              <span className="xom3-subtle" style={{ fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
                filtered: {[filterStatus, filterPersona].filter(Boolean).join(", ")}
                <button
                  onClick={() => { setFilterStatus(""); setFilterPersona(""); }}
                  style={{ background: "none", border: "none", color: "rgb(96, 165, 250)", cursor: "pointer", marginLeft: 6, fontSize: 12 }}
                >
                  clear
                </button>
              </span>
            )}
          </div>
          <div className="xom3-subtle" style={{ fontSize: 13 }}>{leads.length} showing</div>
        </div>
        {leads.length === 0 ? (
          <div className="xom3-subtle" style={{ padding: "20px 0", textAlign: "center" }}>
            {q || filterStatus || filterPersona ? "No leads match your filters." : "Loading leads from Opus 1..."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
                  <th style={thStyle}>Lead</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Persona</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Source</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>Msgs</th>
                  <th style={thStyle}>Last Contact</th>
                  <th style={thStyle}>Airtable</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 100).map((l) => {
                  const postureColor = POSTURE_COLORS[l.posture] || POSTURE_COLORS.new;
                  return (
                    <tr key={l.leadId} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={tdStyle}>
                        <Link style={linkStyle()} href={`/intakecrm/leads/${encodeURIComponent(l.leadId)}`}>
                          {l.name || l.email || l.phone || l.leadId}
                        </Link>
                        {l.state && (
                          <span className="xom3-subtle" style={{ fontSize: 11, marginLeft: 6 }}>{l.state}</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: postureColor.bg,
                          border: `1px solid ${postureColor.border}`,
                          color: postureColor.fg,
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                        }}>
                          {l.status || l.posture}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {l.assignedTo ? (
                          <span style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: l.assignedTo === "Preston" ? "rgba(168, 85, 247, 0.15)" : "rgba(20, 184, 166, 0.15)",
                            border: `1px solid ${l.assignedTo === "Preston" ? "rgba(168, 85, 247, 0.3)" : "rgba(20, 184, 166, 0.3)"}`,
                            color: l.assignedTo === "Preston" ? "rgb(192, 132, 252)" : "rgb(94, 234, 212)",
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                          }}>
                            {l.assignedTo}
                          </span>
                        ) : (
                          <span className="xom3-subtle" style={{ fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div className="xom3-subtle" style={{ fontSize: 12 }}>{l.email || "—"}</div>
                        <div className="xom3-subtle" style={{ fontSize: 12 }}>{l.phone || "—"}</div>
                      </td>
                      <td style={tdStyle}>
                        <span className="xom3-subtle" style={{ fontSize: 12 }}>{l.source || "—"}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
                          {l.messagesSent ?? 0}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="xom3-subtle" style={{ fontSize: 12 }}>
                          {l.lastContact ? formatRelativeTime(l.lastContact) : l.updatedAt ? formatRelativeTime(l.updatedAt) : "—"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {l.airtableId && (
                          <a
                            href={`https://airtable.com/appCkU8L3sdmqaAmI/tbl9mQDZJvL06ixo4/${l.airtableId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "rgba(96, 165, 250, 0.8)", textDecoration: "none", fontSize: 11 }}
                          >
                            Open
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {leads.length > 100 && (
          <div className="xom3-subtle" style={{ marginTop: 10, fontSize: 12, textAlign: "center" }}>
            Showing 100 of {leads.length} leads. Use filters to narrow results.
          </div>
        )}
      </div>
    </SurfaceFrame>
  );
}

function SummaryCard(props: { label: string; value: string; tone?: string; active?: boolean; onClick?: () => void }) {
  const colors = POSTURE_COLORS[props.tone || ""] || {
    bg: props.tone === "danger" ? "rgba(239, 68, 68, 0.12)" : "rgba(255,255,255,0.04)",
    fg: props.tone === "danger" ? "rgb(248, 113, 113)" : "var(--text-1)",
    border: props.tone === "danger" ? "rgba(239, 68, 68, 0.22)" : "rgba(255,255,255,0.1)",
  };
  return (
    <div
      onClick={props.onClick}
      className="xom3-glass"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: `1px solid ${props.active ? "rgba(96, 165, 250, 0.4)" : colors.border}`,
        background: props.active ? "rgba(59, 130, 246, 0.08)" : colors.bg,
        cursor: props.onClick ? "pointer" : "default",
        minWidth: 80,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: colors.fg }}>{props.value}</div>
      <div className="xom3-mono" style={{ fontSize: 10, color: "var(--text-2)", marginTop: 2, textTransform: "capitalize" }}>
        {props.label}
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
        {props.label}
      </div>
      {props.children}
    </label>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    height: 38,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
    fontSize: 13,
    ...extra,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    height: 38,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "var(--text-0)",
    outline: "none",
    fontSize: 13,
    minWidth: 130,
    cursor: "pointer",
  };
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 6px",
  verticalAlign: "top",
};

function linkStyle(): React.CSSProperties {
  return { color: "color-mix(in srgb, var(--xom3-primary) 80%, white)", textDecoration: "none", fontWeight: 600 };
}
