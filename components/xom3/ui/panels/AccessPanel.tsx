"use client";

import { useState, useEffect } from "react";
import type { AuditLogEntry, AccessStats } from "@/lib/benefits/types";

interface AccessPanelProps {
  stats?: AccessStats;
}

export default function AccessPanel({ stats }: AccessPanelProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/benefits/audit?pageSize=50");
        if (res.ok) {
          const json = await res.json();
          setLogs(json.data?.items || []);
        }
      } catch (e) {
        console.error("Audit logs fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 8000);
    return () => clearInterval(interval);
  }, []);

  const getActionStyle = (action: string) => {
    const styles: Record<string, { bg: string; text: string; icon: string }> = {
      TIER_GRANT: { bg: "rgba(16, 185, 129, 0.1)", text: "rgb(16, 185, 129)", icon: "✓" },
      TIER_REVOKED: { bg: "rgba(239, 68, 68, 0.1)", text: "rgb(239, 68, 68)", icon: "✕" },
      TIER_EXPIRED: { bg: "rgba(100, 116, 139, 0.1)", text: "rgb(100, 116, 139)", icon: "⏱" },
      BENEFIT_CREATED: { bg: "rgba(59, 130, 246, 0.1)", text: "rgb(59, 130, 246)", icon: "+" },
      BENEFIT_ENROLLED: { bg: "rgba(16, 185, 129, 0.1)", text: "rgb(16, 185, 129)", icon: "✓" },
      BENEFIT_DENIED: { bg: "rgba(239, 68, 68, 0.1)", text: "rgb(239, 68, 68)", icon: "✕" },
      BENEFIT_UPDATED: { bg: "rgba(245, 158, 11, 0.1)", text: "rgb(245, 158, 11)", icon: "↻" },
      DASHBOARD_ACCESS: { bg: "rgba(168, 85, 247, 0.1)", text: "rgb(168, 85, 247)", icon: "◉" },
      REPORT_GENERATED: { bg: "rgba(6, 182, 212, 0.1)", text: "rgb(6, 182, 212)", icon: "📊" },
    };
    return styles[action] || { bg: "rgba(100, 116, 139, 0.1)", text: "rgb(100, 116, 139)", icon: "•" };
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      operator: "rgb(6, 182, 212)",
      founder: "rgb(168, 85, 247)",
      partner: "rgb(16, 185, 129)",
    };
    return colors[tier] || "rgb(100, 116, 139)";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="access-panel">
      {/* Panel Header */}
      <header className="panel-header">
        <div className="title-section">
          <div className="panel-icon animate-neon-pulse">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Access & Audit</h2>
            <p className="panel-subtitle">Security & Compliance Ledger</p>
          </div>
        </div>

        <div className="audit-summary">
          <div className="summary-stat">
            <span className="stat-value">{stats?.totalLogs || logs.length}</span>
            <span className="stat-label">Total Events</span>
          </div>
          <div className="summary-stat highlight">
            <span className="stat-value">{stats?.todayLogs || 0}</span>
            <span className="stat-label">Today</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{stats?.uniqueActors || 0}</span>
            <span className="stat-label">Unique Actors</span>
          </div>
        </div>
      </header>

      {/* Top Actions Bar */}
      {stats?.topActions && stats.topActions.length > 0 && (
        <div className="top-actions-bar">
          <span className="bar-label">Top Actions:</span>
          <div className="actions-list">
            {stats.topActions.slice(0, 4).map((item) => {
              const style = getActionStyle(item.action);
              return (
                <span 
                  key={item.action} 
                  className="action-chip"
                  style={{ background: style.bg, color: style.text }}
                >
                  {item.action.replace(/_/g, " ")} ({item.count})
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Log Stream */}
      <div className="audit-stream">
        <div className="stream-header">
          <span className="stream-title">Live Audit Stream</span>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">LIVE</span>
          </div>
        </div>

        <div className="log-list">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <span>No audit events recorded</span>
            </div>
          ) : (
            logs.map((log) => {
              const actionStyle = getActionStyle(log.action);
              return (
                <div key={log.id} className="log-entry">
                  <div className="entry-timeline">
                    <span 
                      className="action-icon"
                      style={{ background: actionStyle.bg, color: actionStyle.text }}
                    >
                      {actionStyle.icon}
                    </span>
                    <div className="timeline-line"></div>
                  </div>

                  <div className="entry-content">
                    <div className="entry-header">
                      <span 
                        className="action-badge"
                        style={{ background: actionStyle.bg, color: actionStyle.text }}
                      >
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span className="entry-timestamp">{formatTimestamp(log.timestamp)}</span>
                    </div>

                    <div className="entry-details">
                      <span className="actor-info">
                        <span 
                          className="tier-dot"
                          style={{ background: getTierColor(log.actorTier) }}
                        ></span>
                        <span className="actor-name">{log.actor}</span>
                      </span>
                      <span className="detail-separator">→</span>
                      <span className="target-info">
                        <span className="target-type">[{log.targetType}]</span>
                        <span className="target-name">{log.target}</span>
                      </span>
                    </div>

                    {log.details && (
                      <p className="entry-description">{log.details}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx>{`
        .access-panel {
          padding: 24px;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 24px;
        }

        .title-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .panel-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(239, 68, 68);
        }

        .panel-title {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-0);
          letter-spacing: -0.02em;
          margin: 0;
        }

        .panel-subtitle {
          font-size: 14px;
          color: var(--text-2);
          margin: 4px 0 0 0;
          font-family: var(--font-mono);
        }

        .audit-summary {
          display: flex;
          gap: 16px;
        }

        .summary-stat {
          padding: 12px 18px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          text-align: center;
          min-width: 85px;
        }

        .summary-stat.highlight {
          border-color: rgba(6, 182, 212, 0.2);
          background: rgba(6, 182, 212, 0.05);
        }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
          color: var(--text-0);
          font-family: var(--font-mono);
        }

        .summary-stat.highlight .stat-value {
          color: rgb(6, 182, 212);
        }

        .stat-label {
          display: block;
          font-size: 10px;
          color: var(--text-2);
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .top-actions-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          flex-wrap: wrap;
        }

        .bar-label {
          font-size: 12px;
          color: var(--text-2);
          font-weight: 500;
        }

        .actions-list {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .action-chip {
          font-size: 11px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .audit-stream {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--r-lg);
          overflow: hidden;
        }

        .stream-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
        }

        .stream-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgb(16, 185, 129);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }

        .live-text {
          font-size: 10px;
          font-weight: 700;
          color: rgb(16, 185, 129);
          letter-spacing: 0.1em;
        }

        .log-list {
          padding: 8px;
          max-height: 500px;
          overflow-y: auto;
        }

        .loading-state,
        .empty-state {
          padding: 60px 20px;
          text-align: center;
          color: var(--text-2);
          font-size: 14px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(239, 68, 68, 0.2);
          border-top-color: rgb(239, 68, 68);
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .log-entry {
          display: flex;
          gap: 14px;
          padding: 14px 12px;
          transition: background 150ms;
        }

        .log-entry:hover {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 8px;
        }

        .entry-timeline {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 2px;
        }

        .action-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
        }

        .timeline-line {
          width: 2px;
          flex: 1;
          min-height: 20px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent);
          margin-top: 8px;
        }

        .entry-content {
          flex: 1;
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .action-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: capitalize;
        }

        .entry-timestamp {
          font-size: 11px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .entry-details {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .actor-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tier-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .actor-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-0);
        }

        .detail-separator {
          color: var(--text-2);
          font-size: 12px;
        }

        .target-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .target-type {
          font-size: 10px;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .target-name {
          font-size: 13px;
          color: var(--text-1);
        }

        .entry-description {
          font-size: 12px;
          color: var(--text-2);
          margin: 4px 0 0 0;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .panel-header {
            flex-direction: column;
          }

          .audit-summary {
            width: 100%;
            justify-content: space-between;
          }

          .entry-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .entry-details {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
