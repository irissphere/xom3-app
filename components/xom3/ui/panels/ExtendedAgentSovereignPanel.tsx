"use client";

import { useState, useEffect, useCallback } from "react";
import { OperatorPanelFrame, PostureChip, PanelError } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";

interface AgentSummary {
  id: string;
  name: string;
  icon: string;
  status: "idle" | "active" | "error" | "disabled";
}

interface SovereignSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetRevenue?: number;
  stats: {
    totalAgents: number;
    active: number;
    idle: number;
    error: number;
  };
  agents: AgentSummary[];
}

interface AgentExecution {
  id: string;
  agentId: string;
  sovereignId: string;
  action: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
}

interface OverviewData {
  timestamp: string;
  summary: {
    totalSovereigns: number;
    totalAgents: number;
    agentsByStatus: {
      active: number;
      idle: number;
      error: number;
      disabled: number;
    };
    executions: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
  };
  sovereigns: SovereignSummary[];
  recentExecutions: AgentExecution[];
}

interface ExtendedAgentSovereignPanelProps {
  refreshMs?: number;
}

export default function ExtendedAgentSovereignPanel({ refreshMs = 10000 }: ExtendedAgentSovereignPanelProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [expandedSovereign, setExpandedSovereign] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/agents/overview", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        throw new Error(`Failed to load agents: ${res.statusText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load agents";
      console.error("Failed to load agents overview:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, refreshMs);
    return () => clearInterval(interval);
  }, [loadOverview, refreshMs]);

  async function executeAgentAction(agentId: string, action: string) {
    setExecuting(agentId);
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: {} }),
      });

      const result = await res.json();
      if (result.success) {
        setTimeout(() => loadOverview(), 500);
      } else {
        setError(`Agent ${agentId}: ${result.error || "Execution failed"}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution failed";
      setError(`Failed to execute agent: ${message}`);
    } finally {
      setExecuting(null);
    }
  }

  async function executeSovereignAction(sovereignId: string, action: string) {
    setExecuting(sovereignId);
    try {
      const res = await fetch(`/api/agents/sovereign/${encodeURIComponent(sovereignId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: {} }),
      });

      const result = await res.json();
      if (result.success) {
        setTimeout(() => loadOverview(), 500);
      } else {
        setError(`Sovereign ${sovereignId}: ${result.summary?.failed || 0} agents failed`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Execution failed";
      setError(`Failed to execute sovereign action: ${message}`);
    } finally {
      setExecuting(null);
    }
  }

  function getStatusTone(status: string): "ok" | "missing" | "error" | "degraded" | "neutral" {
    switch (status) {
      case "active":
      case "completed":
        return "ok";
      case "idle":
      case "pending":
        return "neutral";
      case "error":
      case "failed":
        return "error";
      case "running":
        return "degraded";
      default:
        return "neutral";
    }
  }

  const hintText = data
    ? `${data.summary.totalSovereigns} sovereigns • ${data.summary.totalAgents} agents • ${data.summary.executions.successRate}% success`
    : "loading…";

  return (
    <OperatorPanelFrame
      title="Extended Agent Sovereigns"
      hint={hintText}
      right={
        <button className="xom3-btn xom3-btnSecondary" onClick={loadOverview} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error && <PanelError label="Agent system degraded" error={error} />}

      {loading && !data ? (
        <div className="xom3-subtle" style={{ padding: 20, textAlign: "center" }}>
          Loading extended agent system...
        </div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard label="Total Agents" value={data.summary.totalAgents} color="#00D9FF" />
            <StatCard label="Active" value={data.summary.agentsByStatus.active} color="#22c55e" />
            <StatCard label="Idle" value={data.summary.agentsByStatus.idle} color="#8b92a7" />
            <StatCard label="Errors" value={data.summary.agentsByStatus.error} color="#ef4444" />
            <StatCard label="Success Rate" value={`${data.summary.executions.successRate}%`} color="#9B7EDE" />
          </div>

          {/* Sovereigns Grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text-0)" }}>
              Agent Sovereigns
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {data.sovereigns.map((sovereign) => (
                <SovereignCard
                  key={sovereign.id}
                  sovereign={sovereign}
                  expanded={expandedSovereign === sovereign.id}
                  onToggle={() => setExpandedSovereign(expandedSovereign === sovereign.id ? null : sovereign.id)}
                  onExecute={(action) => executeSovereignAction(sovereign.id, action)}
                  onAgentExecute={(agentId, action) => executeAgentAction(agentId, action)}
                  executing={executing}
                  getStatusTone={getStatusTone}
                />
              ))}
            </div>
          </div>

          {/* Recent Executions */}
          {data.recentExecutions.length > 0 && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text-0)" }}>
                Recent Executions
              </div>
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                {data.recentExecutions.slice(0, 10).map((exec) => (
                  <div
                    key={exec.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-1)" }}>
                        {exec.agentId}
                      </span>
                      <span style={{ color: "var(--text-2)" }}>→</span>
                      <span style={{ color: "var(--text-2)" }}>{exec.action}</span>
                    </div>
                    <PostureChip label={exec.status} tone={getStatusTone(exec.status)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}
    </OperatorPanelFrame>
  );
}

// Sub-components
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      className="xom3-glass"
      style={{
        padding: 14,
        borderRadius: 10,
        borderLeft: `3px solid ${color}`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 4, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

interface SovereignCardProps {
  sovereign: SovereignSummary;
  expanded: boolean;
  onToggle: () => void;
  onExecute: (action: string) => void;
  onAgentExecute: (agentId: string, action: string) => void;
  executing: string | null;
  getStatusTone: (status: string) => "ok" | "missing" | "error" | "degraded" | "neutral";
}

function SovereignCard({
  sovereign,
  expanded,
  onToggle,
  onExecute,
  onAgentExecute,
  executing,
  getStatusTone,
}: SovereignCardProps) {
  const actions: Record<string, string[]> = {
    social: ["analyze_performance", "scan_trends", "get_trending"],
    marketing: ["get_pipeline", "score_leads"],
    finance: ["get_positions", "assess_risk", "get_roi", "analyze_sentiment"],
    revenue: ["analyze_revenue", "predict_churn"],
    commerce: ["get_subscriptions"],
    compliance: ["scan_compliance", "analyze_tax"],
    infrastructure: ["health_check", "scan_threats", "get_metrics", "analyze_costs"],
  };

  const sovereignActions = actions[sovereign.id] || ["health_check"];

  return (
    <div
      className="xom3-glass"
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 14,
          borderLeft: `4px solid ${sovereign.color}`,
          cursor: "pointer",
          background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
        }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{sovereign.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: 14 }}>{sovereign.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
                {sovereign.stats.totalAgents} agents • {sovereign.stats.active} active
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {sovereign.targetRevenue && (
              <div style={{ fontSize: 10, color: sovereign.color, fontFamily: "var(--font-mono)" }}>
                ${(sovereign.targetRevenue / 1000).toFixed(0)}k target
              </div>
            )}
            <span style={{ color: "var(--text-2)", fontSize: 12 }}>{expanded ? "▼" : "▶"}</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <MiniStat label="Active" value={sovereign.stats.active} color="#22c55e" />
          <MiniStat label="Idle" value={sovereign.stats.idle} color="#8b92a7" />
          <MiniStat label="Error" value={sovereign.stats.error} color="#ef4444" />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: 14, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {/* Quick Actions */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase" }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sovereignActions.map((action) => (
                <button
                  key={action}
                  className="xom3-btn"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                  onClick={() => onExecute(action)}
                  disabled={executing === sovereign.id}
                >
                  {action.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Agents List */}
          <div>
            <div style={{ fontSize: 10, color: "var(--text-2)", marginBottom: 6, textTransform: "uppercase" }}>
              Agents
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {sovereign.agents.map((agent) => (
                <div
                  key={agent.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 6,
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{agent.icon}</span>
                    <span style={{ color: "var(--text-1)" }}>{agent.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <PostureChip label={agent.status} tone={getStatusTone(agent.status)} />
                    <button
                      className="xom3-btn xom3-btnSecondary"
                      style={{ fontSize: 9, padding: "2px 6px" }}
                      onClick={() => onAgentExecute(agent.id, "health_check")}
                      disabled={executing === agent.id}
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      <span style={{ fontSize: 10, color: "var(--text-2)" }}>{label}:</span>
      <span style={{ fontSize: 10, color: "var(--text-1)", fontWeight: 600 }}>{value}</span>
    </div>
  );
}























