"use client";

import { useEffect, useState } from "react";
import { OperatorDashboardContext } from "../page";

interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  uptime: string;
  lastCheck: string;
  services: Array<{
    name: string;
    status: "up" | "degraded" | "down";
    latency: number;
  }>;
}

export default function SystemHealthPanel({ ctx }: { ctx: OperatorDashboardContext }) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/operator/dashboard/health", {
          headers: ctx.headers,
        });
        if (res.ok) {
          setHealth(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch health:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, [ctx.headers]);

  // Mock data
  const mockHealth: SystemHealth = {
    status: "healthy",
    uptime: "99.98%",
    lastCheck: "Just now",
    services: [
      { name: "API Gateway", status: "up", latency: 45 },
      { name: "Database", status: "up", latency: 12 },
      { name: "SMS Provider", status: "up", latency: 89 },
      { name: "Voice Service", status: "up", latency: 156 },
      { name: "n8n Workflows", status: "up", latency: 234 },
    ],
  };

  const displayHealth = health || mockHealth;

  const statusColors = {
    healthy: { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.3)", text: "#22c55e" },
    degraded: { bg: "rgba(234, 179, 8, 0.15)", border: "rgba(234, 179, 8, 0.3)", text: "#eab308" },
    down: { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.3)", text: "#ef4444" },
  };

  const colors = statusColors[displayHealth.status] || statusColors.healthy;

  return (
    <div className="xom3-panel">
      {/* Header */}
      <div className="xom3-panel-header">
        <div>
          <h3 className="xom3-panel-title">System Health</h3>
          <p className="xom3-panel-subtitle">Service status and performance</p>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 14px",
          borderRadius: "10px",
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: colors.text,
            boxShadow: `0 0 8px ${colors.text}`,
          }} />
          <span style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: colors.text,
            textTransform: "capitalize",
          }}>
            {displayHealth.status}
          </span>
        </div>
      </div>

      {/* Uptime Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-4)",
        marginBottom: "var(--space-5)",
      }}>
        <div className="xom3-stat">
          <span className="xom3-stat-value" style={{ color: "#22c55e" }}>
            {displayHealth.uptime}
          </span>
          <span className="xom3-stat-label">Uptime (30d)</span>
        </div>
        <div className="xom3-stat">
          <span className="xom3-stat-value-sm xom3-stat-value">
            {displayHealth.lastCheck}
          </span>
          <span className="xom3-stat-label">Last Check</span>
        </div>
      </div>

      {/* Divider */}
      <div className="xom3-divider" />

      {/* Services List */}
      <div>
        <h4 style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-2)",
          marginBottom: "var(--space-3)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Services
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {(displayHealth.services || []).map((service) => {
            const statusKey = service.status === "up" ? "healthy" : (service.status === "degraded" ? "degraded" : "down");
            const svcColors = statusColors[statusKey] || statusColors.healthy;
            return (
              <div key={service.name} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3)",
                borderRadius: "var(--r-sm)",
                background: "var(--surface-2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: svcColors.text,
                    boxShadow: `0 0 6px ${svcColors.text}`,
                  }} />
                  <span style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-1)",
                    fontWeight: 500,
                  }}>
                    {service.name}
                  </span>
                </div>
                <span style={{
                  fontSize: "var(--text-xs)",
                  color: service.latency < 100 ? "#22c55e" : service.latency < 200 ? "#eab308" : "#ef4444",
                  fontFamily: "var(--font-mono)",
                }}>
                  {service.latency}ms
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
