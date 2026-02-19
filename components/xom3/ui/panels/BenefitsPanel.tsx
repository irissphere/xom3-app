"use client";

import { useState, useEffect } from "react";
import type { BenefitsDashboardData, Benefit } from "@/lib/benefits/types";

interface BenefitsPanelProps {
  data?: BenefitsDashboardData;
}

export default function BenefitsPanel({ data }: BenefitsPanelProps) {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefits = async () => {
      try {
        const res = await fetch("/api/benefits/list");
        if (res.ok) {
          const json = await res.json();
          setBenefits(json.data?.items || []);
        }
      } catch (e) {
        console.error("Benefits fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchBenefits();
    const interval = setInterval(fetchBenefits, 10000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      private: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      medicare: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      aca: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      employer: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      family: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      individual: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    };
    return colors[category] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
  };

  const getStatusIndicator = (status: string) => {
    const indicators: Record<string, { color: string; label: string }> = {
      enrolled: { color: "bg-emerald-500", label: "Enrolled" },
      pending: { color: "bg-amber-500", label: "Pending" },
      eligible: { color: "bg-cyan-500", label: "Eligible" },
      denied: { color: "bg-rose-500", label: "Denied" },
      expired: { color: "bg-slate-500", label: "Expired" },
      cancelled: { color: "bg-slate-600", label: "Cancelled" },
    };
    return indicators[status] || { color: "bg-slate-500", label: status };
  };

  return (
    <div className="benefits-panel">
      {/* Panel Header */}
      <header className="panel-header">
        <div className="header-content">
          <div className="title-row">
            <div className="panel-icon animate-breathe">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div>
              <h2 className="panel-title">Benefits CRM</h2>
              <p className="panel-subtitle">Sovereign Benefits Registry</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-value">{data?.benefits.totalBenefits || benefits.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-pill stat-enrolled">
              <span className="stat-value">{data?.benefits.enrolled || 0}</span>
              <span className="stat-label">Enrolled</span>
            </div>
            <div className="stat-pill stat-pending">
              <span className="stat-value">{data?.benefits.pending || 0}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>
      </header>

      {/* Benefits Grid */}
      <div className="benefits-grid">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner animate-orbital-drift"></div>
            <span>Loading benefits data...</span>
          </div>
        ) : benefits.length === 0 ? (
          <div className="empty-state">
            <span>No benefits registered</span>
          </div>
        ) : (
          benefits.map((benefit) => {
            const status = getStatusIndicator(benefit.status);
            return (
              <div key={benefit.id} className="benefit-card xom3-glass xom3-glassEdge">
                <div className="card-header">
                  <span className={`category-badge ${getCategoryColor(benefit.category)}`}>
                    {benefit.category.toUpperCase()}
                  </span>
                  <div className="status-indicator">
                    <span className={`status-dot ${status.color}`}></span>
                    <span className="status-label">{status.label}</span>
                  </div>
                </div>
                
                <h3 className="benefit-name">{benefit.name}</h3>
                <p className="benefit-description">{benefit.description}</p>
                
                <div className="card-details">
                  {benefit.carrier && (
                    <div className="detail-row">
                      <span className="detail-label">Carrier</span>
                      <span className="detail-value">{benefit.carrier}</span>
                    </div>
                  )}
                  {benefit.premium !== undefined && benefit.premium > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Premium</span>
                      <span className="detail-value premium">${benefit.premium.toFixed(2)}/mo</span>
                    </div>
                  )}
                  {benefit.clientName && (
                    <div className="detail-row">
                      <span className="detail-label">Client</span>
                      <span className="detail-value">{benefit.clientName}</span>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <span className="timestamp">
                    {benefit.effectiveDate 
                      ? `Effective: ${new Date(benefit.effectiveDate).toLocaleDateString()}`
                      : `Created: ${new Date(benefit.createdAt).toLocaleDateString()}`
                    }
                  </span>
                  <button className="view-btn">
                    View Details →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx>{`
        .benefits-panel {
          padding: 24px;
        }

        .panel-header {
          margin-bottom: 32px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .panel-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(6, 182, 212, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(6, 182, 212);
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.15);
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

        .header-stats {
          display: flex;
          gap: 12px;
        }

        .stat-pill {
          padding: 12px 20px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        }

        .stat-enrolled {
          border-color: rgba(16, 185, 129, 0.2);
          background: rgba(16, 185, 129, 0.05);
        }

        .stat-pending {
          border-color: rgba(245, 158, 11, 0.2);
          background: rgba(245, 158, 11, 0.05);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-0);
        }

        .stat-enrolled .stat-value {
          color: rgb(16, 185, 129);
        }

        .stat-pending .stat-value {
          color: rgb(245, 158, 11);
        }

        .stat-label {
          font-size: 11px;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 2px;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .loading-state,
        .empty-state {
          grid-column: 1 / -1;
          padding: 60px 20px;
          text-align: center;
          color: var(--text-2);
          font-size: 14px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid rgba(6, 182, 212, 0.2);
          border-top-color: rgb(6, 182, 212);
          margin: 0 auto 16px;
        }

        .benefit-card {
          padding: 20px;
          transition: transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out);
        }

        .benefit-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .category-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 5px 10px;
          border-radius: 6px;
          border: 1px solid;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-label {
          font-size: 12px;
          color: var(--text-1);
        }

        .benefit-name {
          font-size: 18px;
          font-weight: 650;
          color: var(--text-0);
          margin: 0 0 8px 0;
          line-height: 1.3;
        }

        .benefit-description {
          font-size: 13px;
          color: var(--text-2);
          line-height: 1.6;
          margin: 0 0 16px 0;
        }

        .card-details {
          padding: 12px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .detail-label {
          font-size: 12px;
          color: var(--text-2);
        }

        .detail-value {
          font-size: 13px;
          color: var(--text-1);
          font-weight: 500;
        }

        .detail-value.premium {
          color: rgb(6, 182, 212);
          font-family: var(--font-mono);
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
        }

        .timestamp {
          font-size: 11px;
          color: var(--text-2);
        }

        .view-btn {
          font-size: 12px;
          color: rgb(6, 182, 212);
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: color 150ms;
        }

        .view-btn:hover {
          color: rgb(34, 211, 238);
        }

        @media (max-width: 768px) {
          .benefits-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
          }

          .header-stats {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
