"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SurfaceFrame from "@/app/components/SurfaceFrame";

interface CodeResponse {
  code: string;
  url: string;
  clicks: number;
  signups: number;
}

interface StatsResponse {
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarningsFormatted: string;
    pendingEarningsFormatted: string;
    commissionRatePercent: string;
  };
  recentReferrals: Array<{
    id: string;
    createdAt: string;
    active: boolean;
  }>;
  recentCommissions: Array<{
    id: string;
    amountFormatted: string;
    period: string;
    credited: boolean;
    createdAt: string;
  }>;
}

// Mock leaderboard data
const mockLeaderboard = [
  { rank: 1, name: "Op****er", referrals: 47, earnings: "$892.50" },
  { rank: 2, name: "Gr****th", referrals: 38, earnings: "$714.00" },
  { rank: 3, name: "Mo****ey", referrals: 31, earnings: "$583.50" },
  { rank: 4, name: "Te****ch", referrals: 24, earnings: "$451.00" },
  { rank: 5, name: "In****va", referrals: 19, earnings: "$357.00" },
];

export default function ImpactPage() {
  const [codeData, setCodeData] = useState<CodeResponse | null>(null);
  const [statsData, setStatsData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userRank, setUserRank] = useState(12);

  useEffect(() => {
    async function fetchData() {
      try {
        const [codeRes, statsRes] = await Promise.all([
          fetch("/api/referral/code"),
          fetch("/api/referral/stats"),
        ]);
        
        if (codeRes.ok) {
          const codeJson = await codeRes.json();
          setCodeData(codeJson);
        }
        
        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStatsData(statsJson);
        }
      } catch (error) {
        console.error("Failed to fetch referral data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const conversionRate = codeData && codeData.clicks > 0 
    ? ((codeData.signups / codeData.clicks) * 100).toFixed(1) 
    : "0.0";

  return (
    <SurfaceFrame
      title="Impact Rewards"
      description="Earn 10% commission for 3 months on every referral"
      activation="active"
      links={[
        { href: "/operator/dashboard", label: "Dashboard" },
        { href: "/wallet", label: "Wallet" },
      ]}
    >
      {loading ? (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: "3px solid rgba(34, 197, 94, 0.2)",
            borderTop: "3px solid #22c55e",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ color: "var(--text-2)" }}>Loading your impact data...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Hero Stats Banner */}
          <div className="xom3-glass xom3-glassEdge" style={{ 
            padding: 24,
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 132, 255, 0.05) 100%)"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
              {/* Total Earnings */}
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  fontSize: 42, 
                  fontWeight: 800, 
                  color: "#22c55e",
                  letterSpacing: "-0.02em",
                  lineHeight: 1
                }}>
                  {statsData?.stats.totalEarningsFormatted || "$0.00"}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: "var(--text-2)", 
                  marginTop: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                  Total Earnings
                </div>
              </div>
              
              {/* Pending Earnings */}
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: "#f59e0b",
                  letterSpacing: "-0.02em"
                }}>
                  {statsData?.stats.pendingEarningsFormatted || "$0.00"}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: "var(--text-2)", 
                  marginTop: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                  Pending
                </div>
              </div>
              
              {/* Active Referrals */}
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: "#0a84ff",
                  letterSpacing: "-0.02em"
                }}>
                  {statsData?.stats.activeReferrals || 0}
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: "var(--text-2)", 
                  marginTop: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                  Active Referrals
                </div>
              </div>
              
              {/* Conversion Rate */}
              <div style={{ textAlign: "center" }}>
                <div style={{ 
                  fontSize: 32, 
                  fontWeight: 700, 
                  color: "#a78bfa",
                  letterSpacing: "-0.02em"
                }}>
                  {conversionRate}%
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: "var(--text-2)", 
                  marginTop: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                  Conversion Rate
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            
            {/* Referral Link Card */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>🔗</span>
                Your Referral Link
              </h3>
              
              {/* Code Display */}
              <div style={{
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                textAlign: "center"
              }}>
                <div style={{ 
                  fontSize: 11, 
                  color: "var(--text-2)", 
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}>
                  Your Code
                </div>
                <div style={{ 
                  fontSize: 28, 
                  fontWeight: 800, 
                  color: "#22c55e",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.15em"
                }}>
                  {codeData?.code || "LOADING..."}
                </div>
              </div>
              
              {/* Full URL */}
              <div style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 8,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: 13,
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
                wordBreak: "break-all"
              }}>
                {codeData?.url || "https://..."}
              </div>
              
              {/* Copy Buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => codeData && handleCopy(codeData.url)}
                  className="xom3-btn xom3-btnPrimary"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Link"}
                </button>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent("Check out XOM3!");
                    const body = encodeURIComponent(`I've been using XOM3 for my business automation and thought you'd find it useful too.\n\nSign up with my referral link: ${codeData?.url}`);
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }}
                  className="xom3-btn xom3-btnSecondary"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  ✉️ Email
                </button>
              </div>
              
              {/* Stats */}
              <div style={{ 
                display: "flex", 
                gap: 16, 
                marginTop: 16, 
                paddingTop: 16,
                borderTop: "1px solid rgba(255,255,255,0.06)"
              }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#0a84ff" }}>
                    {codeData?.clicks || 0}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>Clicks</div>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#22c55e" }}>
                    {codeData?.signups || 0}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>Signups</div>
                </div>
              </div>
            </div>

            {/* Leaderboard Card */}
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                Referral Leaderboard
              </h3>
              
              {/* Your Rank */}
              <div style={{
                background: "linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.05) 100%)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>Your Rank</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>#{userRank}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>To Next Rank</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#a78bfa" }}>
                    {userRank > 1 ? `${(userRank - 1) * 3} more referrals` : "🥇 You're #1!"}
                  </div>
                </div>
              </div>
              
              {/* Top 5 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mockLeaderboard.map((entry, i) => (
                  <div
                    key={entry.rank}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      background: i === 0 ? "rgba(255, 215, 0, 0.08)" : "rgba(255,255,255,0.02)",
                      borderRadius: 8,
                      border: i === 0 ? "1px solid rgba(255, 215, 0, 0.2)" : "1px solid transparent"
                    }}
                  >
                    <div style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: "50%",
                      background: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "rgba(255,255,255,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: i < 3 ? "#000" : "var(--text-2)"
                    }}>
                      {entry.rank}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-2)" }}>{entry.referrals} referrals</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
                      {entry.earnings}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Earnings Timeline */}
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 20 }}>💰</span>
              Earnings Timeline
            </h3>
            
            {statsData?.recentCommissions && statsData.recentCommissions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {statsData.recentCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 10,
                      borderLeft: commission.credited 
                        ? "3px solid #22c55e" 
                        : "3px solid #f59e0b"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: commission.credited 
                          ? "rgba(34, 197, 94, 0.15)" 
                          : "rgba(245, 158, 11, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16
                      }}>
                        {commission.credited ? "✓" : "⏳"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>
                          {commission.amountFormatted}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {commission.period}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: commission.credited 
                          ? "rgba(34, 197, 94, 0.15)" 
                          : "rgba(245, 158, 11, 0.15)",
                        color: commission.credited ? "#22c55e" : "#f59e0b"
                      }}>
                        {commission.credited ? "CREDITED" : "PENDING"}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                padding: 40, 
                color: "var(--text-2)",
                background: "rgba(255,255,255,0.02)",
                borderRadius: 12
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
                <div>No commissions yet. Share your link to start earning!</div>
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 700, 
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <span style={{ fontSize: 20 }}>📖</span>
              How It Works
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {[
                { 
                  step: 1, 
                  icon: "🔗", 
                  title: "Share Your Link", 
                  desc: "Send your unique referral link to friends, colleagues, or your audience" 
                },
                { 
                  step: 2, 
                  icon: "✅", 
                  title: "They Sign Up", 
                  desc: "When someone signs up using your link, they become your referral" 
                },
                { 
                  step: 3, 
                  icon: "💵", 
                  title: "Earn Commission", 
                  desc: "Get 10% of their subscription fees for 3 months" 
                }
              ].map((item) => (
                <div
                  key={item.step}
                  style={{
                    textAlign: "center",
                    padding: 20,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 12,
                    position: "relative"
                  }}
                >
                  <div style={{
                    position: "absolute",
                    top: -10,
                    left: -10,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #0a84ff, #a78bfa)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Commission Details */}
            <div style={{
              marginTop: 20,
              padding: 16,
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 132, 255, 0.05) 100%)",
              borderRadius: 12,
              display: "flex",
              justifyContent: "center",
              gap: 40
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>10%</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Commission Rate</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0a84ff" }}>3 Months</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Duration</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>No Limit</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>On Referrals</div>
              </div>
            </div>
          </div>
          
        </div>
      )}
    </SurfaceFrame>
  );
}
