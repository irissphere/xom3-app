"use client";

import { useState, useCallback } from "react";
import type { OperatorDashboardContext } from "../page";
import { 
  OperatorPanelFrame, 
  PostureChip, 
  PanelError, 
  PanelEmpty,
  useOperatorPanel 
} from "./OperatorDashboardPanelKit";

interface ReferralData {
  code: string;
  url: string;
  clicks: number;
  signups: number;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarningsFormatted: string;
    pendingEarningsFormatted: string;
    commissionRatePercent: string;
  };
}

async function load(ctx: OperatorDashboardContext): Promise<ReferralData> {
  // Get referral code
  const codeRes = await fetch("/api/referral/code", { headers: ctx.headers });
  const codeData = await codeRes.json();
  
  if (!codeRes.ok) {
    throw new Error(codeData.error || "Failed to load referral code");
  }

  // Get referral stats
  const statsRes = await fetch("/api/referral/stats", { headers: ctx.headers });
  const statsData = await statsRes.json();

  return {
    code: codeData.code,
    url: codeData.url,
    clicks: codeData.clicks || 0,
    signups: codeData.signups || 0,
    stats: statsData.stats || {
      totalReferrals: 0,
      activeReferrals: 0,
      totalEarningsFormatted: "$0.00",
      pendingEarningsFormatted: "$0.00",
      commissionRatePercent: "10%",
    },
  };
}

function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: "14px 16px",
      textAlign: "center",
    }}>
      <div style={{ 
        fontSize: 11, 
        color: "var(--text-2)", 
        textTransform: "uppercase", 
        letterSpacing: "0.05em",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ 
        fontSize: 22, 
        fontWeight: 700, 
        color: "var(--text-0)",
        fontFamily: "var(--font-mono)",
      }}>
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

export default function ImpactRewardsPanel(props: { ctx: OperatorDashboardContext }) {
  const [copied, setCopied] = useState(false);
  
  const { state, refresh } = useOperatorPanel({
    ctx: props.ctx,
    panel: "impact_rewards",
    refreshMs: 30000,
    load,
  });

  const copyToClipboard = useCallback(async () => {
    if (!state.data?.url) return;
    
    try {
      await navigator.clipboard.writeText(state.data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [state.data?.url]);

  const data = state.data;

  return (
    <OperatorPanelFrame 
      title="Impact Rewards" 
      hint="Refer operators • Earn 10% for 3 months"
      right={
        data && (
          <PostureChip 
            label={data.stats.activeReferrals > 0 ? "Active" : "Ready"} 
            tone={data.stats.activeReferrals > 0 ? "ok" : "neutral"} 
          />
        )
      }
    >
      {state.error && <PanelError label="Rewards unavailable" error={state.error} />}
      
      {!state.error && !data && state.loading && (
        <div style={{ color: "var(--text-2)", fontSize: 13 }}>Loading rewards...</div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Referral Code Section */}
          <div style={{
            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(10, 132, 255, 0.06))",
            border: "1px solid rgba(34, 197, 94, 0.2)",
            borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ 
              fontSize: 11, 
              color: "var(--text-2)", 
              textTransform: "uppercase", 
              letterSpacing: "0.08em",
              marginBottom: 8,
            }}>
              Your Referral Code
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                flex: 1,
                background: "rgba(0,0,0,0.3)",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 700,
                color: "#22c55e",
                letterSpacing: "0.15em",
              }}>
                {data.code}
              </div>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(10, 132, 255, 0.15)",
                  border: copied 
                    ? "1px solid rgba(34, 197, 94, 0.4)" 
                    : "1px solid rgba(10, 132, 255, 0.3)",
                  color: copied ? "#22c55e" : "#5ac8fa",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
            <div style={{ 
              marginTop: 8, 
              fontSize: 12, 
              color: "var(--text-2)",
              wordBreak: "break-all",
            }}>
              {data.url}
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <StatCard 
              label="Total Earnings" 
              value={data.stats.totalEarningsFormatted} 
            />
            <StatCard 
              label="Pending" 
              value={data.stats.pendingEarningsFormatted} 
            />
            <StatCard 
              label="Referrals" 
              value={data.stats.totalReferrals} 
              sublabel={`${data.stats.activeReferrals} active`}
            />
            <StatCard 
              label="Link Clicks" 
              value={data.clicks}
              sublabel={`${data.signups} signups`}
            />
          </div>

          {/* Commission Info */}
          <div style={{
            padding: "12px 14px",
            background: "rgba(10, 132, 255, 0.06)",
            border: "1px solid rgba(10, 132, 255, 0.15)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--text-1)",
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "#5ac8fa" }}>How it works:</strong> Share your link. 
            When someone signs up and makes purchases, you earn{" "}
            <strong style={{ color: "#22c55e" }}>{data.stats.commissionRatePercent}</strong>{" "}
            commission on their spend for the first 3 months.
          </div>
        </div>
      )}
    </OperatorPanelFrame>
  );
}


