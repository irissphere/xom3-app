"use client";

import { useState, useCallback } from "react";
import type { OperatorDashboardContext } from "../page";
import { 
  OperatorPanelFrame, 
  PostureChip, 
  PanelError,
  useOperatorPanel 
} from "./OperatorDashboardPanelKit";

interface SubscriptionData {
  currentTier: string;
  tierLabel: string;
  status: string;
  balance: number;
  balanceFormatted: string;
  trialActive: boolean;
  trialDaysRemaining: number;
  usage: {
    credits: number;
    creditsLimit: number | "unlimited";
  };
}

async function load(ctx: OperatorDashboardContext): Promise<SubscriptionData> {
  // Get subscription status
  const subRes = await fetch("/api/subscription/status", { headers: ctx.headers });
  const subData = await subRes.json();

  // Get wallet status
  const walletRes = await fetch("/api/wallet/status", { headers: ctx.headers });
  const walletData = await walletRes.json();

  const wallet = walletData.wallet || {};
  
  return {
    currentTier: subData.tier || "trial",
    tierLabel: getTierLabel(subData.tier || "trial"),
    status: subData.status || "active",
    balance: wallet.balance || 0,
    balanceFormatted: wallet.balanceFormatted || "$0.00",
    trialActive: wallet.trialActive || false,
    trialDaysRemaining: wallet.trialDaysRemaining || 0,
    usage: {
      credits: wallet.balance || 0,
      creditsLimit: getTierCreditsLimit(subData.tier || "trial"),
    },
  };
}

function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    free: "Free",
    trial: "Trial",
    starter: "Starter — $49/mo",
    growth: "Growth — $149/mo",
    pro: "Pro — $497/mo",
    enterprise: "Enterprise",
  };
  return labels[tier] || tier;
}

function getTierCreditsLimit(tier: string): number | "unlimited" {
  const limits: Record<string, number | "unlimited"> = {
    free: 0,
    trial: 1000,
    starter: 5000,
    growth: 20000,
    pro: "unlimited",
    enterprise: "unlimited",
  };
  return limits[tier] || 1000;
}

