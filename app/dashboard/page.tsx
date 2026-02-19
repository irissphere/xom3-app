"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFeatureGate } from "@/lib/hooks/useFeatureGate";
import { useWallet, formatCents } from "@/lib/hooks/useWallet";
import { WORKFLOW_REGISTRY } from "@/lib/n8n/workflow-registry";
import { useAnalytics } from "@/lib/system/use-analytics";

type LeadRow = {
  leadId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  posture: string;
  updatedAt: string;
};

type TaskRow = {
  taskId: string;
  leadId: string;
  type: string;
  dueAt: string;
  status: string;
  notes: string | null;
};

type AuditRow = {
  auditId: string;
  action: string;
  entity: { type: string; id: string };
  at: string;
  actor?: { label?: string | null };
};

type IntakeStatus = {
  ok: boolean;
  tenant: string;
  counts: {
    leads: number;
    leadPosture: Record<string, number>;
    leadSource: Record<string, number>;
    tasks: { total: number; pending: number; overdue: number; completed: number };
  };
  recentLeads?: LeadRow[];
  pendingTasks?: TaskRow[];
  auditEntries?: AuditRow[];
};

type OAuthSummary = {
  ok: boolean;
  summary?: { connected: number; configured: number; total: number };
};

type SubscriptionSummary = {
  ok: boolean;
  effectiveTier?: string;
  trial?: { isActive: boolean; daysRemaining: number; expired: boolean };
};

type TwilioStatus = {
  configured: boolean;
  phoneNumber: string;
};

