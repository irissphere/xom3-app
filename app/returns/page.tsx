"use client";

import { useState } from "react";
import Link from "next/link";

const RETURN_REASONS = [
  "Item not as described",
  "Defective or damaged",
  "Wrong item received",
  "Changed my mind",
  "Item arrived too late",
  "Better price found elsewhere",
  "Other",
];

export default function ReturnsPage() {
  const [step, setStep] = useState<"lookup" | "form" | "success">("lookup");
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim() || !reason) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/commerce/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId.trim(),
          email: email.trim(),
          reason,
          details: details.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.returnRequest);
        setStep("success");
      } else {
        setError(data.error || "Failed to submit return request");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a1a 0%, #0f172a 100%)",
      color: "#e2e8f0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <Link href="/shop" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>&#x1F6CD;&#xFE0F;</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>SpaceBaddie</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/track" style={{
            padding: "8px 16px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8",
            textDecoration: "none", fontSize: 13,
          }}>Track Order</Link>
          <Link href="/shop" style={{
            padding: "8px 16px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8",
            textDecoration: "none", fontSize: 13,
          }}>Shop</Link>
        </div>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          Returns &amp; Refunds
        </h1>
        <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: 32 }}>
          We want you to love your purchase. If something isn&apos;t right, we&apos;ll make it right.
        </p>

        {/* Step: Lookup / Form */}
        {step !== "success" && (
          <form onSubmit={handleSubmit} style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 28,
          }}>
            {/* Order Info */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Order ID *</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. a1b2c3d4"
                required
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#fff", fontSize: 15, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#fff", fontSize: 15, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Reason for Return *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {RETURN_REASONS.map((r) => (
                  <label key={r} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: reason === r ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
                    border: reason === r ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}>
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      style={{ accentColor: "#8b5cf6" }}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>Additional Details (optional)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Tell us more about the issue..."
                rows={3}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#fff", fontSize: 14,
                  outline: "none", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginBottom: 16, padding: 12,
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 8, color: "#f87171", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !reason}
              style={{
                width: "100%", padding: "14px",
                background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                opacity: loading || !reason ? 0.6 : 1,
              }}
            >
              {loading ? "Submitting..." : "Submit Return Request"}
            </button>

            {/* Policy */}
            <div style={{ marginTop: 20, padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>RETURN POLICY</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
                <li>30-day return window from delivery date</li>
                <li>Items must be unused and in original packaging</li>
                <li>Refunds processed within 5-10 business days</li>
                <li>Digital products are non-refundable once downloaded</li>
                <li>Free return shipping on defective/wrong items</li>
              </ul>
            </div>
          </form>
        )}

        {/* Success */}
        {step === "success" && result && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 16,
            padding: 28,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#x2705;</div>
            <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#4ade80" }}>
              Return Request Submitted
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
              {result.message}
            </p>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Return ID</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{result.id?.slice(0, 8)}</div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href="/track" style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "#fff",
                textDecoration: "none", fontWeight: 600, fontSize: 13,
              }}>Track Order</Link>
              <Link href="/shop" style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #FF006E, #8A2BE2)",
                border: "none", borderRadius: 8, color: "#fff",
                textDecoration: "none", fontWeight: 600, fontSize: 13,
              }}>Continue Shopping</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
