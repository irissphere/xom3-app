"use client";

import { useEffect, useState } from "react";
import { OperatorDashboardContext } from "../page";

interface LeadItem {
  id: string;
  name: string;
  source: string;
  time: string;
  status: string;
  phone?: string;
  email?: string;
  state?: string;
}

interface LeadsData {
  total: number;
  new: number;
  qualified: number;
  contacted: number;
  today?: number;
  thisWeek?: number;
  trend: string;
  recentLeads: LeadItem[];
  byStatus?: Record<string, number>;
  bySource?: Record<string, number>;
  _source?: string;
}

export default function LeadsTodayPanel({ ctx }: { ctx: OperatorDashboardContext }) {
  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch("/api/operator/dashboard/leads", {
          headers: ctx.headers,
          cache: "no-store",
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const json = await res.json();
        if (cancelled) return;
        
        // Ensure arrays are always defined
        setData({
          ...json,
          recentLeads: Array.isArray(json.recentLeads) ? json.recentLeads : [],
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch leads:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
        // Set empty fallback data
        setData({
          total: 0,
          new: 0,
          qualified: 0,
          contacted: 0,
          trend: "—",
          recentLeads: [],
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ctx.headers]);

  // Safe access to data with defaults
  const displayData: LeadsData = data || {
    total: 0,
    new: 0,
    qualified: 0,
    contacted: 0,
    trend: "—",
    recentLeads: [],
  };

  const isLiveData = displayData._source === "opus1";

  return (
    <div className="xom3-panel" style={{ position: "relative" }}>
      {/* Header */}
      <div className="xom3-panel-header">
        <div>
          <h3 className="xom3-panel-title">
            Leads
            {isLiveData && (
              <span style={{ 
                marginLeft: 8, 
                fontSize: 10, 
                padding: "2px 6px", 
                background: "rgba(34,197,94,0.15)", 
                color: "#22c55e",
                borderRadius: 4,
                fontWeight: 500,
              }}>
                LIVE
              </span>
            )}
          </h3>
          <p className="xom3-panel-subtitle">
            {displayData.today !== undefined 
              ? `${displayData.today} today · ${displayData.thisWeek || 0} this week`
              : "Real leads from Opus 1"}
          </p>
        </div>
        {displayData.trend && displayData.trend !== "—" && (
          <span className={`xom3-badge ${displayData.trend.startsWith('+') ? 'xom3-badge-success' : displayData.trend.startsWith('-') ? 'xom3-badge-warning' : ''}`}>
            {displayData.trend} vs avg
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "var(--space-4)",
        marginBottom: "var(--space-5)",
      }}>
        <div className="xom3-stat">
          <span className="xom3-stat-value">{displayData.total}</span>
          <span className="xom3-stat-label">Total</span>
        </div>
        <div className="xom3-stat">
          <span className="xom3-stat-value" style={{ color: "#22d3ee" }}>{displayData.new}</span>
          <span className="xom3-stat-label">New</span>
        </div>
        <div className="xom3-stat">
          <span className="xom3-stat-value" style={{ color: "#a78bfa" }}>{displayData.qualified}</span>
          <span className="xom3-stat-label">Qualified</span>
        </div>
        <div className="xom3-stat">
          <span className="xom3-stat-value" style={{ color: "#22c55e" }}>{displayData.contacted}</span>
          <span className="xom3-stat-label">Contacted</span>
        </div>
      </div>

      {/* Divider */}
      <div className="xom3-divider" />

      {/* Recent Leads */}
      <div>
        <h4 style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-2)",
          marginBottom: "var(--space-3)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Recent Leads
        </h4>
        
        {displayData.recentLeads.length === 0 && !loading ? (
          <div style={{
            padding: "20px",
            textAlign: "center",
            color: "var(--text-2)",
            fontSize: 13,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 8,
          }}>
            {error ? `Unable to load leads: ${error}` : "No recent leads"}
          </div>
        ) : (
          <div className="xom3-activity-list">
            {displayData.recentLeads.map((lead) => (
              <div key={lead.id} className="xom3-activity-item">
                <div className={`xom3-activity-dot ${
                  lead.status === "new" ? "xom3-activity-dot-lead" :
                  lead.status === "qualified" ? "xom3-activity-dot-sms" :
                  lead.status === "converted" ? "xom3-activity-dot-success" :
                  "xom3-activity-dot-success"
                }`} />
                <div className="xom3-activity-content">
                  <div className="xom3-activity-text">
                    <strong style={{ color: "var(--text-0)" }}>{lead.name}</strong>
                    <span style={{ color: "var(--text-2)", marginLeft: "8px" }}>
                      {lead.source}
                      {lead.state ? ` · ${lead.state}` : ""}
                    </span>
                  </div>
                  <div className="xom3-activity-time">{lead.time}</div>
                </div>
                <span className={`xom3-badge ${
                  lead.status === "new" ? "xom3-badge-info" :
                  lead.status === "qualified" ? "xom3-badge-warning" :
                  lead.status === "converted" ? "xom3-badge-success" :
                  "xom3-badge-success"
                }`}>
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "inherit",
          zIndex: 10,
        }}>
          <div style={{
            width: 24,
            height: 24,
            border: "2px solid rgba(99, 102, 241, 0.3)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
        </div>
      )}
    </div>
  );
}
