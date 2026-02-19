"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { WORKFLOW_REGISTRY, type WorkflowDefinition } from "@/lib/n8n/workflow-registry";
import { useAnalytics } from "@/lib/system/use-analytics";

type TaskRow = {
  taskId: string;
  leadId: string;
  type: string;
  dueAt: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

type IntakeStatus = {
  ok: boolean;
  counts: {
    leads: number;
    leadPosture: Record<string, number>;
    tasks: { total: number; pending: number; overdue: number; completed: number };
  };
  pendingTasks?: TaskRow[];
};

type TwilioStatus = {
  configured: boolean;
  phoneNumber: string;
};

type N8nHealth = {
  ok: boolean;
  n8n?: { connected: boolean; latencyMs: number; error?: string | null };
  summary?: { total: number; active: number; inactive: number };
};

export default function AutomationsDashboard() {
  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [n8nHealth, setN8nHealth] = useState<N8nHealth | null>(null);
  const [loading, setLoading] = useState(true);
  useAnalytics("/automations");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, tw, n8n] = await Promise.all([
          fetch("/api/intakecrm/status?extended=1", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/twilio/outbound", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
          fetch("/api/n8n/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        setStatus(s?.ok ? s : null);
        setTwilioStatus(tw);
        setN8nHealth(n8n);
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const workflows = Object.entries(WORKFLOW_REGISTRY);
  const grouped = workflows.reduce<Record<string, [string, WorkflowDefinition][]>>((acc, entry) => {
    const domain = entry[1].domain;
    if (!acc[domain]) acc[domain] = [];
    acc[domain]!.push(entry);
    return acc;
  }, {});

  const domainOrder = ["xom3", "benefitscrm", "broadcast", "system"];
  const tasks = status?.counts?.tasks || { total: 0, pending: 0, overdue: 0, completed: 0 };
  const pendingTasks = status?.pendingTasks || [];
  const activeCount = workflows.filter(([, w]) => w.active).length;

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 40 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>AUTOMATION</div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Workflows &amp; Automation
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
              n8n workflows, follow-up tasks, and integration status — all connected to live data.
            </p>
          </div>
          <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">Back to dashboard</Link>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>Loading automation data...</div>
        ) : (
          <>
            {/* Stats */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <MiniStat label="Workflows Active" value={`${activeCount} / ${workflows.length}`} color="#22c55e" />
                <MiniStat label="Tasks Pending" value={String(tasks.pending)} color="#f59e0b" />
                <MiniStat label="Tasks Overdue" value={String(tasks.overdue)} color="#ef4444" />
                <MiniStat label="Tasks Completed" value={String(tasks.completed)} color="#4ade80" />
                <MiniStat label="Total Leads" value={String(status?.counts?.leads ?? 0)} />
                <MiniStat label="SMS" value={twilioStatus?.configured ? "Active" : "Inactive"} color={twilioStatus?.configured ? "#22c55e" : "#6b7280"} />
              </div>
            </section>

            {/* Workflow Registry */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div className="xom3-panel-title">n8n Workflow Registry</div>
                <div className="xom3-panel-subtitle">All registered automation workflows and their status</div>
                <div style={{ marginTop: 16, display: "grid", gap: 18 }}>
                  {domainOrder.map((domain) => {
                    const items = grouped[domain];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={domain}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <DomainBadge domain={domain} />
                          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>
                            {items.filter(([, w]) => w.active).length} active / {items.length} total
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {items.map(([key, wf]) => (
                            <div
                              key={key}
                              style={{
                                display: "flex", alignItems: "center", gap: 12,
                                padding: "12px 14px", borderRadius: 12,
                                background: wf.active ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                                border: wf.active ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.06)",
                              }}
                            >
                              <div style={{
                                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                                background: wf.active ? "#22c55e" : "rgba(255,255,255,0.15)",
                                boxShadow: wf.active ? "0 0 8px rgba(34,197,94,0.4)" : "none",
                              }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13 }}>{wf.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{wf.description}</div>
                              </div>
                              <div style={{
                                padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: wf.active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                                color: wf.active ? "#4ade80" : "var(--text-2)",
                              }}>
                                {wf.active ? "Active" : "Inactive"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Integration Status */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-grid xom3-grid2">
                {/* SMS / Twilio Status */}
                <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                  <div className="xom3-panel-title">SMS Integration (Twilio)</div>
                  <div className="xom3-panel-subtitle">Outbound messaging capability</div>
                  <div style={{ marginTop: 14 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        background: twilioStatus?.configured ? "#22c55e" : "#ef4444",
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13 }}>
                          {twilioStatus?.configured ? "Twilio Configured" : "Twilio Not Configured"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                          {twilioStatus?.configured
                            ? `Phone number: ${twilioStatus.phoneNumber}`
                            : "Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Completion */}
                <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                  <div className="xom3-panel-title">Task Completion Rate</div>
                  <div className="xom3-panel-subtitle">Follow-up automation performance</div>
                  <div style={{ marginTop: 14 }}>
                    {tasks.total > 0 ? (
                      <>
                        <div style={{ fontSize: 36, fontWeight: 900, color: "#4ade80", fontFamily: "var(--font-mono)" }}>
                          {Math.round((tasks.completed / tasks.total) * 100)}%
                        </div>
                        <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 4,
                            width: `${(tasks.completed / tasks.total) * 100}%`,
                            background: "linear-gradient(90deg, #22c55e, #16a34a)",
                          }} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
                          {tasks.completed} of {tasks.total} tasks completed
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-2)", fontSize: 13 }}>
                        No tasks yet — tasks are auto-created when leads arrive
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* n8n Server Health */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div className="xom3-panel-title">n8n Server Health</div>
                <div className="xom3-panel-subtitle">Live connectivity status to the automation server</div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: n8nHealth?.n8n?.connected ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)", border: n8nHealth?.n8n?.connected ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(239,68,68,0.18)" }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: n8nHealth?.n8n?.connected ? "#22c55e" : "#ef4444", boxShadow: n8nHealth?.n8n?.connected ? "0 0 10px rgba(34,197,94,0.5)" : "0 0 10px rgba(239,68,68,0.4)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: n8nHealth?.n8n?.connected ? "#22c55e" : "#ef4444" }}>
                      {n8nHealth ? (n8nHealth.n8n?.connected ? "Connected" : "Disconnected") : "Checking..."}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                      {n8nHealth?.n8n?.latencyMs ? `Latency: ${n8nHealth.n8n.latencyMs}ms` : ""}
                      {n8nHealth?.n8n?.error ? ` — ${n8nHealth.n8n.error}` : ""}
                    </div>
                  </div>
                  {n8nHealth?.summary && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-0)" }}>{n8nHealth.summary.active}/{n8nHealth.summary.total}</div>
                      <div style={{ fontSize: 10, color: "var(--text-2)" }}>workflows active</div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Recent Tasks */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div className="xom3-panel-title">Pending &amp; Overdue Tasks</div>
                    <div className="xom3-panel-subtitle">Follow-ups that need attention</div>
                  </div>
                  <Link className="xom3-btn xom3-btnSecondary" href="/leads" style={{ fontSize: 12, padding: "6px 12px" }}>
                    View all leads
                  </Link>
                </div>
                {pendingTasks.length > 0 ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    {pendingTasks.slice(0, 10).map((task) => (
                      <div
                        key={task.taskId}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 12px", borderRadius: 10,
                          background: task.status === "overdue" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                          border: task.status === "overdue" ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0,
                          background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.18)",
                        }}>
                          {taskIcon(task.type)}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13, textTransform: "capitalize" }}>
                            {task.type} follow-up
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                            Due {timeAgo(task.dueAt)}
                            {task.notes ? ` — ${task.notes.slice(0, 50)}` : ""}
                          </div>
                        </div>
                        <div style={{
                          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                          background: task.status === "overdue" ? "rgba(239,68,68,0.18)" : "rgba(251,191,36,0.15)",
                          color: task.status === "overdue" ? "#f87171" : "#fbbf24",
                        }}>
                          {task.status}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "28px 16px" }}>
                    <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>No pending tasks</div>
                    <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
                      Tasks appear automatically when leads need follow-up
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/* ——— Mini Stat ——— */
function MiniStat(props: { label: string; value: string; color?: string }) {
  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>{props.label.toUpperCase()}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: props.color || "var(--text-0)" }}>
        {props.value}
      </div>
    </div>
  );
}

/* ——— Domain Badge ——— */
function DomainBadge({ domain }: { domain: string }) {
  const colors: Record<string, string> = { xom3: "#0a84ff", benefitscrm: "#a78bfa", broadcast: "#f59e0b", system: "#6b7280" };
  const labels: Record<string, string> = { xom3: "XOM3 Core", benefitscrm: "Benefits CRM", broadcast: "Broadcast", system: "System" };
  return (
    <div style={{
      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      background: `${colors[domain] || "#6b7280"}22`, color: colors[domain] || "#6b7280",
    }}>
      {labels[domain] || domain}
    </div>
  );
}

/* ——— Helpers ——— */
function taskIcon(type: string): string {
  const icons: Record<string, string> = { call: "☎", text: "✉", email: "📧", review: "📋" };
  return icons[type] || "•";
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) {
    const future = Math.abs(mins);
    if (future < 60) return `in ${future}m`;
    const hrs = Math.floor(future / 60);
    if (hrs < 24) return `in ${hrs}h`;
    return `in ${Math.floor(hrs / 24)}d`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
