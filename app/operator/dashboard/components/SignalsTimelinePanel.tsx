"use client";

import { useEffect, useState } from "react";
import { OperatorDashboardContext } from "../page";

interface Signal {
  id: string;
  type: "lead" | "sms" | "call" | "appointment" | "workflow" | "error" | "success";
  message: string;
  time: string;
  source: string;
  severity: "info" | "warning" | "error" | "success";
}

export default function SignalsTimelinePanel({ ctx }: { ctx: OperatorDashboardContext }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Signal["type"]>("all");

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/operator/dashboard/signals", {
          headers: ctx.headers,
        });
        if (res.ok) {
          setSignals(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch signals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, [ctx.headers]);

  // Mock signals
  const mockSignals: Signal[] = [
    { id: "1", type: "lead", message: "New lead captured from Google Ads campaign", time: "Just now", source: "intake", severity: "success" },
    { id: "2", type: "sms", message: "SMS sequence triggered for John D.", time: "2m ago", source: "n8n", severity: "info" },
    { id: "3", type: "workflow", message: "Follow-up workflow completed successfully", time: "5m ago", source: "automation", severity: "success" },
    { id: "4", type: "appointment", message: "Appointment scheduled for tomorrow 2PM", time: "12m ago", source: "calendar", severity: "info" },
    { id: "5", type: "call", message: "Voice call connected with Sarah M.", time: "18m ago", source: "voice", severity: "info" },
    { id: "6", type: "error", message: "SMS delivery failed - invalid number", time: "25m ago", source: "twilio", severity: "error" },
    { id: "7", type: "success", message: "Lead converted to customer", time: "32m ago", source: "crm", severity: "success" },
    { id: "8", type: "workflow", message: "Social post published to Instagram", time: "45m ago", source: "social", severity: "info" },
  ];

  const displaySignals = (signals && signals.length > 0) ? signals : mockSignals;
  const filteredSignals = filter === "all" 
    ? displaySignals 
    : displaySignals.filter(s => s.type === filter);

  const typeColors: Record<Signal["type"], string> = {
    lead: "#22d3ee",
    sms: "#a78bfa",
    call: "#f472b6",
    appointment: "#22c55e",
    workflow: "#6366f1",
    error: "#ef4444",
    success: "#22c55e",
  };

  const severityBadge: Record<Signal["severity"], string> = {
    info: "xom3-badge-info",
    warning: "xom3-badge-warning",
    error: "xom3-badge-error",
    success: "xom3-badge-success",
  };

  const filters: Array<{ key: "all" | Signal["type"]; label: string }> = [
    { key: "all", label: "All" },
    { key: "lead", label: "Leads" },
    { key: "sms", label: "SMS" },
    { key: "call", label: "Calls" },
    { key: "workflow", label: "Workflows" },
  ];

  return (
    <div className="xom3-panel">
      {/* Header */}
      <div className="xom3-panel-header">
        <div>
          <h3 className="xom3-panel-title">Signals Timeline</h3>
          <p className="xom3-panel-subtitle">Real-time activity across all systems</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: filter === f.key ? "rgba(99, 102, 241, 0.5)" : "transparent",
                background: filter === f.key ? "rgba(99, 102, 241, 0.15)" : "transparent",
                color: filter === f.key ? "#a5b4fc" : "var(--text-2)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: "var(--space-1)",
        maxHeight: "400px",
        overflowY: "auto",
      }}>
        {filteredSignals.map((signal, idx) => (
          <div key={signal.id} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "var(--space-4)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--r-sm)",
            background: idx === 0 ? "rgba(99, 102, 241, 0.08)" : "transparent",
            borderLeft: `3px solid ${typeColors[signal.type]}`,
            transition: "background 150ms ease",
          }}>
            {/* Time column */}
            <div style={{
              minWidth: "70px",
              fontSize: "var(--text-xs)",
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              paddingTop: "2px",
            }}>
              {signal.time}
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-0)",
                lineHeight: 1.5,
                marginBottom: "var(--space-1)",
              }}>
                {signal.message}
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}>
                <span style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-2)",
                }}>
                  {signal.source}
                </span>
                <span className={`xom3-badge ${severityBadge[signal.severity]}`} style={{
                  padding: "2px 6px",
                  fontSize: "10px",
                }}>
                  {signal.type}
                </span>
              </div>
            </div>

            {/* Indicator dot */}
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: typeColors[signal.type],
              boxShadow: `0 0 8px ${typeColors[signal.type]}`,
              marginTop: "6px",
            }} />
          </div>
        ))}
      </div>

      {filteredSignals.length === 0 && (
        <div className="xom3-empty">
          <div className="xom3-empty-icon">📡</div>
          <div className="xom3-empty-title">No signals yet</div>
          <div className="xom3-empty-description">
            Activity will appear here as your automation runs
          </div>
        </div>
      )}
    </div>
  );
}
