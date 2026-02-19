"use client";

// Broadcast Control Center
// AKV: Clean, sovereign, zero-drift
export const dynamic = 'force-dynamic';

import Link from "next/link";
import { useState, useEffect } from "react";
import PostComposerPanel from "./ui/PostComposerPanel";
import QueuePanel from "@/components/xom3/ui/panels/QueuePanel";

interface ConnectionSummary {
  total: number;
  connected: number;
  configured: number;
}

export default function BroadcastPage() {
  const [connectionSummary, setConnectionSummary] = useState<ConnectionSummary | null>(null);

  useEffect(() => {
    fetch("/api/oauth/connections")
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setConnectionSummary(data.summary);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>Broadcast Control</h1>
            <p style={styles.subtitle}>Multi-platform content automation and scheduling</p>
          </div>
          <Link href="/settings/accounts" style={styles.connectButton}>
            🔗 Connect Accounts
          </Link>
        </div>
      </header>

      {/* Connection Status Banner */}
      {connectionSummary && connectionSummary.connected === 0 && (
        <div style={styles.banner}>
          <span style={styles.bannerIcon}>⚠️</span>
          <div style={styles.bannerContent}>
            <strong>No accounts connected</strong>
            <p style={styles.bannerText}>
              Connect your social media accounts to start posting. 
              {connectionSummary.configured > 0 
                ? ` ${connectionSummary.configured} platforms available.`
                : " Contact admin to configure OAuth credentials."}
            </p>
          </div>
          <Link href="/settings/accounts" style={styles.bannerAction}>
            Connect Now →
          </Link>
        </div>
      )}

      {connectionSummary && connectionSummary.connected > 0 && (
        <div style={styles.statusBanner}>
          <span style={styles.statusDot}>●</span>
          <span>
            {connectionSummary.connected} of {connectionSummary.total} accounts connected
          </span>
          <Link href="/settings/accounts" style={styles.manageLink}>
            Manage
          </Link>
        </div>
      )}

      {/* Main Content Grid */}
      <main style={styles.main}>
        <div style={styles.grid}>
          {/* Post Composer Panel - Full Width */}
          <div style={{ ...styles.panel, gridColumn: "1 / -1" }}>
            <PostComposerPanel />
          </div>

          {/* Queue Panel */}
          <div style={styles.panel}>
            <QueuePanel />
          </div>

          {/* Quick Actions */}
          <div style={styles.panel}>
            <h3 style={styles.panelTitle}>⚡ Quick Actions</h3>
            <div style={styles.actionGrid}>
              <Link href="/settings/accounts" style={styles.actionCard}>
                <span style={styles.actionIcon}>🔗</span>
                <span>Connect Accounts</span>
              </Link>
              <Link href="/broadcast/operations" style={styles.actionCard}>
                <span style={styles.actionIcon}>📊</span>
                <span>Operations</span>
              </Link>
              <Link href="/impact" style={styles.actionCard}>
                <span style={styles.actionIcon}>🎯</span>
                <span>Impact Rewards</span>
              </Link>
              <Link href="/pricing" style={styles.actionCard}>
                <span style={styles.actionIcon}>💳</span>
                <span>Add Credits</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f1f5f9",
    padding: "24px",
  },
  header: {
    maxWidth: 1200,
    margin: "0 auto 24px",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    background: "linear-gradient(135deg, #f97316, #fb923c)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    margin: "4px 0 0",
    fontSize: 14,
    color: "#94a3b8",
  },
  connectButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 20px",
    borderRadius: 10,
    backgroundColor: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#818cf8",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
    transition: "all 0.2s",
  },
  banner: {
    maxWidth: 1200,
    margin: "0 auto 24px",
    padding: 20,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderRadius: 12,
    border: "1px solid rgba(245,158,11,0.3)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap" as const,
  },
  bannerIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  bannerContent: {
    flex: 1,
    minWidth: 200,
  },
  bannerText: {
    margin: "4px 0 0",
    fontSize: 13,
    color: "#fcd34d",
    opacity: 0.9,
  },
  bannerAction: {
    padding: "10px 20px",
    borderRadius: 8,
    backgroundColor: "#f59e0b",
    color: "#000",
    fontSize: 14,
    fontWeight: 600,
    textDecoration: "none",
  },
  statusBanner: {
    maxWidth: 1200,
    margin: "0 auto 24px",
    padding: "12px 20px",
    backgroundColor: "rgba(34,197,94,0.1)",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.2)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
  },
  statusDot: {
    color: "#22c55e",
    fontSize: 10,
  },
  manageLink: {
    marginLeft: "auto",
    color: "#22c55e",
    textDecoration: "none",
    fontWeight: 500,
  },
  main: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    gap: 20,
  },
  panel: {
    padding: 24,
    backgroundColor: "rgba(30,41,59,0.6)",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.15)",
  },
  panelTitle: {
    margin: "0 0 8px",
    fontSize: 17,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  panelDesc: {
    margin: "0 0 20px",
    fontSize: 13,
    color: "#94a3b8",
  },
  emptyState: {
    padding: 40,
    textAlign: "center" as const,
    color: "#64748b",
    fontSize: 14,
    backgroundColor: "rgba(15,23,42,0.4)",
    borderRadius: 10,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  actionCard: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "rgba(15,23,42,0.4)",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.1)",
    color: "#f1f5f9",
    fontSize: 13,
    textDecoration: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  actionIcon: {
    fontSize: 24,
  },
};