function TierCard({ 
  tier, 
  name, 
  price, 
  credits, 
  features, 
  current, 
  popular,
  onSelect 
}: { 
  tier: string;
  name: string;
  price: string;
  credits: string;
  features: string[];
  current?: boolean;
  popular?: boolean;
  onSelect: () => void;
}) {
  return (
    <div style={{
      position: "relative",
      background: current 
        ? "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(10, 132, 255, 0.08))"
        : "rgba(255,255,255,0.02)",
      border: current 
        ? "2px solid rgba(34, 197, 94, 0.4)"
        : popular 
          ? "2px solid rgba(10, 132, 255, 0.4)"
          : "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      {popular && !current && (
        <div style={{
          position: "absolute",
          top: -10,
          right: 12,
          padding: "4px 10px",
          background: "linear-gradient(135deg, #0a84ff, #6366f1)",
          borderRadius: 10,
          fontSize: 9,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: "0.08em",
        }}>
          BEST VALUE
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-0)" }}>
          {name}
        </div>
        {current && (
          <PostureChip label="Current" tone="ok" />
        )}
      </div>

      <div style={{ 
        fontSize: 24, 
        fontWeight: 700, 
        color: current ? "#22c55e" : "var(--text-0)",
        fontFamily: "var(--font-mono)",
      }}>
        {price}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
        {credits} credits/month
      </div>

      <ul style={{ 
        margin: 0, 
        paddingLeft: 16, 
        fontSize: 12, 
        color: "var(--text-1)",
        lineHeight: 1.6,
      }}>
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>

      {!current && (
        <button
          onClick={onSelect}
          style={{
            marginTop: "auto",
            padding: "10px 16px",
            borderRadius: 8,
            background: popular 
              ? "linear-gradient(135deg, #0a84ff, #6366f1)"
              : "rgba(255,255,255,0.05)",
            border: popular 
              ? "none"
              : "1px solid rgba(255,255,255,0.15)",
            color: popular ? "#fff" : "var(--text-1)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {popular ? "Upgrade Now" : "Select"}
        </button>
      )}
    </div>
  );
}

export default function SubscriptionPricingPanel(props: { ctx: OperatorDashboardContext }) {
  const [upgrading, setUpgrading] = useState(false);
  
  const { state } = useOperatorPanel({
    ctx: props.ctx,
    panel: "subscription_pricing",
    refreshMs: 60000,
    load,
  });

  const handleUpgrade = useCallback(async (tier: string) => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: props.ctx.headers,
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setUpgrading(false);
    }
  }, [props.ctx.headers]);

  const data = state.data;

  const tiers = [
    {
      tier: "starter",
      name: "Starter",
      price: "$49/mo",
      credits: "$60 value",
      features: ["$60 credit included", "Basic automation", "Email support"],
    },
    {
      tier: "growth",
      name: "Growth",
      price: "$149/mo",
      credits: "$200 value",
      popular: true,
      features: ["$200 credit included", "Advanced AI", "Priority support", "Auto top-ups"],
    },
    {
      tier: "pro",
      name: "Pro",
      price: "$497/mo",
      credits: "Unlimited",
      features: ["Unlimited credits", "All features", "Dedicated support", "Custom integrations"],
    },
  ];

  return (
    <OperatorPanelFrame 
      title="Subscription & Pricing" 
      hint="Credit-based usage • Pay for what you use"
      right={
        data && (
          <PostureChip 
            label={data.trialActive ? `Trial: ${data.trialDaysRemaining}d left` : data.tierLabel} 
            tone={data.trialActive ? "ok" : data.status === "active" ? "ok" : "degraded"} 
          />
        )
      }
    >
      {state.error && <PanelError label="Subscription unavailable" error={state.error} />}
      
      {!state.error && !data && state.loading && (
        <div style={{ color: "var(--text-2)", fontSize: 13 }}>Loading subscription...</div>
      )}

      {data && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Current Balance */}
          <div style={{
            background: "linear-gradient(135deg, rgba(10, 132, 255, 0.1), rgba(99, 102, 241, 0.08))",
            border: "1px solid rgba(10, 132, 255, 0.25)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 4 }}>
                Available Balance
              </div>
              <div style={{ 
                fontSize: 28, 
                fontWeight: 700, 
                color: "#22c55e",
                fontFamily: "var(--font-mono)",
              }}>
                {data.balanceFormatted}
              </div>
              {data.trialActive && (
                <div style={{ 
                  marginTop: 6,
                  fontSize: 12, 
                  color: "var(--text-2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <span style={{ color: "#22c55e" }}>●</span>
                  Trial active — {data.trialDaysRemaining} days remaining
                </div>
              )}
            </div>
            <button
              onClick={() => window.location.href = "/wallet/add-funds"}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                color: "#22c55e",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Add Funds
            </button>
          </div>

          {/* Tier Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(3, 1fr)", 
            gap: 12,
          }}>
            {tiers.map((t) => (
              <TierCard
                key={t.tier}
                tier={t.tier}
                name={t.name}
                price={t.price}
                credits={t.credits}
                features={t.features}
                current={data.currentTier === t.tier}
                popular={t.popular}
                onSelect={() => handleUpgrade(t.tier)}
              />
            ))}
          </div>

          {/* Pay As You Go Link */}
          <div style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-2)",
          }}>
            Or{" "}
            <a 
              href="/pricing" 
              style={{ color: "#5ac8fa", textDecoration: "none" }}
            >
              view pay-as-you-go pricing →
            </a>
          </div>
        </div>
      )}

      {upgrading && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{ color: "#fff", fontSize: 16 }}>Redirecting to checkout...</div>
        </div>
      )}
    </OperatorPanelFrame>
  );
}

