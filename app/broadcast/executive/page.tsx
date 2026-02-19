"use client";

// Broadcast Engine - Executive View (xom3.io)
// Strategic layer: content → lead conversion, lead → client conversion, revenue attribution, platform performance

import TrendPanel from "@/app/components/broadcast/TrendPanel";
import LeadFlowPanel from "@/app/components/broadcast/LeadFlowPanel";
import ContentFlowPanel from "@/app/components/broadcast/ContentFlowPanel";
import { FeatureGate } from "@/app/components/FeatureGate";
import { useEffect, useState } from "react";

export default function BroadcastExecutiveView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchStats() {
    try {
      const response = await fetch("/api/broadcast/dashboard/stats?view=executive");
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <FeatureGate feature="social">
      <main style={{ padding: "24px", background: "#050810", color: "#f7f8ff", minHeight: "100vh" }}>
        <header style={{ marginBottom: "24px" }}>
          <h1 style={{ margin: 0, fontSize: 24, color: "#f7f8ff" }}>Broadcast Engine — Executive View</h1>
          <p style={{ margin: "8px 0 0 0", color: "#8b92a7" }}>Strategic layer: See the entire growth engine</p>
        </header>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="dashboard-grid">
            <div className="panel-full">
              <h3>Growth Metrics</h3>
              {stats?.executive && (
                <div className="metrics-grid">
                  <div className="metric">
                    <div className="metric-label">Content → Lead Conversion</div>
                    <div className="metric-value">
                      {stats.executive.contentToLeadConversion.toFixed(2)}%
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Lead → Client Conversion</div>
                    <div className="metric-value">
                      {stats.executive.leadToClientConversion.toFixed(2)}%
                    </div>
                  </div>
                  <div className="metric">
                    <div className="metric-label">Revenue Attribution</div>
                    <div className="metric-value">
                      ${stats.executive.revenueAttribution.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="panel-half">
              <TrendPanel />
            </div>

            <div className="panel-half">
              <LeadFlowPanel />
            </div>

            <div className="panel-full">
              <ContentFlowPanel />
            </div>
          </div>
        )}
      </main>
    </FeatureGate>
  );
}
