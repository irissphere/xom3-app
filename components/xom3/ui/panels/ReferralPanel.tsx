"use client";

import { useState, useCallback } from "react";
import type { OperatorDashboardContext } from "@/app/operator/dashboard/page";
import { 
  OperatorPanelFrame, 
  PostureChip, 
  PanelError, 
  useOperatorPanel 
} from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";

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

export default function ReferralPanel(props: { ctx: OperatorDashboardContext }) {
  const [copied, setCopied] = useState(false);
  
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "referral_posture",
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
      title="Referral Engine" 
      hint="Network growth • Performance incentives"
      right={
        data && (
          <PostureChip 
            label={data.stats.activeReferrals > 0 ? "Active" : "Ready"} 
            tone={data.stats.activeReferrals > 0 ? "ok" : "neutral"} 
          />
        )
      }
    >
      {state.error && <PanelError label="Referral system degraded" error={state.error} />}
      
      {!state.error && !data && state.loading && (
        <div style={{ color: "var(--text-2)", fontSize: 13 }}>Loading engine...</div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Referral Code Section */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.08)",
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
              Active Referral Code
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
                color: "var(--xom3-primary)",
                letterSpacing: "0.15em",
              }}>
                {data.code}
              </div>
              <button
                onClick={copyToClipboard}
                className="xom3-btn xom3-btnSecondary"
                style={{ height: 44 }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div style={{ 
              marginTop: 8, 
              fontSize: 11, 
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              wordBreak: "break-all",
            }}>
              {data.url}
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <StatCard 
              label="Earnings" 
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
              label="Traffic" 
              value={data.clicks}
              sublabel={`${data.signups} conversions`}
            />
          </div>
        </div>
      )}
    </OperatorPanelFrame>
  );
}













