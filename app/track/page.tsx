"use client";

import { useState } from "react";
import Link from "next/link";

interface TrackedOrder {
  id: string;
  status: string;
  total: number;
  shipping: number;
  created_at: string;
  updated_at: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipping_address: any;
  items: { name: string; quantity: number; price: number }[];
}

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  paid: "Payment Confirmed",
  processing: "Being Prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !email.trim()) return;
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch("/api/commerce/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setOrder(data.order);
      } else {
        setError(data.error || "Order not found");
      }
    } catch {
      setError("Failed to look up order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = order ? STATUS_STEPS.indexOf(order.status.toLowerCase()) : -1;
  const isCancelled = order?.status.toLowerCase() === "cancelled";
  const isRefunded = order?.status.toLowerCase() === "refunded";

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
        <Link href="/shop" style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8",
          textDecoration: "none",
          fontSize: 13,
        }}>
          Continue Shopping
        </Link>
      </header>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, textAlign: "center" }}>
          Track Your Order
        </h1>
        <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: 32 }}>
          Enter your order ID and email to see your order status
        </p>

        {/* Lookup Form */}
        <form onSubmit={handleTrack} style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Order ID
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. a1b2c3d4"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Looking up..." : "Track Order"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 12,
            padding: 16,
            color: "#f87171",
            textAlign: "center",
            marginBottom: 24,
          }}>
            {error}
          </div>
        )}

        {/* Order Result */}
        {order && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 28,
          }}>
            {/* Order Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Order</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>#{order.id.slice(0, 8)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80" }}>
                  ${order.total.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Status Progress */}
            {!isCancelled && !isRefunded ? (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  {STATUS_STEPS.map((step, idx) => (
                    <div key={step} style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 10,
                      color: idx <= currentStep ? "#4ade80" : "#475569",
                      fontWeight: idx <= currentStep ? 700 : 400,
                    }}>
                      {STATUS_LABELS[step]}
                    </div>
                  ))}
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                }}>
                  {STATUS_STEPS.map((step, idx) => (
                    <div key={step} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: idx <= currentStep ? "#4ade80" : "rgba(255,255,255,0.1)",
                        border: idx === currentStep ? "3px solid rgba(74,222,128,0.4)" : "none",
                        flexShrink: 0,
                      }} />
                      {idx < STATUS_STEPS.length - 1 && (
                        <div style={{
                          flex: 1,
                          height: 2,
                          background: idx < currentStep ? "#4ade80" : "rgba(255,255,255,0.1)",
                        }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: 16,
                background: isCancelled ? "rgba(248,113,113,0.1)" : "rgba(251,146,60,0.1)",
                borderRadius: 8,
                marginBottom: 20,
                color: isCancelled ? "#f87171" : "#fb923c",
                fontWeight: 700,
                fontSize: 15,
              }}>
                {isCancelled ? "Order Cancelled" : "Order Refunded"}
              </div>
            )}

            {/* Tracking Info */}
            {order.tracking_number && (
              <div style={{
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: 10,
                padding: 16,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 12, color: "#a78bfa", marginBottom: 6 }}>TRACKING NUMBER</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{order.tracking_number}</div>
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      padding: "6px 14px",
                      background: "#8b5cf6",
                      borderRadius: 6,
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Track Package
                  </a>
                )}
              </div>
            )}

            {/* Order Items */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>ITEMS</div>
              {order.items.map((item, idx) => (
                <div key={idx} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: idx < order.items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    {item.quantity > 1 && (
                      <span style={{ color: "#94a3b8", marginLeft: 8 }}>x{item.quantity}</span>
                    )}
                  </div>
                  <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Order Date */}
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center" }}>
              Ordered on {new Date(order.created_at).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric"
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
