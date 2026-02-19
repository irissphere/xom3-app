"use client";

import { useState, useEffect } from "react";
import type { TierAccess, TierStats } from "@/lib/benefits/types";

interface TierPanelProps {
  stats?: TierStats;
}

export default function TierPanel({ stats }: TierPanelProps) {
  const [tiers, setTiers] = useState<TierAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const url = activeFilter 
          ? `/api/benefits/tiers?tier=${activeFilter}` 
          : "/api/benefits/tiers";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setTiers(json.data?.items || []);
        }
      } catch (e) {
        console.error("Tiers fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
    const interval = setInterval(fetchTiers, 15000);
    return () => clearInterval(interval);
  }, [activeFilter]);

  const getTierStyle = (tier: string) => {
    const styles: Record<string, { gradient: string; border: string; icon: string }> = {
      operator: {
        gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.1))",
        border: "rgba(6, 182, 212, 0.4)",
        icon: "👑",
      },
      founder: {
        gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1))",
        border: "rgba(168, 85, 247, 0.4)",
        icon: "🔮",
      },
      partner: {
        gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(34, 197, 94, 0.1))",
        border: "rgba(16, 185, 129, 0.4)",
        icon: "🤝",
      },
    };
    return styles[tier] || styles.partner;
  };

  const getStatusStyle = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      active: { bg: "rgba(16, 185, 129, 0.15)", text: "rgb(16, 185, 129)" },
      pending: { bg: "rgba(245, 158, 11, 0.15)", text: "rgb(245, 158, 11)" },
      suspended: { bg: "rgba(239, 68, 68, 0.15)", text: "rgb(239, 68, 68)" },
      expired: { bg: "rgba(100, 116, 139, 0.15)", text: "rgb(100, 116, 139)" },
    };
    return styles[status] || styles.pending;
  };

  const filterButtons = [
    { key: null, label: "All Tiers" },
    { key: "operator", label: "Operators" },
    { key: "founder", label: "Founders" },
    { key: "partner", label: "Partners" },
  ];

  return (
    <div className="tier-panel">
      {/* Panel Header */}
      <header className="panel-header">
        <div className="title-section">
          <div className="panel-icon animate-breathe-slow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h2 className="panel-title">Access Tiers</h2>
            <p className="panel-subtitle">Operator · Founder · Partner</p>
          </div>
        </div>

        <div className="tier-summary">
          <div className="summary-item operator-item">
            <span className="summary-count">{stats?.operators || 0}</span>
            <span className="summary-label">👑 Operators</span>
          </div>
          <div className="summary-item founder-item">
            <span className="summary-count">{stats?.founders || 0}</span>
            <span className="summary-label">🔮 Founders</span>
          </div>
          <div className="summary-item partner-item">
            <span className="summary-count">{stats?.partners || 0}</span>
            <span className="summary-label">🤝 Partners</span>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-bar">
        {filterButtons.map((btn) => (
          <button
            key={btn.key || "all"}
            onClick={() => setActiveFilter(btn.key)}
            className={`filter-btn ${activeFilter === btn.key ? "active" : ""}`}
          >
            {btn.label}
          </button>
        ))}
        {stats?.pendingApprovals ? (
          <span className="pending-badge">{stats.pendingApprovals} pending</span>
        ) : null}
      </div>

      {/* Tier Access List */}
      <div className="tier-list">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading access records...</span>
          </div>
        ) : tiers.length === 0 ? (
          <div className="empty-state">
            <span>No access records found</span>
          </div>
        ) : (
          tiers.map((access) => {
            const tierStyle = getTierStyle(access.tier);
            const statusStyle = getStatusStyle(access.status);
            return (
              <div 
                key={access.id} 
                className="tier-card"
                style={{ 
                  background: tierStyle.gradient,
                  borderColor: tierStyle.border,
                }}
              >
                <div className="card-main">
                  <div className="user-info">
                    <div className="avatar">
                      <span className="tier-icon">{tierStyle.icon}</span>
                    </div>
                    <div className="user-details">
                      <h3 className="user-name">{access.userName}</h3>
                      <span className="user-email">{access.email}</span>
                    </div>
                  </div>

                  <div className="tier-badge-container">
                    <span className="tier-badge" style={{ borderColor: tierStyle.border }}>
                      {access.tier.toUpperCase()}
                    </span>
                    <span 
                      className="status-badge"
                      style={{ 
                        background: statusStyle.bg, 
                        color: statusStyle.text 
                      }}
                    >
                      {access.status}
                    </span>
                  </div>
                </div>

                <div className="card-meta">
                  <div className="meta-item">
                    <span className="meta-label">Granted by</span>
                    <span className="meta-value">{access.grantedBy}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Access Count</span>
                    <span className="meta-value">{access.accessCount.toLocaleString()}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Last Access</span>
                    <span className="meta-value">
                      {access.lastAccessAt 
                        ? new Date(access.lastAccessAt).toLocaleDateString()
                        : "Never"
                      }
                    </span>
                  </div>
                </div>

                {access.permissions && access.permissions.length > 0 && (
                  <div className="permissions-row">
                    {access.permissions.slice(0, 3).map((perm) => (
                      <span key={perm} className="permission-tag">
                        {perm.replace(/_/g, " ")}
                      </span>
                    ))}
                    {access.permissions.length > 3 && (
                      <span className="permission-more">
                        +{access.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {access.notes && (
                  <div className="notes-row">
                    <span className="notes-text">{access.notes}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .tier-panel {
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
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.1));
          border: 1px solid rgba(168, 85, 247, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(168, 85, 247);
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.15);
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
        }

        .tier-summary {
          display: flex;
          gap: 16px;
        }

        .summary-item {
          padding: 12px 18px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          text-align: center;
          min-width: 90px;
        }

        .operator-item {
          border-color: rgba(6, 182, 212, 0.2);
        }

        .founder-item {
          border-color: rgba(168, 85, 247, 0.2);
        }

        .partner-item {
          border-color: rgba(16, 185, 129, 0.2);
        }

        .summary-count {
          display: block;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-0);
        }

        .summary-label {
          display: block;
          font-size: 11px;
          color: var(--text-2);
          margin-top: 2px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms var(--ease-out);
        }

        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-1);
        }

        .filter-btn.active {
          background: rgba(6, 182, 212, 0.1);
          border-color: rgba(6, 182, 212, 0.3);
          color: rgb(6, 182, 212);
        }

        .pending-badge {
          margin-left: auto;
          padding: 6px 12px;
          border-radius: 20px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: rgb(245, 158, 11);
          font-size: 12px;
          font-weight: 600;
        }

        .tier-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
          border: 2px solid rgba(168, 85, 247, 0.2);
          border-top-color: rgb(168, 85, 247);
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .tier-card {
          padding: 20px;
          border-radius: var(--r-lg);
          border: 1px solid;
          transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
        }

        .tier-card:hover {
          transform: translateX(4px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .card-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .user-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-0);
          margin: 0 0 2px 0;
        }

        .user-email {
          font-size: 12px;
          color: var(--text-2);
        }

        .tier-badge-container {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        .tier-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-0);
        }

        .status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: capitalize;
        }

        .card-meta {
          display: flex;
          gap: 24px;
          padding: 12px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: 10px;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-value {
          font-size: 13px;
          color: var(--text-1);
          font-weight: 500;
        }

        .permissions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 12px;
        }

        .permission-tag {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-2);
          text-transform: capitalize;
        }

        .permission-more {
          font-size: 10px;
          color: var(--text-2);
          padding: 4px 8px;
        }

        .notes-row {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
        }

        .notes-text {
          font-size: 12px;
          color: var(--text-2);
          font-style: italic;
        }

        @media (max-width: 768px) {
          .panel-header {
            flex-direction: column;
          }

          .tier-summary {
            width: 100%;
            justify-content: space-between;
          }

          .card-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .tier-badge-container {
            flex-direction: row;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}
