"use client";

import { useState, useEffect, useCallback } from "react";
import { OperatorPanelFrame, PostureChip, PanelError } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";

interface CockpitAgent {
  id: string;
  name: string;
  type: string;
  status: "idle" | "active" | "error";
  load: number;
  tasksActive: number;
  lastActivity: string;
}

interface MultiAgent {
  id: string;
  name: string;
  glyph: string;
  lane: string;
  priority: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
}

interface AgentTeamPanelProps {
  refreshMs?: number;
}

export default function AgentTeamPanel({ refreshMs = 5000 }: AgentTeamPanelProps) {
  const [cockpitAgents, setCockpitAgents] = useState<CockpitAgent[]>([]);
  const [multiAgents, setMultiAgents] = useState<MultiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setError(null);
      // Load cockpit agents
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (res.ok) {
        const agents = await res.json();
        setCockpitAgents(agents || []);
      } else {
        throw new Error(`Failed to load agents: ${res.statusText}`);
      }

      // Load multi-agent team from config
      // In production, this would read from .agents/config.yaml
      setMultiAgents([
        {
          id: "creative_director",
          name: "Creative Director",
          glyph: "🜂",
          lane: "vision_surface",
          priority: 1,
          status: "pending",
        },
        {
          id: "ux_architect",
          name: "UX Architect",
          glyph: "🜁",
          lane: "interaction_surface",
          priority: 2,
          status: "pending",
        },
        {
          id: "design_system_engineer",
          name: "Design System Engineer",
          glyph: "🜄",
          lane: "ui_surface",
          priority: 3,
          status: "pending",
        },
        {
          id: "backend_integrator",
          name: "Backend Integrator",
          glyph: "🜃",
          lane: "logic_surface",
          priority: 4,
          status: "pending",
        },
        {
          id: "qa_perf_agent",
          name: "QA & Performance Agent",
          glyph: "🜅",
          lane: "verification_surface",
          priority: 5,
          status: "pending",
        },
      ]);
      setLastRefresh(Date.now());
    } catch (err: any) {
      console.error("Failed to load agents:", err);
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, refreshMs);
    return () => clearInterval(interval);
  }, [loadAgents, refreshMs]);

  async function triggerCockpitAgent(agentId: string, action: string) {
    setTriggering(agentId);
    try {
      const res = await fetch(`/api/cockpit/agent/${encodeURIComponent(agentId)}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mode: "direct",
          payload: {},
        }),
      });

      const result = await res.json();
      if (result.success) {
        // Refresh agents after successful trigger
        setTimeout(() => loadAgents(), 1000);
      } else {
        setError(`Agent ${agentId}: ${result.error?.message || "Unknown error"}`);
      }
    } catch (err: any) {
      setError(`Failed to trigger agent: ${err.message}`);
    } finally {
      setTriggering(null);
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
      case "blocked":
        return "error";
      case "in_progress":
        return "degraded";
      default:
        return "neutral";
    }
  }

  const hintText = lastRefresh
    ? `cockpit=${cockpitAgents.length} • multi-agent=${multiAgents.length} • refreshed=${new Date(lastRefresh).toLocaleTimeString()}`
    : "loading…";


  return (
    <OperatorPanelFrame
      title="Agent Team Management"
      hint={hintText}
      right={
        <button className="xom3-btn xom3-btnSecondary" onClick={loadAgents} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      }
    >
      {error && <PanelError label="Agent team degraded" error={error} />}
      
      {loading && cockpitAgents.length === 0 ? (
        <div className="xom3-subtle" style={{ padding: 20, textAlign: "center" }}>
          Loading agents...
        </div>
      ) : (
        <>
          {/* Cockpit Agents Section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text-0)" }}>
              Cockpit Agents
            </div>
            <div style={{ marginBottom: 8, fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
              Domain-specific automation agents
            </div>
            {cockpitAgents.length === 0 ? (
              <div className="xom3-subtle">No cockpit agents registered</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {cockpitAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="xom3-glass"
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: "var(--text-0)" }}>{agent.name}</div>
                      <PostureChip label={agent.status} tone={getStatusTone(agent.status)} />
                    </div>
                    <div style={{ display: "grid", gap: 6, marginBottom: 12, fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-2)" }}>ID:</span>
                        <span style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {agent.id}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-2)" }}>Load:</span>
                        <span style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {agent.load}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-2)" }}>Tasks:</span>
                        <span style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {agent.tasksActive}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {agent.type.includes("intake") && (
                        <button
                          className="xom3-btn"
                          onClick={() => triggerCockpitAgent(agent.id, "process_intake")}
                          disabled={triggering === agent.id}
                          style={{ flex: 1, fontSize: 11 }}
                        >
                          {triggering === agent.id ? "Triggering..." : "Process Intake"}
                        </button>
                      )}
                      {agent.type.includes("followup") && (
                        <button
                          className="xom3-btn"
                          onClick={() => triggerCockpitAgent(agent.id, "process_tasks")}
                          disabled={triggering === agent.id}
                          style={{ flex: 1, fontSize: 11 }}
                        >
                          {triggering === agent.id ? "Triggering..." : "Process Tasks"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Multi-Agent Team Section */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text-0)" }}>
              Multi-Agent Team
            </div>
            <div style={{ marginBottom: 8, fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
              File-based development agents
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {multiAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="xom3-glass"
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-0)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{agent.glyph}</span>
                      {agent.name}
                    </div>
                    <PostureChip label={agent.status} tone={getStatusTone(agent.status)} />
                  </div>
                  <div style={{ display: "grid", gap: 6, marginBottom: 12, fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-2)" }}>Lane:</span>
                      <span style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {agent.lane}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-2)" }}>Priority:</span>
                      <span style={{ color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        P{agent.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    className="xom3-btn xom3-btnSecondary"
                    onClick={() => {
                      alert(`To trigger ${agent.name}, create a signal file in .agents/signals/ or ask Claude to coordinate.`);
                    }}
                    style={{ width: "100%", fontSize: 11 }}
                  >
                    Request Work
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

    </OperatorPanelFrame>
  );
}

