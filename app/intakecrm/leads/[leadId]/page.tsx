"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Lead = {
  leadId: string;
  airtableId?: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  posture: string;
  status: string | null;
  assignedTo: string | null;
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
  notes: string | null;
};

type CrossBaseLink = {
  base: string;
  label: string;
  name: string | null;
  url: string;
};

export default function IntakeCrmLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = String(params?.leadId || "");
  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [crossBaseLinks, setCrossBaseLinks] = useState<CrossBaseLink[]>([]);
  const [error, setError] = useState<string | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-xom3-tenant": "xom3",
      "x-xom3-role": "operator",
      "x-xom3-actor-label": "intakecrm_lead_detail",
    }),
    []
  );

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        if (!leadId) return;
        const res = await fetch(`/api/intakecrm/leads/${encodeURIComponent(leadId)}`, { headers, cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "load_failed");
        if (stopped) return;
        setLead(json.lead || null);
        setTasks(Array.isArray(json.tasks) ? json.tasks : []);
        setError(null);
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "load_failed");
      }
    };
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 8000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [leadId, headers]);

  useEffect(() => {
    if (!leadId) return;
    fetch(`/api/intakecrm/leads/${encodeURIComponent(leadId)}/cross-base`, { headers, cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json?.links)) setCrossBaseLinks(json.links);
      })
      .catch(() => {});
  }, [leadId, headers]);

  const completeTask = async (taskId: string) => {
    await fetch(`/api/intakecrm/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "completed" }),
    });
  };

  const airtableId = lead?.airtableId || (leadId.startsWith("opus1_") ? leadId.slice(6) : null);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 26, paddingBottom: 28 }}>
        <header className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="xom3-mono" style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--text-2)" }}>
                INTAKECRM · LEAD DETAIL
              </div>
              <h1 style={{ marginTop: 10, marginBottom: 6, fontSize: 24, fontWeight: 800 }}>{lead?.name || leadId}</h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {lead?.status && (
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "rgb(251, 191, 36)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {lead.status}
                  </span>
                )}
                {lead?.assignedTo && (
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: lead.assignedTo === "Preston" ? "rgba(168, 85, 247, 0.15)" : "rgba(20, 184, 166, 0.15)",
                    border: `1px solid ${lead.assignedTo === "Preston" ? "rgba(168, 85, 247, 0.3)" : "rgba(20, 184, 166, 0.3)"}`,
                    color: lead.assignedTo === "Preston" ? "rgb(192, 132, 252)" : "rgb(94, 234, 212)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}>
                    {lead.assignedTo}
                  </span>
                )}
                <span className="xom3-subtle" style={{ fontSize: 12 }}>{leadId}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {airtableId && (
                <a
                  href={`https://airtable.com/appCkU8L3sdmqaAmI/tbl9mQDZJvL06ixo4/${airtableId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xom3-btn xom3-btnSecondary"
                  style={{ fontSize: 13 }}
                >
                  Open in Airtable
                </a>
              )}
              <Link className="xom3-btn xom3-btnPrimary" href="/intakecrm">
                Back
              </Link>
            </div>
          </div>
        </header>

        {error ? (
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14, borderColor: "rgba(239,68,68,0.22)" }}>
            <div className="xom3-mono" style={{ color: "rgb(248,113,113)" }}>
              {error}
            </div>
          </div>
        ) : !lead ? (
          <div style={{ marginTop: 14 }} className="xom3-subtle">
            loading...
          </div>
        ) : (
          <>
            {/* Cross-Base Links */}
            {crossBaseLinks.length > 0 && (
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 14, marginTop: 14, borderLeft: "3px solid rgba(168, 85, 247, 0.5)" }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11, marginBottom: 8 }}>
                  LINKED HISTORY
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {crossBaseLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "rgba(168, 85, 247, 0.1)",
                        border: "1px solid rgba(168, 85, 247, 0.25)",
                        color: "rgb(192, 132, 252)",
                        textDecoration: "none",
                        fontSize: 12,
                      }}
                    >
                      {link.label}
                      {link.name && <span style={{ color: "var(--text-2)" }}>({link.name})</span>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="xom3-grid xom3-grid2" style={{ marginTop: 14 }}>
              {/* Contact Info */}
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
                  CONTACT
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <Row label="Email" value={lead.email || "—"} />
                  <Row label="Phone" value={lead.phone || "—"} />
                  <Row label="State" value={lead.state || "—"} />
                  <Row label="ZIP" value={lead.zip || "—"} />
                  <Row label="Source" value={lead.source || "—"} />
                </div>
              </div>

              {/* Outreach Stats */}
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
                <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
                  OUTREACH
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <Row label="Messages Sent" value={String(lead.messagesSent ?? 0)} />
                  <Row label="Call Attempts" value={String(lead.totalCallAttempts ?? 0)} />
                  <Row label="Responses" value={String(lead.responseCount ?? 0)} />
                  <Row label="Last Contact" value={lead.lastContact ? formatRelativeTime(lead.lastContact) : "—"} />
                  <Row label="Created" value={formatRelativeTime(lead.createdAt)} />
                  <Row label="Updated" value={formatRelativeTime(lead.updatedAt)} />
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 16, marginTop: 14 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>
                TASKS
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {tasks.length === 0 ? (
                  <div className="xom3-subtle">No tasks yet.</div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.taskId} style={{ border: "1px solid var(--border-0)", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700 }}>
                          {t.type} · <span className="xom3-subtle">{t.status}</span>
                        </div>
                        <button className="xom3-btn xom3-btnSecondary" onClick={() => completeTask(t.taskId)} disabled={t.status === "completed"}>
                          Mark complete
                        </button>
                      </div>
                      <div className="xom3-subtle" style={{ marginTop: 6 }}>
                        due {new Date(t.dueAt).toLocaleString()}
                      </div>
                      {t.notes ? (
                        <div className="xom3-subtle" style={{ marginTop: 6 }}>
                          {t.notes}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>
        {props.label}
      </div>
      <div style={{ color: "var(--text-0)", fontSize: 13 }}>{props.value}</div>
    </div>
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
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
