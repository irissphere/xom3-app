"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type IntakeStatus = {
  ok: boolean;
  counts: {
    leads: number;
    leadPosture: Record<string, number>;
    leadSource: Record<string, number>;
    tasks: { total: number; pending: number; overdue: number; completed: number };
  };
  auditEntries?: AuditRow[];
  leadsByDay?: Record<string, number>;
};

type AuditRow = {
  auditId: string;
  action: string;
  entity: { type: string; id: string };
  at: string;
  actor?: { label?: string | null };
};

export default function AnalyticsPage() {
  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/intakecrm/status?extended=1", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        setStatus(json?.ok ? json : null);
      } catch {
        if (cancelled) return;
        setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const counts = status?.counts;
  const posture = counts?.leadPosture || {};
  const source = counts?.leadSource || {};
  const tasks = counts?.tasks || { total: 0, pending: 0, overdue: 0, completed: 0 };
  const leadsByDay = status?.leadsByDay || {};
  const auditEntries = status?.auditEntries || [];

  const totalLeads = counts?.leads || 0;
  const postureEntries = Object.entries(posture).sort((a, b) => b[1] - a[1]);
  const sourceEntries = Object.entries(source).sort((a, b) => b[1] - a[1]);
  const maxSourceCount = sourceEntries.length > 0 ? sourceEntries[0]![1] : 1;

  const dayEntries = Object.entries(leadsByDay).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDayCount = dayEntries.length > 0 ? Math.max(...dayEntries.map(([, v]) => v)) : 1;

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 40 }}>
        <header>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>ANALYTICS</div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>Analytics</h1>
          <p className="xom3-subtle" style={{ margin: 0, maxWidth: 820 }}>
            Real-time metrics from your pipeline, tasks, and lead sources.
          </p>
        </header>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>Loading analytics...</div>
        ) : (
          <>
            {/* Top Stats */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                <MiniStat label="Total Leads" value={totalLeads} />
                <MiniStat label="New" value={posture["new"] || 0} color="#60a5fa" />
                <MiniStat label="Working" value={posture["working"] || 0} color="#fbbf24" />
                <MiniStat label="Closed" value={posture["closed"] || 0} color="#4ade80" />
                <MiniStat label="Tasks Pending" value={tasks.pending} color="#f59e0b" />
                <MiniStat label="Tasks Overdue" value={tasks.overdue} color="#ef4444" />
              </div>
            </section>

            {/* Posture Breakdown + Source Distribution */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-grid xom3-grid2">
                {/* Posture Breakdown */}
                <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                  <div className="xom3-panel-title">Lead Posture Breakdown</div>
                  <div className="xom3-panel-subtitle">Distribution of leads by status</div>
                  {totalLeads > 0 ? (
                    <div style={{ marginTop: 16 }}>
                      {/* Horizontal stacked bar */}
                      <div style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
                        {postureEntries.map(([key, count]) => (
                          <div
                            key={key}
                            title={`${key}: ${count}`}
                            style={{
                              width: `${(count / totalLeads) * 100}%`,
                              background: postureColor(key),
                              minWidth: count > 0 ? 4 : 0,
                              transition: "width 300ms ease",
                            }}
                          />
                        ))}
                      </div>
                      {/* Legend */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                        {postureEntries.map(([key, count]) => (
                          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: postureColor(key) }} />
                            <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600, textTransform: "capitalize" }}>
                              {key} <span style={{ color: "var(--text-2)", fontWeight: 500 }}>({count})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyAnalytics message="No leads yet" />
                  )}
                </div>

                {/* Source Distribution */}
                <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                  <div className="xom3-panel-title">Leads by Source</div>
                  <div className="xom3-panel-subtitle">Where your leads are coming from</div>
                  {sourceEntries.length > 0 ? (
                    <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                      {sourceEntries.map(([key, count]) => (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600, textTransform: "capitalize" }}>{key}</div>
                            <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>{count}</div>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${(count / maxSourceCount) * 100}%`,
                              background: "linear-gradient(90deg, #0a84ff, #6366f1)",
                              transition: "width 300ms ease",
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyAnalytics message="No source data yet" />
                  )}
                </div>
              </div>
            </section>

            {/* Task Metrics */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div className="xom3-panel-title">Task Performance</div>
                <div className="xom3-panel-subtitle">Follow-up tasks status overview</div>
                {tasks.total > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
                      <TaskMetric label="Total" value={tasks.total} color="var(--text-1)" />
                      <TaskMetric label="Pending" value={tasks.pending} color="#f59e0b" />
                      <TaskMetric label="Overdue" value={tasks.overdue} color="#ef4444" />
                      <TaskMetric label="Completed" value={tasks.completed} color="#22c55e" />
                    </div>
                    {/* Completion bar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 5,
                          width: tasks.total > 0 ? `${(tasks.completed / tasks.total) * 100}%` : "0%",
                          background: "linear-gradient(90deg, #22c55e, #16a34a)",
                          transition: "width 300ms ease",
                        }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", minWidth: 40, textAlign: "right" }}>
                        {tasks.total > 0 ? `${Math.round((tasks.completed / tasks.total) * 100)}%` : "0%"}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>Completion rate</div>
                  </div>
                ) : (
                  <EmptyAnalytics message="No tasks created yet" />
                )}
              </div>
            </section>

            {/* Leads Over Time */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div className="xom3-panel-title">Leads Over Time</div>
                <div className="xom3-panel-subtitle">New leads per day (last 30 days)</div>
                {dayEntries.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120 }}>
                      {dayEntries.map(([day, count]) => (
                        <div
                          key={day}
                          title={`${day}: ${count} lead${count !== 1 ? "s" : ""}`}
                          style={{
                            flex: 1,
                            minWidth: 4,
                            height: `${Math.max((count / maxDayCount) * 100, 4)}%`,
                            background: "linear-gradient(180deg, #0a84ff, rgba(10,132,255,0.4))",
                            borderRadius: "3px 3px 0 0",
                            transition: "height 300ms ease",
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--text-2)" }}>{dayEntries[0]?.[0] || ""}</div>
                      <div style={{ fontSize: 10, color: "var(--text-2)" }}>{dayEntries[dayEntries.length - 1]?.[0] || ""}</div>
                    </div>
                  </div>
                ) : (
                  <EmptyAnalytics message="No lead data in the last 30 days" />
                )}
              </div>
            </section>

            {/* Audit Timeline */}
            <section className="xom3-section" style={{ marginTop: 14 }}>
              <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
                <div className="xom3-panel-title">Recent Activity</div>
                <div className="xom3-panel-subtitle">Audit trail from your CRM</div>
                {auditEntries.length > 0 ? (
                  <div style={{ marginTop: 14, display: "grid", gap: 2 }}>
                    {auditEntries.slice(0, 12).map((entry) => (
                      <div
                        key={entry.auditId}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.015)",
                        }}
                      >
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: entry.action.includes("create") ? "#22c55e" : entry.action.includes("complete") ? "#0a84ff" : "rgba(255,255,255,0.2)",
                        }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>
                            {entry.action.replace(/_/g, " ")} ({entry.entity.type})
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                            {entry.actor?.label || "System"} &middot; {timeAgo(entry.at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyAnalytics message="No activity recorded yet" />
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
function MiniStat(props: { label: string; value: number; color?: string }) {
  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>{props.label.toUpperCase()}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", color: props.color || "var(--text-0)" }}>
        {props.value}
      </div>
    </div>
  );
}

/* ——— Task Metric ——— */
function TaskMetric(props: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 24, fontWeight: 900, color: props.color }}>{props.value}</div>
      <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 600, marginTop: 2 }}>{props.label}</div>
    </div>
  );
}

/* ——— Empty Analytics ——— */
function EmptyAnalytics(props: { message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 16px" }}>
      <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 600 }}>{props.message}</div>
      <Link href="/leads" style={{ fontSize: 12, color: "var(--accent-1, #0a84ff)", textDecoration: "none", fontWeight: 600, marginTop: 6, display: "inline-block" }}>
        Go to leads →
      </Link>
    </div>
  );
}

/* ——— Helpers ——— */
function postureColor(key: string): string {
  const map: Record<string, string> = {
    new: "#0a84ff",
    working: "#f59e0b",
    closed: "#22c55e",
    duplicate: "#6b7280",
    updated: "#8b5cf6",
  };
  return map[key] || "#6b7280";
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
