"use client";

// Connect Accounts Panel - Social Media Account Management
// AKV: Beautiful, functional, zero-drift

import { useState, useEffect, useCallback } from "react";

interface PlatformConnection {
  platform: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  configured: boolean;
  status: "connected" | "disconnected" | "expired" | "error" | "pending";
  platformUsername?: string;
  platformDisplayName?: string;
  platformProfileImage?: string;
  connectedAt?: string;
  lastUsedAt?: string;
  expiresAt?: string;
  errorMessage?: string;
}

interface ConnectionsData {
  ok: boolean;
  platforms: PlatformConnection[];
  summary: {
    total: number;
    configured: number;
    connected: number;
    disconnected: number;
    expired: number;
    errors: number;
  };
  lastUpdated: string;
}

const STATUS_STYLES: Record<PlatformConnection["status"], { bg: string; fg: string; label: string; glow?: string }> = {
  connected: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e", label: "Connected", glow: "0 0 12px rgba(34,197,94,0.4)" },
  disconnected: { bg: "rgba(148,163,184,0.12)", fg: "#94a3b8", label: "Not Connected" },
  expired: { bg: "rgba(245,158,11,0.15)", fg: "#f59e0b", label: "Expired" },
  error: { bg: "rgba(239,68,68,0.15)", fg: "#ef4444", label: "Error" },
  pending: { bg: "rgba(99,102,241,0.15)", fg: "#6366f1", label: "Connecting..." },
};

// Developer portal URLs for each platform
function getSetupUrl(platform: string): string {
  const urls: Record<string, string> = {
    youtube: "https://console.cloud.google.com/apis/credentials",
    twitter: "https://developer.twitter.com/en/portal/projects-and-apps",
    instagram: "https://developers.facebook.com/apps/",
    facebook: "https://developers.facebook.com/apps/",
    tiktok: "https://developers.tiktok.com/",
    linkedin: "https://www.linkedin.com/developers/apps/",
  };
  return urls[platform] || "https://developers.google.com";
}

