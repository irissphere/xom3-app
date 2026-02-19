"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeatureGate } from "@/app/components/FeatureGate";
import { SubscriptionTier, FeatureKey } from "@/lib/tiers/types";
import { hasFeature, getMinimumTierForFeature } from "@/lib/tiers/features";

type Product = {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  gradient: string;
  href: string;
  features: string[];
  status: "available" | "coming-soon" | "beta";
  requiredTier?: SubscriptionTier;
  featureKey?: "leads" | "sms" | "social" | "workflows" | "ecommerce" | "appointments";
};

const PRODUCTS: Product[] = [
  {
    id: "leads",
    name: "Lead Engine",
    tagline: "Qualified leads delivered daily",
    icon: "⚡",
    gradient: "linear-gradient(135deg, #0a84ff, #5ac8fa)",
    href: "/leads",
    features: ["AI-powered prospecting", "Lead scoring", "Daily delivery", "Industry targeting"],
    status: "available",
    requiredTier: "starter",
    featureKey: "leads",
  },
  {
    id: "crm",
    name: "CRM",
    tagline: "Pipeline management and tracking",
    icon: "📊",
    gradient: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
    href: "/intakecrm",
    features: ["Lead management", "Pipeline tracking", "Task automation", "Contact history"],
    status: "available",
    requiredTier: "free",
  },
  {
    id: "social",
    name: "Social Broadcast",
    tagline: "Content posted while you sleep",
    icon: "📡",
    gradient: "linear-gradient(135deg, #a78bfa, #8b5cf6)",
    href: "/broadcast",
    features: ["Multi-platform posting", "Content scheduling", "Trend-aware content", "Analytics"],
    status: "available",
    requiredTier: "starter",
    featureKey: "social",
  },
  {
    id: "commerce",
    name: "Ecommerce",
    tagline: "Self-hosted store engine",
    icon: "🛒",
    gradient: "linear-gradient(135deg, #f97316, #fb923c)",
    href: "/commerce",
    features: ["Product intelligence", "Order management", "VPS deployment", "Revenue tracking"],
    status: "available",
    requiredTier: "pro",
    featureKey: "ecommerce",
  },
  {
    id: "funnels",
    name: "Funnel Engine",
    tagline: "Automated conversion workflows",
    icon: "🔄",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
    href: "/orchestration",
    features: ["Cross-lane automation", "Trigger-based flows", "Signal routing", "Instance tracking"],
    status: "available",
    requiredTier: "growth",
    featureKey: "workflows",
  },
  {
    id: "revenue",
    name: "Revenue Loop",
    tagline: "Attribution and optimization",
    icon: "💰",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    href: "/revenue-loop",
    features: ["Revenue attribution", "ROI tracking", "Optimization loops", "Performance analytics"],
    status: "available",
    requiredTier: "pro",
  },
  {
    id: "analytics",
    name: "Analytics",
    tagline: "Business intelligence dashboard",
    icon: "📈",
    gradient: "linear-gradient(135deg, #6366f1, #4f46e5)",
    href: "/analytics",
    features: ["Performance metrics", "Custom reports", "Data visualization", "Export capabilities"],
    status: "available",
    requiredTier: "free",
  },
  {
    id: "automation",
    name: "Automation",
    tagline: "Workflow builder and triggers",
    icon: "🤖",
    gradient: "linear-gradient(135deg, #ec4899, #db2777)",
    href: "/automation",
    features: ["Visual workflow builder", "Custom triggers", "Action sequences", "Error handling"],
    status: "available",
    requiredTier: "growth",
    featureKey: "workflows",
  },
  {
    id: "agents",
    name: "AI Agents",
    tagline: "Intelligent automation assistants",
    icon: "🧠",
    gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
    href: "/agents",
    features: ["Decision loops", "Task automation", "Learning systems", "Multi-agent orchestration"],
    status: "beta",
    requiredTier: "pro",
  },
  {
    id: "sovereigns",
    name: "Sovereigns",
    tagline: "System intelligence layer",
    icon: "👑",
    gradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    href: "/sovereigns",
    features: ["System health", "Signal processing", "Intelligence layer", "Autonomous operations"],
    status: "available",
    requiredTier: "enterprise",
  },
];

