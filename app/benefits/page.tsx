"use client";

import { useState, useEffect } from "react";
import BenefitsPanel from "@/components/xom3/ui/panels/BenefitsPanel";
import TierPanel from "@/components/xom3/ui/panels/TierPanel";
import AccessPanel from "@/components/xom3/ui/panels/AccessPanel";
import BenefitsCrmPanel from "@/app/benefits/ui/BenefitsCrmPanel";
import type { BenefitsDashboardData } from "@/lib/benefits/types";

type ActiveView = "crm" | "benefits" | "tiers" | "access";

export default function BenefitsPage() {
  const [activeView, setActiveView] = useState<ActiveView>("crm");
  const [dashboardData, setDashboardData] = useState<BenefitsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/benefits/status");
        if (res.ok) {
          const json = await res.json();
          setDashboardData(json.data);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 12000);
    return () => clearInterval(interval);
  }, []);

  const getPostureStyle = (posture?: string) => {
    const styles: Record<string, { bg: string; text: string; glow: string }> = {
      nominal: { 
        bg: "rgba(16, 185, 129, 0.15)", 
        text: "rgb(16, 185, 129)", 
        glow: "rgba(16, 185, 129, 0.4)" 
      },
      degraded: { 
        bg: "rgba(245, 158, 11, 0.15)", 
        text: "rgb(245, 158, 11)", 
        glow: "rgba(245, 158, 11, 0.4)" 
      },
      critical: { 
        bg: "rgba(239, 68, 68, 0.15)", 
        text: "rgb(239, 68, 68)", 
        glow: "rgba(239, 68, 68, 0.4)" 
      },
    };
    return styles[posture || "nominal"];
  };

  const postureStyle = getPostureStyle(dashboardData?.posture);

  return (
    <main className="benefits-lane">
      {/* Orbital Background Layer */}
      <div className="orbital-bg-layer">
        <div 
          className="orbital-orb orbital-orb-primary animate-orb-drift" 
          style={{ width: 700, height: 700, top: "-15%", left: "-10%" }} 
        />
        <div 
          className="orbital-orb orbital-orb-secondary animate-orb-drift-alt" 
          style={{ width: 500, height: 500, bottom: "5%", right: "-12%" }} 
        />
        <div 
          className="orbital-orb orbital-orb-accent animate-orb-drift" 
          style={{ width: 350, height: 350, top: "60%", left: "15%" }} 
        />
        <div className="orbital-grid animate-grid-rotate" />
      </div>

      {/* Beam Geometry */}
      <div className="beam-wrapper">
        <div className="beam-core" />
        <div className="beam-arc" />
        <div className="beam-secondary" />
      </div>

      {/* Omni-bar */}
      <div className="omni-bar">
        <div className="omni-left">
          <div className="omni-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="omni-brand">
            <span className="brand-title">X.O.M3</span>
            <span className="brand-divider">|</span>
            <span className="brand-lane">Benefits CRM</span>
          </div>
        </div>

        <div className="omni-center">
          <nav className="view-nav">
            {[
              { key: "crm" as ActiveView, label: "Benefits CRM", icon: "🧭" },
              { key: "benefits" as ActiveView, label: "Benefits Registry", icon: "📋" },
              { key: "tiers" as ActiveView, label: "Access Tiers", icon: "👥" },
              { key: "access" as ActiveView, label: "Audit Ledger", icon: "🛡️" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`nav-btn ${activeView === item.key ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="omni-right">
          <div 
            className="posture-indicator"
            style={{ 
              background: postureStyle.bg, 
              boxShadow: `0 0 20px ${postureStyle.glow}` 
            }}
          >
            <span 
              className="posture-dot animate-breathe" 
              style={{ background: postureStyle.text }}
            />
            <span className="posture-label">POSTURE:</span>
            <span 
              className="posture-value" 
              style={{ color: postureStyle.text }}
            >
              {dashboardData?.posture?.toUpperCase() || "LOADING"}
            </span>
          </div>
          <div className="sync-indicator">
            <span className="sync-label">Last Sync</span>
            <span className="sync-time">
              {dashboardData?.lastSync 
                ? new Date(dashboardData.lastSync).toLocaleTimeString() 
                : "--:--:--"
              }
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-value cyan">{dashboardData?.benefits.totalBenefits || 0}</span>
          <span className="stat-label">Total Benefits</span>
        </div>
        <div className="stat-item">
          <span className="stat-value emerald">{dashboardData?.benefits.enrolled || 0}</span>
          <span className="stat-label">Enrolled</span>
        </div>
        <div className="stat-item">
          <span className="stat-value amber">{dashboardData?.benefits.pending || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value violet">{dashboardData?.tiers.totalUsers || 0}</span>
          <span className="stat-label">Users</span>
        </div>
        <div className="stat-item">
          <span className="stat-value emerald">{dashboardData?.tiers.activeUsers || 0}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-value rose">{dashboardData?.access.todayLogs || 0}</span>
          <span className="stat-label">Events Today</span>
        </div>
        <div className="stat-item premium">
          <span className="stat-value cyan">
            ${(dashboardData?.benefits.totalPremium || 0).toLocaleString()}
          </span>
          <span className="stat-label">Total Premium</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="benefits-lane-inner">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner animate-orbital-drift" />
            <span>Initializing Benefits Sovereign...</span>
          </div>
        ) : (
          <>
            {activeView === "crm" && <BenefitsCrmPanel />}
            {activeView === "benefits" && <BenefitsPanel data={dashboardData || undefined} />}
            {activeView === "tiers" && <TierPanel stats={dashboardData?.tiers} />}
            {activeView === "access" && <AccessPanel stats={dashboardData?.access} />}
          </>
        )}
      </div>

      <style jsx>{`
        .benefits-lane {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* Orbital Background Layer */
        .orbital-bg-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .orbital-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
        }

        .orbital-orb-primary {
          background: radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%);
        }

        .orbital-orb-secondary {
          background: radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%);
        }

        .orbital-orb-accent {
          background: radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%);
        }

        .orbital-grid {
          position: absolute;
          inset: -50%;
          background-image: 
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 100px 100px;
          transform-origin: center center;
        }

        /* Beam Geometry */
        .beam-wrapper {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }

        .beam-core {
          position: absolute;
          top: 10%;
          right: 5%;
          width: 1000px;
          height: 1000px;
          background: radial-gradient(circle at 35% 35%, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.08) 35%, transparent 60%);
          transform: rotate(25deg);
          filter: blur(50px);
          mix-blend-mode: screen;
          animation: beam-flow 18s ease-in-out infinite;
          opacity: 0.85;
        }

        .beam-arc {
          position: absolute;
          top: 5%;
          right: 0;
          width: 1400px;
          height: 1400px;
          border-radius: 50%;
          box-shadow: 0 0 150px 40px rgba(6, 182, 212, 0.05), inset 0 0 100px rgba(168, 85, 247, 0.03);
          transform: rotate(10deg);
          filter: blur(35px);
          mix-blend-mode: screen;
          animation: arc-rotate 35s linear infinite;
          opacity: 0.6;
        }

        .beam-secondary {
          position: absolute;
          bottom: 0%;
          left: 10%;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15), transparent 60%);
          filter: blur(60px);
          mix-blend-mode: screen;
          animation: beam-flow 22s ease-in-out infinite reverse;
          opacity: 0.5;
        }

        @keyframes beam-flow {
          0% { transform: rotate(25deg) translateX(0px) translateY(0px); }
          50% { transform: rotate(25deg) translateX(50px) translateY(-20px); }
          100% { transform: rotate(25deg) translateX(0px) translateY(0px); }
        }

        @keyframes arc-rotate {
          0% { transform: rotate(10deg) scale(1); }
          50% { transform: rotate(18deg) scale(1.03); }
          100% { transform: rotate(10deg) scale(1); }
        }

        /* Omni-bar */
        .omni-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(5, 8, 16, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .omni-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .omni-logo {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(168, 85, 247, 0.1));
          border: 1px solid rgba(6, 182, 212, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgb(6, 182, 212);
          box-shadow: 0 0 25px rgba(6, 182, 212, 0.2);
        }

        .omni-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-title {
          font-size: 18px;
          font-weight: 750;
          color: var(--text-0);
          letter-spacing: -0.01em;
        }

        .brand-divider {
          color: var(--text-2);
          font-weight: 300;
        }

        .brand-lane {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-1);
        }

        .omni-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .view-nav {
          display: flex;
          gap: 6px;
          padding: 4px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .nav-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 180ms var(--ease-out);
        }

        .nav-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-1);
        }

        .nav-btn.active {
          background: rgba(6, 182, 212, 0.12);
          color: rgb(6, 182, 212);
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.15);
        }

        .nav-icon {
          font-size: 15px;
        }

        .omni-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .posture-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
        }

        .posture-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .posture-label {
          font-size: 10px;
          font-weight: 600;
          color: var(--text-2);
          letter-spacing: 0.08em;
        }

        .posture-value {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .sync-indicator {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .sync-label {
          font-size: 9px;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .sync-time {
          font-size: 12px;
          color: var(--text-1);
          font-family: var(--font-mono);
        }

        /* Stats Bar */
        .stats-bar {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 28px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          overflow-x: auto;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 70px;
        }

        .stat-item.premium {
          margin-left: auto;
        }

        .stat-value {
          font-size: 22px;
          font-weight: 700;
          font-family: var(--font-mono);
        }

        .stat-value.cyan { color: rgb(6, 182, 212); }
        .stat-value.emerald { color: rgb(16, 185, 129); }
        .stat-value.amber { color: rgb(245, 158, 11); }
        .stat-value.violet { color: rgb(168, 85, 247); }
        .stat-value.rose { color: rgb(244, 63, 94); }

        .stat-label {
          font-size: 10px;
          color: var(--text-2);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 2px;
        }

        .stat-divider {
          width: 1px;
          height: 36px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* Main Content */
        .benefits-lane-inner {
          position: relative;
          z-index: 10;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: var(--text-2);
          font-size: 14px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 3px solid rgba(6, 182, 212, 0.2);
          border-top-color: rgb(6, 182, 212);
          margin-bottom: 20px;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .omni-bar {
            flex-wrap: wrap;
            gap: 16px;
          }

          .omni-center {
            order: 3;
            flex-basis: 100%;
          }

          .view-nav {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .omni-left .omni-brand .brand-lane {
            display: none;
          }

          .nav-label {
            display: none;
          }

          .nav-btn {
            padding: 10px 14px;
          }

          .stats-bar {
            gap: 16px;
            padding: 12px 16px;
          }

          .stat-value {
            font-size: 18px;
          }

          .stat-divider {
            display: none;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .beam-core, .beam-arc, .beam-secondary, .orbital-orb, .orbital-grid {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}
