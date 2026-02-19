"use client";

import ExtendedAgentSovereignPanel from "@/components/xom3/ui/panels/ExtendedAgentSovereignPanel";

export default function AgentsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-0, #0d0d0f)",
        color: "var(--text-0, #f7f8ff)",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>🤖</span>
            Extended Agent Command Center
          </h1>
          <p style={{ color: "var(--text-2, #8b92a7)", marginTop: 8, fontSize: 14 }}>
            7 Sovereigns • 35 Agents • Self-optimizing multi-agent orchestration
          </p>
        </header>

        <ExtendedAgentSovereignPanel refreshMs={10000} />

        {/* Quick Reference */}
        <div
          style={{
            marginTop: 32,
            padding: 20,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>Quick Reference</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <QuickRef
              title="Social Sovereign"
              icon="📱"
              agents={["ContentPulse", "ReelCaster", "YouTubeAgent", "TrendScanner", "EngagementOptimizer"]}
            />
            <QuickRef
              title="Marketing Sovereign"
              icon="📣"
              agents={["LeadFlow", "ReferralBot", "CampaignAgent", "ABTestAgent", "AudienceSegmenter"]}
            />
            <QuickRef
              title="Finance Sovereign"
              icon="💰"
              agents={["TradeAgent", "RiskSentinel", "ROITracker", "PortfolioOptimizer", "MarketSentiment"]}
            />
            <QuickRef
              title="Revenue Sovereign"
              icon="📈"
              agents={["RevenueOptimizer", "ChurnPredictor", "CLVPredictor", "PricingAgent", "UpsellAgent"]}
            />
            <QuickRef
              title="Commerce Sovereign"
              icon="🛒"
              agents={["TemplateSmith", "SaaSBeacon", "ApparelSync", "FulfillmentAgent", "InventoryOptimizer"]}
            />
            <QuickRef
              title="Compliance Sovereign"
              icon="⚖️"
              agents={["ComplianceBridge", "LegalResearch", "ContractWeaver", "TaxOptimizer", "IPManager"]}
            />
            <QuickRef
              title="Infrastructure Sovereign"
              icon="🔧"
              agents={["SelfHealer", "SecurityHunter", "PerformanceMonitor", "CostOptimizer", "ScalingAgent"]}
            />
          </div>
        </div>

        {/* API Reference */}
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600 }}>API Reference</h3>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, display: "grid", gap: 8 }}>
            <ApiRef method="GET" path="/api/agents/overview" desc="Get all sovereigns and agents status" />
            <ApiRef method="GET" path="/api/agents/sovereign/{sovereignId}" desc="Get sovereign details" />
            <ApiRef method="POST" path="/api/agents/sovereign/{sovereignId}" desc="Execute sovereign action" />
            <ApiRef method="GET" path="/api/agents/{agentId}/execute" desc="Get agent details" />
            <ApiRef method="POST" path="/api/agents/{agentId}/execute" desc="Execute agent action" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickRef({ title, icon, agents }: { title: string; icon: string; agents: string[] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 12 }}>{title}</span>
      </div>
      <div style={{ fontSize: 10, color: "var(--text-2)", lineHeight: 1.6 }}>{agents.join(" • ")}</div>
    </div>
  );
}

function ApiRef({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color = method === "GET" ? "#22c55e" : "#F4B942";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          background: color,
          color: "#000",
          padding: "2px 6px",
          borderRadius: 4,
          fontWeight: 700,
          fontSize: 9,
        }}
      >
        {method}
      </span>
      <span style={{ color: "var(--text-1)" }}>{path}</span>
      <span style={{ color: "var(--text-2)", marginLeft: "auto" }}>{desc}</span>
    </div>
  );
}