export default function DashboardPage() {
  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [oauth, setOauth] = useState<OAuthSummary | null>(null);
  const [sub, setSub] = useState<SubscriptionSummary | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const { checkFeature: checkWorkflows } = useFeatureGate();
  const wallet = useWallet();
  useAnalytics("/dashboard");

  const newLeads = useMemo(() => {
    const c = status?.counts?.leadPosture || {};
    return Number(c["new"] || 0);
  }, [status]);

  const workflowsAccess = checkWorkflows("workflows");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, o, subRes, tw] = await Promise.all([
          fetch("/api/intakecrm/status?extended=1", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/oauth/connections", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/subscription/status", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/twilio/outbound", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        ]);
        if (cancelled) return;
        setStatus(s?.ok ? s : null);
        setOauth(o?.ok ? o : null);
        setSub(subRes?.ok ? subRes : null);
        setTwilioStatus(tw);
      } catch {
        if (cancelled) return;
      }
    };
    load().catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const workflows = Object.values(WORKFLOW_REGISTRY);
  const activeWorkflows = workflows.filter((w) => w.active);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 40 }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>DASHBOARD</div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Your business, at a glance
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
              Leads, follow-ups, workflows, and connected services — all live.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnSecondary" href="/leads">View leads</Link>
            <Link className="xom3-btn xom3-btnPrimary" href="/social-connect">Connect socials</Link>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid3">
            <StatCard label="Total leads" value={String(status?.counts?.leads ?? "—")} />
            <StatCard label="New leads" value={String(newLeads || "—")} accent="info" />
            <StatCard label="Overdue follow-ups" value={String(status?.counts?.tasks?.overdue ?? "—")} accent="danger" />
          </div>
        </section>

        {/* Credit Balance */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <CreditBalanceWidget wallet={wallet} />
        </section>

        {/* Recent Leads + Pending Tasks */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid2">
            {/* Recent Leads */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div className="xom3-panel-title">Recent Leads</div>
                  <div className="xom3-panel-subtitle">Latest activity in your pipeline</div>
                </div>
                <Link className="xom3-btn xom3-btnSecondary" href="/leads" style={{ fontSize: 12, padding: "6px 12px" }}>
                  View all
                </Link>
              </div>
              {status?.recentLeads && status.recentLeads.length > 0 ? (
                <div style={{ display: "grid", gap: 1 }}>
                  {status.recentLeads.slice(0, 6).map((lead) => (
                    <Link
                      key={lead.leadId}
                      href={`/leads/${lead.leadId}`}
                      style={{
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        marginBottom: 4,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {lead.name || lead.email || "Unknown"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                          {lead.source || "No source"} &middot; {timeAgo(lead.updatedAt)}
                        </div>
                      </div>
                      <PosturePill posture={lead.posture} />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState message="No leads yet" action="Add your first lead" href="/leads" />
              )}
            </div>

            {/* Pending / Overdue Tasks */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div className="xom3-panel-title">Upcoming Tasks</div>
                  <div className="xom3-panel-subtitle">Follow-ups that need attention</div>
                </div>
              </div>
              {status?.pendingTasks && status.pendingTasks.length > 0 ? (
                <div style={{ display: "grid", gap: 4 }}>
                  {status.pendingTasks.slice(0, 6).map((task) => (
                    <div
                      key={task.taskId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: task.status === "overdue" ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                        border: task.status === "overdue" ? "1px solid rgba(239,68,68,0.18)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <TaskTypeIcon type={task.type} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13, textTransform: "capitalize" }}>
                          {task.type} follow-up
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                          Due {timeAgo(task.dueAt)}
                          {task.notes ? ` — ${task.notes.slice(0, 40)}` : ""}
                        </div>
                      </div>
                      <StatusPill status={task.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No pending tasks" action="Tasks appear when leads need follow-up" />
              )}
            </div>
          </div>
        </section>

        {/* Activity Feed + Integrations */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid2">
            {/* Activity Feed */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">Recent Activity</div>
              <div className="xom3-panel-subtitle">Audit trail of recent actions</div>
              {status?.auditEntries && status.auditEntries.length > 0 ? (
                <div style={{ marginTop: 14, display: "grid", gap: 2 }}>
                  {status.auditEntries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.auditId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.015)",
                      }}
                    >
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: entry.action.includes("create") ? "#22c55e" : entry.action.includes("complete") ? "#0a84ff" : "rgba(255,255,255,0.2)",
                      }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>
                          {formatAuditAction(entry.action, entry.entity.type)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                          {entry.actor?.label || "System"} &middot; {timeAgo(entry.at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 14 }}>
                  <EmptyState message="No activity yet" action="Activity appears as you work with leads and tasks" />
                </div>
              )}
            </div>

            {/* Integrations & Workflows */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">Integrations &amp; Workflows</div>
              <div className="xom3-panel-subtitle">Connected services and automation status</div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {/* Integration Status Items */}
                <IntegrationRow
                  label="Social Accounts"
                  status={oauth?.summary?.connected ? `${oauth.summary.connected} connected` : "Not connected"}
                  active={Boolean(oauth?.summary?.connected)}
                  href="/social-connect"
                />
                <IntegrationRow
                  label="SMS (Twilio)"
                  status={twilioStatus?.configured ? "Configured" : "Not configured"}
                  active={Boolean(twilioStatus?.configured)}
                />
                <IntegrationRow
                  label="n8n Workflows"
                  status={`${activeWorkflows.length} active / ${workflows.length} total`}
                  active={activeWorkflows.length > 0}
                  href="/automation"
                />
                <IntegrationRow
                  label="Subscription"
                  status={sub?.effectiveTier || "No plan"}
                  active={Boolean(sub?.effectiveTier)}
                  href="/pricing"
                />

                {/* Workflow List */}
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: "var(--text-2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Workflow Registry
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {workflows.slice(0, 6).map((wf) => (
                      <div key={wf.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.015)",
                      }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                          background: wf.active ? "#22c55e" : "rgba(255,255,255,0.15)",
                        }} />
                        <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {wf.name}
                        </div>
                        <DomainBadge domain={wf.domain} />
                      </div>
                    ))}
                    {workflows.length > 6 && (
                      <Link href="/automation" style={{ fontSize: 12, color: "var(--accent-1, #0a84ff)", textDecoration: "none", fontWeight: 600, paddingLeft: 10 }}>
                        + {workflows.length - 6} more workflows
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Next Steps + Subscription */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid2">
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">Next steps</div>
              <div className="xom3-panel-subtitle">Get value in the next 10 minutes.</div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <Step
                  done={Boolean(oauth?.summary?.connected)}
                  title="Connect your social accounts"
                  desc="So we can pull leads and publish content from one place."
                  href="/social-connect"
                />
                <Step
                  done={Boolean(status?.counts?.leads)}
                  title="Bring in your first leads"
                  desc="Add manually now; import and capture sources come next."
                  href="/leads"
                />
                <Step
                  done={false}
                  title="Turn on follow-up automation"
                  desc="Create an email + SMS sequence for new leads."
                  href="/automation"
                />
              </div>
            </div>

            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-panel-title">Subscription</div>
              <div className="xom3-panel-subtitle">
                {sub?.effectiveTier ? `Current plan: ${String(sub.effectiveTier)}` : "Current plan: —"}
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div className="xom3-subtle">Social accounts connected</div>
                  <div style={{ fontWeight: 750 }}>{oauth?.summary?.connected ?? "—"}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div className="xom3-subtle">Automations available</div>
                  <div style={{ fontWeight: 750 }}>
                    {workflowsAccess.allowed
                      ? workflowsAccess.limit === "unlimited" ? "Unlimited" : `${workflowsAccess.remaining} of ${workflowsAccess.limit}`
                      : "Not included"}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div className="xom3-subtle">Trial</div>
                  <div style={{ fontWeight: 750 }}>
                    {sub?.trial?.isActive ? `${sub.trial.daysRemaining} days left` : sub?.trial?.expired ? "Expired" : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                  <Link className="xom3-btn xom3-btnSecondary" href="/pricing">View plans</Link>
                  <Link className="xom3-btn xom3-btnPrimary" href="/pricing">Upgrade</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ——— Stat Card ——— */
function StatCard(props: { label: string; value: string; accent?: "neutral" | "info" | "danger" }) {
  const accent = props.accent || "neutral";
  const tone =
    accent === "danger"
      ? { bg: "rgba(239, 68, 68, 0.10)", border: "rgba(239, 68, 68, 0.22)" }
      : accent === "info"
        ? { bg: "rgba(10, 132, 255, 0.10)", border: "rgba(10, 132, 255, 0.22)" }
        : { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.10)" };

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
      <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12 }}>{props.label.toUpperCase()}</div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em" }}>{props.value}</div>
        <div style={{ padding: "6px 10px", borderRadius: 999, background: tone.bg, border: `1px solid ${tone.border}`, color: "var(--text-1)", fontSize: 12 }}>Live</div>
      </div>
    </div>
  );
}

/* ——— Step ——— */
function Step(props: { done: boolean; title: string; desc: string; href: string }) {
  return (
    <Link
      href={props.href}
      style={{
        textDecoration: "none", display: "flex", gap: 12, padding: "12px 12px",
        borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", alignItems: "flex-start",
      }}
    >
      <div aria-hidden="true" style={{
        width: 26, height: 26, borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)",
        background: props.done ? "rgba(34,197,94,0.16)" : "rgba(255,255,255,0.04)",
        color: props.done ? "#4ade80" : "var(--text-2)", display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1,
      }}>
        {props.done ? "✓" : "•"}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 780, color: "var(--text-0)" }}>{props.title}</div>
        <div className="xom3-subtle" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.35 }}>{props.desc}</div>
      </div>
      <div style={{ marginLeft: "auto", color: "var(--text-2)", fontWeight: 900 }}>→</div>
    </Link>
  );
}

/* ——— Credit Balance Widget ——— */
function CreditBalanceWidget(props: { wallet: ReturnType<typeof useWallet> }) {
  const { wallet } = props;
  const bgStyle = wallet.criticalBalance
    ? { background: "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))", border: "1px solid rgba(239, 68, 68, 0.25)" }
    : wallet.lowBalance
      ? { background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))", border: "1px solid rgba(251, 191, 36, 0.25)" }
      : { background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(22, 163, 74, 0.05))", border: "1px solid rgba(34, 197, 94, 0.2)" };
  const balanceColor = wallet.criticalBalance ? "#ef4444" : wallet.lowBalance ? "#fbbf24" : "#22c55e";

  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 18, ...bgStyle }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, marginBottom: 6 }}>CREDIT BALANCE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: balanceColor, fontFamily: "var(--font-mono)" }}>
              {wallet.loading ? "..." : wallet.balanceFormatted}
            </div>
            {wallet.lowBalance && !wallet.loading && (
              <div style={{
                padding: "4px 10px",
                background: wallet.criticalBalance ? "rgba(239, 68, 68, 0.2)" : "rgba(251, 191, 36, 0.2)",
                borderRadius: 6, fontSize: 11, fontWeight: 600,
                color: wallet.criticalBalance ? "#fca5a5" : "#fcd34d",
              }}>
                {wallet.criticalBalance ? "Add funds now" : "Low balance"}
              </div>
            )}
          </div>
          {!wallet.loading && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>
              {formatCents(wallet.totalSpent)} used &middot; {formatCents(wallet.totalDeposited)} added
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/credits" className="xom3-btn xom3-btnPrimary" style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(34, 197, 94, 0.25)" }}>
            Add Funds
          </Link>
          <Link href="/pricing" className="xom3-btn xom3-btnSecondary">View Pricing</Link>
        </div>
      </div>
    </div>
  );
}

