"use client";

// Broadcast Engine - Operations View (kairosdashboard.me)
// Agent layer: new leads from social, lead score, tier, urgency, source, platform, content, action

import Link from "next/link";
import LeadFlowPanel from "@/app/components/broadcast/LeadFlowPanel";
import ContentFlowPanel from "@/app/components/broadcast/ContentFlowPanel";
import SignalFlowPanel from "@/app/components/broadcast/SignalFlowPanel";
import PageHeader from "@/app/components/PageHeader";
import Button from "@/app/components/ui/Button";
import { FeatureGate } from "@/app/components/FeatureGate";
import { useEffect, useState } from "react";

export default function BroadcastOperationsView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchStats() {
    try {
      const response = await fetch("/api/broadcast/dashboard/stats?view=operations");
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
      <>
        <PageHeader
          title="Broadcast Engine — Operations View"
          subtitle="Agent layer: Act on broadcast-generated leads"
        >
          <Link href="/broadcast/executive" style={{ textDecoration: "none" }}>
            <Button variant="ghost">Executive View</Button>
          </Link>
          <Link href="/broadcast/system" style={{ textDecoration: "none" }}>
            <Button variant="ghost">System View</Button>
          </Link>
        </PageHeader>
        <main style={{ padding: "24px", background: "#050810", color: "#f7f8ff", minHeight: "100vh" }}>

        {loading ? (
          <p style={{ color: "#8b92a7" }}>Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
            <div className="panel-full">
              <LeadFlowPanel />
            </div>

            <div className="panel-half">
              <ContentFlowPanel />
            </div>

            <div className="panel-half">
              <SignalFlowPanel />
            </div>

            {stats?.operations && (
              <div className="panel-full">
                <h3>Operations Summary</h3>
                <div className="operations-stats">
                  <div className="stat">
                    <div className="stat-value">{stats.operations.recentLeads}</div>
                    <div className="stat-label">Recent Leads (24h)</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{stats.operations.pendingAssignments}</div>
                    <div className="stat-label">Pending Assignments</div>
                  </div>
                  <div className="stat">
                    <div className="stat-value">{stats.operations.activeAgents}</div>
                    <div className="stat-label">Active Agents</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </main>
      </>
    </FeatureGate>
  );
}