export default function ConnectAccountsPanel({ tenantId = "default" }: { tenantId?: string }) {
  const [data, setData] = useState<ConnectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch(`/api/oauth/connections?tenant=${tenantId}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load connections");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchConnections();

    // Check URL params for OAuth result
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const status = params.get("status");
    const message = params.get("message");

    if (platform && status) {
      // Show toast or notification
      if (status === "success") {
        console.log(`✅ Successfully connected ${platform}: ${message}`);
      } else {
        console.error(`❌ Failed to connect ${platform}: ${message}`);
      }
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchConnections]);

  // Handle connect
  const handleConnect = async (platform: string) => {
    setConnecting(platform);
    try {
      // Redirect to OAuth authorization
      window.location.href = `/api/oauth/${platform}/authorize?tenant=${tenantId}`;
    } catch (err: any) {
      console.error(`Failed to initiate connection for ${platform}:`, err);
      setConnecting(null);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (platform: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) {
      return;
    }

    setDisconnecting(platform);
    try {
      const res = await fetch(`/api/oauth/${platform}/disconnect?tenant=${tenantId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (json.ok) {
        await fetchConnections();
      } else {
        alert(json.error || "Failed to disconnect");
      }
    } catch (err: any) {
      alert(err.message || "Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  // Handle refresh expired tokens
  const handleRefreshAll = async () => {
    try {
      const res = await fetch("/api/oauth/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const json = await res.json();

      if (json.ok) {
        await fetchConnections();
      }
    } catch (err: any) {
      console.error("Failed to refresh tokens:", err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Connected Accounts</h2>
        </div>
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <span>Loading connections...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Connected Accounts</h2>
        </div>
        <div style={styles.errorState}>
          <span style={{ color: "#ef4444" }}>⚠</span>
          <span>{error}</span>
          <button onClick={fetchConnections} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Connected Accounts</h2>
          <p style={styles.subtitle}>
            Connect your social media accounts to enable automated posting
          </p>
        </div>
        {data && data.summary.expired > 0 && (
          <button onClick={handleRefreshAll} style={styles.refreshButton}>
            🔄 Refresh Expired
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {data && (
        <div style={styles.summary}>
          <div style={styles.statBox}>
            <span style={styles.statValue}>{data.summary.connected}</span>
            <span style={styles.statLabel}>Connected</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statValue}>{data.summary.configured}</span>
            <span style={styles.statLabel}>Available</span>
          </div>
          {data.summary.expired > 0 && (
            <div style={{ ...styles.statBox, borderColor: "#f59e0b" }}>
              <span style={{ ...styles.statValue, color: "#f59e0b" }}>{data.summary.expired}</span>
              <span style={styles.statLabel}>Expired</span>
            </div>
          )}
          {data.summary.errors > 0 && (
            <div style={{ ...styles.statBox, borderColor: "#ef4444" }}>
              <span style={{ ...styles.statValue, color: "#ef4444" }}>{data.summary.errors}</span>
              <span style={styles.statLabel}>Errors</span>
            </div>
          )}
        </div>
      )}

      {/* Platform Cards */}
      <div style={styles.platformGrid}>
        {data?.platforms.map((platform) => (
          <PlatformCard
            key={platform.platform}
            platform={platform}
            connecting={connecting === platform.platform}
            disconnecting={disconnecting === platform.platform}
            onConnect={() => handleConnect(platform.platform)}
            onDisconnect={() => handleDisconnect(platform.platform)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerText}>
          Last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "Never"}
        </span>
        <button onClick={fetchConnections} style={styles.footerRefresh}>
          ↻ Refresh
        </button>
      </div>
    </div>
  );
}

// Platform Card Component
function PlatformCard({
  platform,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  platform: PlatformConnection;
  connecting: boolean;
  disconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const status = connecting ? "pending" : platform.status;
  const statusStyle = STATUS_STYLES[status];
  const isConnected = platform.status === "connected";
  const canConnect = platform.configured && !isConnected && !connecting;
  const isProcessing = connecting || disconnecting;

  return (
    <div
      style={{
        ...styles.platformCard,
        borderColor: isConnected ? platform.color + "40" : "rgba(148,163,184,0.2)",
        boxShadow: isConnected ? `0 0 20px ${platform.color}15` : undefined,
      }}
    >
      {/* Platform Header */}
      <div style={styles.platformHeader}>
        <div style={styles.platformIdentity}>
          <span
            style={{
              ...styles.platformIcon,
              backgroundColor: platform.color + "20",
              color: platform.color,
            }}
          >
            {platform.icon}
          </span>
          <div>
            <h3 style={styles.platformName}>{platform.name}</h3>
            <span style={styles.platformDesc}>{platform.description}</span>
          </div>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: statusStyle.bg,
            color: statusStyle.fg,
            boxShadow: statusStyle.glow,
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      {/* Connected Account Info */}
      {isConnected && (platform.platformDisplayName || platform.platformUsername) && (
        <div style={styles.accountInfo}>
          {platform.platformProfileImage && (
            <img
              src={platform.platformProfileImage}
              alt=""
              style={styles.profileImage}
            />
          )}
          <div style={styles.accountDetails}>
            <span style={styles.accountName}>
              {platform.platformDisplayName || platform.platformUsername}
            </span>
            {platform.platformUsername && platform.platformDisplayName && (
              <span style={styles.accountUsername}>@{platform.platformUsername}</span>
            )}
            {platform.connectedAt && (
              <span style={styles.connectedDate}>
                Connected {new Date(platform.connectedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {platform.errorMessage && (
        <div style={styles.errorMessage}>
          <span style={{ color: "#ef4444" }}>⚠</span>
          {platform.errorMessage}
        </div>
      )}

      {/* Not Configured Info */}
      {!platform.configured && (
        <div style={styles.notConfigured}>
          <span style={{ opacity: 0.7 }}>🔑</span>
          <span>API credentials needed. Click below to set up on developer portal.</span>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        {/* Not configured - show setup button */}
        {!platform.configured && (
          <button
            onClick={() => window.open(getSetupUrl(platform.platform), '_blank')}
            style={{
              ...styles.setupButton,
              borderColor: platform.color + "50",
              color: platform.color,
            }}
          >
            🔧 Setup {platform.name} API
          </button>
        )}

        {/* Configured but not connected */}
        {canConnect && (
          <button
            onClick={onConnect}
            disabled={isProcessing}
            style={{
              ...styles.connectButton,
              backgroundColor: platform.color,
            }}
          >
            {connecting ? "Connecting..." : `Connect ${platform.name}`}
          </button>
        )}

        {isConnected && (
          <>
            {platform.status === "expired" && (
              <button
                onClick={onConnect}
                disabled={isProcessing}
                style={styles.reconnectButton}
              >
                🔄 Reconnect
              </button>
            )}
            <button
              onClick={onDisconnect}
              disabled={isProcessing}
              style={styles.disconnectButton}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </>
        )}

        {platform.status === "error" && platform.configured && (
          <button
            onClick={onConnect}
            disabled={isProcessing}
            style={styles.reconnectButton}
          >
            🔄 Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.15)",
    padding: 24,
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    color: "#f1f5f9",
    fontFamily: "'JetBrains Mono', monospace",
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: 14,
    color: "#94a3b8",
  },
  refreshButton: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid rgba(245,158,11,0.3)",
    backgroundColor: "rgba(245,158,11,0.1)",
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  summary: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  statBox: {
    padding: "12px 20px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.2)",
    backgroundColor: "rgba(30,41,59,0.5)",
    textAlign: "center" as const,
    minWidth: 80,
  },
  statValue: {
    display: "block",
    fontSize: 24,
    fontWeight: 700,
    color: "#f1f5f9",
    fontFamily: "'JetBrains Mono', monospace",
  },
  statLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  platformGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: 16,
  },
  platformCard: {
    backgroundColor: "rgba(30,41,59,0.6)",
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    padding: 20,
    transition: "all 0.2s",
  },
  platformHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  platformIdentity: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
  },
  platformIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 600,
    flexShrink: 0,
  },
  platformName: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  platformDesc: {
    fontSize: 12,
    color: "#94a3b8",
    display: "block",
    marginTop: 2,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.03em",
  },
  accountInfo: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.4)",
    borderRadius: 8,
    marginBottom: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },
  accountDetails: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
  },
  accountName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#f1f5f9",
  },
  accountUsername: {
    fontSize: 12,
    color: "#94a3b8",
  },
  connectedDate: {
    fontSize: 11,
    color: "#64748b",
  },
  errorMessage: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 6,
    fontSize: 12,
    color: "#fca5a5",
    marginBottom: 12,
  },
  notConfigured: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.15)",
    borderRadius: 8,
    fontSize: 12,
    color: "#a5b4fc",
    marginBottom: 12,
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },
  connectButton: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  disconnectButton: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.3)",
    backgroundColor: "transparent",
    color: "#ef4444",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  reconnectButton: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid rgba(34,197,94,0.3)",
    backgroundColor: "rgba(34,197,94,0.1)",
    color: "#22c55e",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  setupButton: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid",
    backgroundColor: "rgba(255,255,255,0.03)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTop: "1px solid rgba(148,163,184,0.1)",
  },
  footerText: {
    fontSize: 12,
    color: "#64748b",
  },
  footerRefresh: {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid rgba(148,163,184,0.2)",
    backgroundColor: "transparent",
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
    padding: 40,
    color: "#94a3b8",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid rgba(148,163,184,0.2)",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorState: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 20,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 8,
    color: "#fca5a5",
  },
  retryButton: {
    marginLeft: "auto",
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid rgba(239,68,68,0.3)",
    backgroundColor: "transparent",
    color: "#ef4444",
    fontSize: 12,
    cursor: "pointer",
  },
};

// Add CSS animation for spinner
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
