/* ——— Posture Pill ——— */
function PosturePill({ posture }: { posture: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    new: { bg: "rgba(10,132,255,0.15)", color: "#60a5fa" },
    working: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
    closed: { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
    duplicate: { bg: "rgba(255,255,255,0.08)", color: "var(--text-2)" },
  };
  const s = styles[posture] || styles["new"]!;
  return (
    <div style={{ padding: "3px 8px", borderRadius: 6, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {posture}
    </div>
  );
}

/* ——— Status Pill ——— */
function StatusPill({ status }: { status: string }) {
  const isOverdue = status === "overdue";
  return (
    <div style={{
      padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap",
      background: isOverdue ? "rgba(239,68,68,0.18)" : "rgba(251,191,36,0.15)",
      color: isOverdue ? "#f87171" : "#fbbf24",
    }}>
      {status}
    </div>
  );
}

/* ——— Task Type Icon ——— */
function TaskTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { call: "☎", text: "✉", email: "📧", review: "📋" };
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", fontSize: 14, flexShrink: 0,
      background: "rgba(10,132,255,0.10)", border: "1px solid rgba(10,132,255,0.18)",
    }}>
      {icons[type] || "•"}
    </div>
  );
}

/* ——— Integration Row ——— */
function IntegrationRow(props: { label: string; status: string; active: boolean; href?: string }) {
  const inner = (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: props.active ? "#22c55e" : "rgba(255,255,255,0.15)" }} />
        <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 13 }}>{props.label}</div>
      </div>
      <div style={{ fontSize: 12, color: props.active ? "#4ade80" : "var(--text-2)", fontWeight: 600 }}>
        {props.status}
      </div>
    </div>
  );
  if (props.href) return <Link href={props.href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return inner;
}

/* ——— Domain Badge ——— */
function DomainBadge({ domain }: { domain: string }) {
  const colors: Record<string, string> = { xom3: "#0a84ff", benefitscrm: "#a78bfa", broadcast: "#f59e0b", system: "#6b7280" };
  return (
    <div style={{
      padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em",
      background: `${colors[domain] || "#6b7280"}22`, color: colors[domain] || "#6b7280",
    }}>
      {domain}
    </div>
  );
}

/* ——— Empty State ——— */
function EmptyState(props: { message: string; action: string; href?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "24px 16px" }}>
      <div style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600, marginBottom: 6 }}>{props.message}</div>
      {props.href ? (
        <Link href={props.href} style={{ fontSize: 13, color: "var(--accent-1, #0a84ff)", textDecoration: "none", fontWeight: 600 }}>
          {props.action} →
        </Link>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{props.action}</div>
      )}
    </div>
  );
}

/* ——— Helpers ——— */
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

function formatAuditAction(action: string, entityType: string): string {
  const parts = action.replace(/_/g, " ").replace(/\./g, " ");
  return `${parts} (${entityType})`;
}