export default function ProductsPage() {
  const [userTier, setUserTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data?.effectiveTier) {
          setUserTier(data.effectiveTier);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter products based on tier using the feature system
  const availableProducts = PRODUCTS.filter((product) => {
    // If product has a featureKey, use hasFeature() to check access (uses tier config)
    if (product.featureKey) {
      return hasFeature(userTier, product.featureKey);
    }
    // Otherwise, use requiredTier comparison (for products without feature keys)
    if (!product.requiredTier) return true;
    const tierOrder: SubscriptionTier[] = ["free", "trial", "starter", "growth", "pro", "enterprise"];
    return tierOrder.indexOf(userTier) >= tierOrder.indexOf(product.requiredTier);
  });

  const lockedProducts = PRODUCTS.filter((product) => {
    // If product has a featureKey, check if user doesn't have access (uses tier config)
    if (product.featureKey) {
      return !hasFeature(userTier, product.featureKey);
    }
    // Otherwise, use requiredTier comparison
    if (!product.requiredTier) return false;
    const tierOrder: SubscriptionTier[] = ["free", "trial", "starter", "growth", "pro", "enterprise"];
    return tierOrder.indexOf(userTier) < tierOrder.indexOf(product.requiredTier);
  });

  if (loading) {
    return (
      <main className="xom3-home">
        <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24, textAlign: "center" }}>
          <div style={{ color: "var(--text-2)", fontSize: 14 }}>Loading products...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ marginBottom: 32 }}>
          <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
            PRODUCT SUITE
          </div>
          <h1 style={{ margin: "10px 0 6px 0", fontSize: 32, fontWeight: 860, letterSpacing: "-0.02em" }}>
            Everything You Need to Grow
          </h1>
          <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
            Complete automation platform. Your plan: <strong style={{ color: "#5ac8fa" }}>{userTier.charAt(0).toUpperCase() + userTier.slice(1)}</strong>
          </p>
        </header>

        {/* Available Products */}
        {availableProducts.length > 0 && (
          <section className="xom3-section" style={{ marginBottom: 32 }}>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, marginBottom: 16 }}>
              AVAILABLE IN YOUR PLAN
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
              gap: 20 
            }}>
              {availableProducts.map((product) => (
                <ProductCard key={product.id} product={product} userTier={userTier} />
              ))}
            </div>
          </section>
        )}

        {/* Locked Products */}
        {lockedProducts.length > 0 && (
          <section className="xom3-section">
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, marginBottom: 16 }}>
              UPGRADE TO UNLOCK
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
              gap: 20 
            }}>
              {lockedProducts.map((product) => (
                <ProductCard key={product.id} product={product} userTier={userTier} locked />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ProductCard({ product, userTier, locked = false }: { product: Product; userTier: SubscriptionTier; locked?: boolean }) {
  // Use feature system to check access (uses tier config from features.ts)
  const hasAccess = !locked && (
    product.featureKey 
      ? hasFeature(userTier, product.featureKey) // Uses TIER_CONFIGS to check limits
      : !product.requiredTier || (() => {
          const tierOrder: SubscriptionTier[] = ["free", "trial", "starter", "growth", "pro", "enterprise"];
          return tierOrder.indexOf(userTier) >= tierOrder.indexOf(product.requiredTier);
        })()
  );
  
  // Get the actual required tier from feature system if available
  const effectiveRequiredTier = product.featureKey 
    ? getMinimumTierForFeature(product.featureKey)
    : product.requiredTier;

  const statusColors = {
    available: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)", text: "#22c55e" },
    beta: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", text: "#f59e0b" },
    "coming-soon": { bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" },
  };

  const statusColor = statusColors[product.status];

  const cardContent = (
    <div
      className="xom3-glass xom3-glassEdge"
      style={{
        padding: 24,
        borderRadius: 16,
        border: locked 
          ? "1px solid rgba(99, 102, 241, 0.2)" 
          : "1px solid rgba(255,255,255,0.08)",
        background: locked 
          ? "rgba(99, 102, 241, 0.05)" 
          : "rgba(10, 14, 26, 0.65)",
        cursor: hasAccess && product.status === "available" ? "pointer" : "default",
        transition: "all 200ms ease",
        position: "relative",
        overflow: "hidden",
        opacity: locked ? 0.7 : 1,
      }}
      onMouseOver={(e) => {
        if (hasAccess && product.status === "available") {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.borderColor = "rgba(90, 200, 250, 0.25)";
          e.currentTarget.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.3)";
        }
      }}
      onMouseOut={(e) => {
        if (hasAccess && product.status === "available") {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
          {/* Gradient accent */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: product.gradient,
            }}
          />

          {/* Status badge */}
          <div
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              padding: "4px 10px",
              borderRadius: 12,
              background: statusColor.bg,
              border: `1px solid ${statusColor.border}`,
              color: statusColor.text,
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {product.status === "available" ? "Available" : product.status === "beta" ? "Beta" : "Coming Soon"}
          </div>

          {/* Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: product.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              marginBottom: 16,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            }}
          >
            {product.icon}
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 6,
            }}
          >
            {product.name}
          </h3>

          {/* Tagline */}
          <p
            style={{
              fontSize: 14,
              color: "rgba(247, 248, 255, 0.6)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            {product.tagline}
          </p>

          {/* Features */}
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {product.features.slice(0, 3).map((feature, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "rgba(247, 248, 255, 0.8)",
                }}
              >
                <span style={{ color: "#5ac8fa", fontSize: 12 }}>✓</span>
                {feature}
              </li>
            ))}
          </ul>

          {/* Tier requirement */}
          {(effectiveRequiredTier || hasAccess) && (
            <div
              style={{
                marginTop: 16,
                padding: "8px 12px",
                borderRadius: 8,
                background: locked
                  ? "rgba(99, 102, 241, 0.15)"
                  : "rgba(10, 132, 255, 0.1)",
                border: locked
                  ? "1px solid rgba(99, 102, 241, 0.3)"
                  : "1px solid rgba(10, 132, 255, 0.2)",
                fontSize: 12,
                color: locked ? "#a5b4fc" : "#5ac8fa",
                fontWeight: 600,
              }}
            >
              {locked ? "🔒 " : ""}
              {locked
                ? `${(effectiveRequiredTier || "pro").charAt(0).toUpperCase() + (effectiveRequiredTier || "pro").slice(1)} tier`
                : `${userTier.charAt(0).toUpperCase() + userTier.slice(1)} tier`}
            </div>
          )}

          {/* CTA */}
          {locked ? (
            <Link
              href="/pricing"
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(99, 102, 241, 0.15)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "#a5b4fc",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Upgrade to Unlock →
            </Link>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: product.status === "available" ? "#5ac8fa" : "#64748b",
              }}
            >
              {product.status === "available" ? (
                <>
                  <span>Open {product.name}</span>
                  <span>→</span>
                </>
              ) : (
                <span>Coming soon</span>
              )}
            </div>
          )}
        </div>
  );

  if (locked) {
    return <div style={{ textDecoration: "none", display: "block" }}>{cardContent}</div>;
  }

  return (
    <FeatureGate feature={product.featureKey}>
      <Link
        href={product.status === "available" ? product.href : "#"}
        style={{ textDecoration: "none", display: "block" }}
      >
        {cardContent}
      </Link>
    </FeatureGate>
  );
}

