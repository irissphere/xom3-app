"use client";

import Link from "next/link";
import { useState } from "react";
import { useWallet, CREDIT_PACKAGES, formatCents } from "@/lib/hooks/useWallet";
import { useTransactions, formatRelativeTime, getTransactionIcon, getAmountColor } from "@/lib/hooks/useTransactions";
import {
  AI_TIERS,
  MESSAGING_PRICING,
  SOCIAL_PRICING,
  AUTOMATION_PRICING,
} from "@/lib/obols/pricing";

export default function CreditsPage() {
  const wallet = useWallet();
  const { transactions, loading: txLoading } = useTransactions(10);
  const [selectedPackage, setSelectedPackage] = useState<string>("pack_25");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async () => {
    setError(null);
    setPurchasing(true);

    try {
      if (useCustom && customAmount) {
        const amountCents = Math.round(parseFloat(customAmount) * 100);
        if (amountCents < 500) {
          setError("Minimum purchase is $5.00");
          setPurchasing(false);
          return;
        }
        await wallet.purchaseCredits({ amountCents });
      } else {
        await wallet.purchaseCredits({ packageId: selectedPackage });
      }
    } catch (err: any) {
      setError(err?.message || "Failed to start checkout");
      setPurchasing(false);
    }
  };

  return (
    <main className="xom3-home">
      <div
        className="xom3-container"
        style={{ paddingTop: 22, paddingBottom: 48 }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="xom3-mono"
              style={{
                color: "var(--text-2)",
                fontSize: 12,
                letterSpacing: "0.08em",
              }}
            >
              CREDITS
            </div>
            <h1
              style={{
                margin: "10px 0 6px 0",
                fontSize: 28,
                fontWeight: 860,
                letterSpacing: "-0.02em",
              }}
            >
              Add Funds
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 720 }}>
              Pay as you go. No subscriptions required. Use credits for AI, SMS,
              social posts, and more.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="xom3-btn xom3-btnSecondary" href="/dashboard">
              Back to Dashboard
            </Link>
            <Link className="xom3-btn xom3-btnSecondary" href="/pricing">
              View Pricing
            </Link>
          </div>
        </header>

        {/* Current Balance Card */}
        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div
            className="xom3-glass xom3-glassEdge"
            style={{
              padding: 24,
              background: wallet.criticalBalance
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.08))"
                : wallet.lowBalance
                  ? "linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))"
                  : "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 163, 74, 0.08))",
              border: wallet.criticalBalance
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : wallet.lowBalance
                  ? "1px solid rgba(251, 191, 36, 0.3)"
                  : "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <div
                  className="xom3-mono"
                  style={{
                    color: "var(--text-2)",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  CURRENT BALANCE
                </div>
                <div
                  style={{
                    fontSize: 42,
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: wallet.criticalBalance
                      ? "#ef4444"
                      : wallet.lowBalance
                        ? "#fbbf24"
                        : "#22c55e",
                  }}
                >
                  {wallet.loading ? "..." : wallet.balanceFormatted}
                </div>
                {wallet.criticalBalance && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 12px",
                      background: "rgba(239, 68, 68, 0.2)",
                      borderRadius: 8,
                      fontSize: 13,
                      color: "#fca5a5",
                      display: "inline-block",
                    }}
                  >
                    Low balance - add funds to continue using services
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--text-2)", fontSize: 14 }}>
                  Total added:{" "}
                  <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                    {formatCents(wallet.totalDeposited)}
                  </span>
                </div>
                <div
                  style={{ color: "var(--text-2)", fontSize: 14, marginTop: 4 }}
                >
                  Total spent:{" "}
                  <span style={{ fontWeight: 600, color: "var(--text-1)" }}>
                    {formatCents(wallet.totalSpent)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Package Selection */}
        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <div className="xom3-panel-title" style={{ marginBottom: 8 }}>
              Select Amount
            </div>
            <div className="xom3-panel-subtitle">
              Choose a preset amount or enter a custom value.
            </div>

            {/* Package Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              {CREDIT_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackage(pkg.id);
                    setUseCustom(false);
                  }}
                  style={{
                    position: "relative",
                    padding: "20px 12px",
                    borderRadius: 14,
                    background:
                      selectedPackage === pkg.id && !useCustom
                        ? "linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(99, 102, 241, 0.15))"
                        : "rgba(255, 255, 255, 0.03)",
                    border:
                      selectedPackage === pkg.id && !useCustom
                        ? "2px solid rgba(10, 132, 255, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    color: "var(--text-0)",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pkg.popular && (
                    <div
                      style={{
                        position: "absolute",
                        top: -8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        background:
                          "linear-gradient(135deg, #0a84ff, #6366f1)",
                        fontSize: 9,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "0.05em",
                      }}
                    >
                      POPULAR
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {pkg.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-2)",
                      marginTop: 4,
                    }}
                  >
                    {pkg.amount_cents} credits
                  </div>
                </button>
              ))}

              {/* Custom Amount */}
              <button
                onClick={() => setUseCustom(true)}
                style={{
                  padding: "20px 12px",
                  borderRadius: 14,
                  background: useCustom
                    ? "linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(99, 102, 241, 0.15))"
                    : "rgba(255, 255, 255, 0.03)",
                  border: useCustom
                    ? "2px solid rgba(10, 132, 255, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  color: "var(--text-0)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700 }}>Custom</div>
                <div
                  style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}
                >
                  Min $5
                </div>
              </button>
            </div>

            {/* Custom Amount Input */}
            {useCustom && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 12,
                    padding: "4px 16px",
                    maxWidth: 200,
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "var(--text-2)",
                    }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="25.00"
                    min="5"
                    max="500"
                    step="0.01"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "var(--text-0)",
                      fontFamily: "var(--font-mono)",
                      padding: "12px 0",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-2)",
                    marginTop: 6,
                  }}
                >
                  Minimum $5, maximum $500 per purchase
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 10,
                  color: "#fca5a5",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={purchasing || (useCustom && !customAmount)}
              style={{
                width: "100%",
                marginTop: 24,
                padding: "18px 24px",
                borderRadius: 14,
                background: purchasing
                  ? "rgba(10, 132, 255, 0.3)"
                  : "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none",
                cursor: purchasing ? "wait" : "pointer",
                color: "#fff",
                fontSize: 17,
                fontWeight: 700,
                boxShadow: purchasing
                  ? "none"
                  : "0 8px 32px rgba(34, 197, 94, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              {purchasing
                ? "Redirecting to checkout..."
                : useCustom && customAmount
                  ? `Add ${formatCents(Math.round(parseFloat(customAmount) * 100))} Credits`
                  : `Add ${CREDIT_PACKAGES.find((p) => p.id === selectedPackage)?.label || "$25"} Credits`}
            </button>

            <div
              style={{
                marginTop: 12,
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-2)",
              }}
            >
              Secure checkout powered by Stripe
            </div>
          </div>
        </section>

        {/* What You Can Do */}
        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <div className="xom3-panel-title" style={{ marginBottom: 8 }}>
              What Your Credits Buy
            </div>
            <div className="xom3-panel-subtitle">
              Transparent per-action pricing. 1 credit = $0.01
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
                marginTop: 20,
              }}
            >
              {/* AI */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  AI GENERATION
                </div>
                <PriceRow
                  label="Fast AI"
                  price={AI_TIERS.fast.pricePerGeneration}
                />
                <PriceRow
                  label="Balanced AI"
                  price={AI_TIERS.balanced.pricePerGeneration}
                />
                <PriceRow
                  label="Premium AI"
                  price={AI_TIERS.premium.pricePerGeneration}
                />
              </div>

              {/* Messaging */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  MESSAGING
                </div>
                <PriceRow label="SMS" price={MESSAGING_PRICING.sms} unit="msg" />
                <PriceRow
                  label="Email"
                  price={MESSAGING_PRICING.email}
                  unit="email"
                />
                <PriceRow
                  label="Voice"
                  price={MESSAGING_PRICING.voice_minute}
                  unit="min"
                />
              </div>

              {/* Social */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  SOCIAL MEDIA
                </div>
                <PriceRow
                  label="Text post"
                  price={SOCIAL_PRICING.post_text}
                  unit="post"
                />
                <PriceRow
                  label="Image post"
                  price={SOCIAL_PRICING.post_image}
                  unit="post"
                />
                <PriceRow
                  label="AI video"
                  price={SOCIAL_PRICING.post_ai_video}
                  unit="post"
                />
              </div>

              {/* Automation */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    marginBottom: 12,
                    letterSpacing: "0.08em",
                  }}
                >
                  AUTOMATION
                </div>
                <PriceRow
                  label="Workflow"
                  price={AUTOMATION_PRICING.workflow_run}
                  unit="run"
                />
                <PriceRow
                  label="Lead process"
                  price={AUTOMATION_PRICING.lead_process}
                  unit="lead"
                />
                <PriceRow
                  label="Scrape"
                  price={AUTOMATION_PRICING.scrape_request}
                  unit="req"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-grid xom3-grid2">
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Do credits expire?
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 14 }}>
                No! Purchased credits never expire. Use them whenever you need.
              </div>
            </div>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Can I get a refund?
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 14 }}>
                Unused credits can be refunded within 30 days. Contact support.
              </div>
            </div>
          </div>
        </section>

        {/* Transaction History */}
        <section className="xom3-section" style={{ marginTop: 24 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 24 }}>
            <div className="xom3-panel-title" style={{ marginBottom: 8 }}>
              Recent Activity
            </div>
            <div className="xom3-panel-subtitle">
              Your credit usage history
            </div>

            <div style={{ marginTop: 20 }}>
              {txLoading ? (
                <div style={{ color: "var(--text-2)", textAlign: "center", padding: "24px 0" }}>
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ color: "var(--text-2)", textAlign: "center", padding: "24px 0" }}>
                  No transactions yet. Add funds to get started!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {transactions.map((tx, idx) => (
                    <div
                      key={tx.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "14px 0",
                        borderBottom: idx < transactions.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: tx.amount > 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        {getTransactionIcon(tx.type, tx.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-0)" }}>
                          {tx.description}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                          {formatRelativeTime(tx.createdAt)}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                            fontSize: 14,
                            color: getAmountColor(tx.amount),
                          }}
                        >
                          {tx.amountFormatted}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
                          Bal: {tx.balanceAfterFormatted}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {transactions.length > 0 && (
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Link
                  href="/settings/usage"
                  style={{
                    color: "#0a84ff",
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  View full history →
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PriceRow({
  label,
  price,
  unit,
}: {
  label: string;
  price: number;
  unit?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      <span style={{ color: "var(--text-1)", fontSize: 14 }}>{label}</span>
      <span
        style={{
          color: "#22d3ee",
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        {formatCents(price)}
        {unit && (
          <span style={{ color: "var(--text-2)", fontWeight: 400 }}>
            /{unit}
          </span>
        )}
      </span>
    </div>
  );
}
