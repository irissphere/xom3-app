"use client";

// Broadcast Engine - System View (kairosphere.tech)
// Engineering layer: worker queues, job throughput, failures, scraper health, API health

import ContentFlowPanel from "@/app/components/broadcast/ContentFlowPanel";
import SignalFlowPanel from "@/app/components/broadcast/SignalFlowPanel";
import WorkerPanel from "@/app/components/broadcast/WorkerPanel";
import TrendPanel from "@/app/components/broadcast/TrendPanel";
import { FeatureGate } from "@/app/components/FeatureGate";
import { useEffect, useState } from "react";

export default function BroadcastSystemView() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);
  
  async function fetchStats() {
    try {
      const response = await fetch("/api/broadcast/dashboard/stats?view=system");
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
          <h1 style={{ margin: 0, fontSize: 24, color: "#f7f8ff" }}>Broadcast Engine — System View</h1>
          <p style={{ margin: "8px 0 0 0", color: "#8b92a7" }}>Engineering layer: Monitor the health of the organism</p>
        </header>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="dashboard-grid">
            <div className="panel-full">
              <WorkerPanel />
            </div>

            <div className="panel-half">
              <ContentFlowPanel />
            </div>

            <div className="panel-half">
              <SignalFlowPanel />
            </div>

            <div className="panel-full">
              <TrendPanel />
            </div>

            {stats?.system && (
              <div className="panel-full">
                <h3>System Health</h3>
                <div className="health-grid">
                  {stats.system.workerHealth.map((worker: any) => (
                    <div key={worker.type} className="health-item">
                      <div className="health-name">{worker.type}</div>
                      <div className="health-status">{worker.health}</div>
                      <div className="health-queue">
                        Pending: {worker.queue?.pending || 0} |
                        Processing: {worker.queue?.processing || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </FeatureGate>
  );
}
