"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const PLATFORMS = [
  { key: "twitter", name: "Twitter / X", icon: "𝕏", description: "Post tweets and engage with followers", accent: "#1d9bf0" },
  { key: "instagram", name: "Instagram", icon: "📸", description: "Publish posts, reels, and stories", accent: "#e1306c" },
  { key: "facebook", name: "Facebook", icon: "📘", description: "Post to pages and track engagement", accent: "#1877f2" },
  { key: "linkedin", name: "LinkedIn", icon: "💼", description: "Share professional content", accent: "#0a66c2" },
  { key: "tiktok", name: "TikTok", icon: "🎵", description: "Upload and publish videos", accent: "#ff0050" },
  { key: "youtube", name: "YouTube", icon: "▶️", description: "Upload videos and track analytics", accent: "#ff0000" },
];

type ConnectionSummary = {
  ok: boolean;
  connections?: Array<{ platform: string; status: string; platformUsername?: string; connectedAt?: string }>;
  summary?: { connected: number; configured: number; total: number };
};

export default function SocialConnectPage() {
  const [data, setData] = useState<ConnectionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/oauth/connections", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json?.ok ? json : null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const connections = data?.connections || [];
  const getStatus = (platform: string) => connections.find((c) => c.platform === platform);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 40 }}>
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>SOCIAL CONNECT</div>
            <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
              Social Platform Connections
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
              Connect your social media accounts to enable automated posting, engagement monitoring, and lead detection.
            </p>
          </div>
          <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">Back to dashboard</Link>
        </header>

        {/* Stats */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div className="xom3-grid xom3-grid3">
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>CONNECTED</div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900, color: "#4ade80" }}>
                {loading ? "..." : data?.summary?.connected ?? 0}
              </div>
            </div>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>AVAILABLE</div>
              <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900 }}>{PLATFORMS.length}</div>
            </div>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 14 }}>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 11 }}>STATUS</div>
              <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: (data?.summary?.connected ?? 0) > 0 ? "#4ade80" : "var(--text-2)" }}>
                {loading ? "Loading..." : (data?.summary?.connected ?? 0) > 0 ? "Active" : "No connections"}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Cards */}
        <section className="xom3-section" style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            {PLATFORMS.map((platform) => {
              const conn = getStatus(platform.key);
              const isConnected = conn?.status === "connected";

              return (
                <div
                  key={platform.key}
                  className="xom3-glass xom3-glassEdge"
                  style={{
                    padding: 18,
                    border: isConnected ? `1px solid ${platform.accent}33` : undefined,
                    background: isConnected ? `linear-gradient(135deg, ${platform.accent}08, transparent)` : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center",
                      fontSize: 20, background: `${platform.accent}18`, border: `1px solid ${platform.accent}30`,
                    }}>
                      {platform.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 750, color: "var(--text-0)", fontSize: 14 }}>{platform.name}</div>
                      {isConnected && conn?.platformUsername && (
                        <div style={{ fontSize: 11, color: "var(--text-2)" }}>@{conn.platformUsername}</div>
                      )}
                    </div>
                    {isConnected && (
                      <div style={{
                        padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                        background: "rgba(34,197,94,0.15)", color: "#4ade80",
                      }}>
                        Connected
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.4, marginBottom: 14 }}>
                    {platform.description}
                  </div>

                  {isConnected ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="xom3-btn xom3-btnSecondary"
                        style={{ flex: 1, fontSize: 12, padding: "8px 12px", cursor: "pointer" }}
                        onClick={() => window.location.href = `/api/oauth/${platform.key}/authorize`}
                      >
                        Reconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      className="xom3-btn xom3-btnPrimary"
                      style={{ width: "100%", fontSize: 13, padding: "10px 16px", cursor: "pointer", background: platform.accent }}
                      onClick={() => window.location.href = `/api/oauth/${platform.key}/authorize`}
                    >
                      Connect {platform.name}
                    </button>
                  )}

                  {isConnected && conn?.connectedAt && (
                    <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8 }}>
                      Connected {timeAgo(conn.connectedAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
