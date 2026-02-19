"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CommercePageActions } from "../components/CommercePageActions";

interface Seller {
  id: string;
  email: string;
  store_name: string;
  status: string;
  commission_rate: number;
  total_sales_cents: number;
  total_orders: number;
  created_at: string;
}

export default function MarketplacePage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [storeName, setStoreName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      const res = await fetch("/api/commerce/sellers");
      const data = await res.json();
      if (data.ok) setSellers(data.sellers || []);
    } catch {}
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !storeName.trim()) return;
    setRegistering(true);
    try {
      const res = await fetch("/api/commerce/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, storeName }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.onboardingUrl) {
          setOnboardingUrl(data.onboardingUrl);
        }
        fetchSellers();
        setEmail("");
        setStoreName("");
        setShowRegister(false);
      } else {
        alert(data.error || "Registration failed");
      }
    } catch {
      alert("Registration failed. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 24 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
          <div>
            <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
              COMMERCE / MARKETPLACE
            </div>
            <h1 style={{ margin: "10px 0 6px", fontSize: 28, fontWeight: 860 }}>
              Seller Marketplace
            </h1>
            <p className="xom3-subtle" style={{ margin: 0, maxWidth: 640 }}>
              Manage sellers, onboard new vendors, and track marketplace performance. Sellers get 85% of each sale via Stripe Connect.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <CommercePageActions />
            <button
              className="xom3-btn xom3-btnPrimary"
              onClick={() => setShowRegister(true)}
            >
              + Add Seller
            </button>
          </div>
        </header>

        {/* Stats */}
        <section className="xom3-section" style={{ marginTop: 16 }}>
          <div className="xom3-grid xom3-grid3">
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-subtle" style={{ fontSize: 12 }}>TOTAL SELLERS</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{sellers.length}</div>
            </div>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-subtle" style={{ fontSize: 12 }}>ACTIVE SELLERS</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80" }}>
                {sellers.filter(s => s.status === "active").length}
              </div>
            </div>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
              <div className="xom3-subtle" style={{ fontSize: 12 }}>MARKETPLACE REVENUE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>
                ${(sellers.reduce((sum, s) => sum + (s.total_sales_cents || 0), 0) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </section>

        {/* Onboarding URL notification */}
        {onboardingUrl && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 10,
          }}>
            <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>Seller Created!</div>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#94a3b8" }}>
              Send this link to the seller to complete their Stripe payment setup:
            </p>
            <a
              href={onboardingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "linear-gradient(135deg, #FF006E, #8A2BE2)",
                borderRadius: 8,
                color: "#fff",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Open Stripe Onboarding
            </a>
            <button
              onClick={() => setOnboardingUrl(null)}
              style={{ marginLeft: 12, background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Register Form */}
        {showRegister && (
          <div style={{ marginTop: 16 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Register New Seller</h3>
              <form onSubmit={handleRegister}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Store Name *</label>
                    <input
                      className="xom3-input"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Tech Haven"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Seller Email *</label>
                    <input
                      className="xom3-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seller@email.com"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="xom3-btn xom3-btnPrimary" disabled={registering}>
                    {registering ? "Creating..." : "Create Seller + Stripe Connect"}
                  </button>
                  <button type="button" className="xom3-btn xom3-btnSecondary" onClick={() => setShowRegister(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sellers List */}
        <section className="xom3-section" style={{ marginTop: 20 }}>
          <div className="xom3-glass xom3-glassEdge" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Sellers</h3>
            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div>
            ) : sellers.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>&#x1F3EA;</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>No sellers yet</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  Add your first seller to start building your marketplace
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Store</th>
                      <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Email</th>
                      <th style={{ textAlign: "center", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Commission</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Orders</th>
                      <th style={{ textAlign: "right", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellers.map((s) => {
                      const statusColor = s.status === "active" ? "#4ade80" : s.status === "pending_onboarding" ? "#fbbf24" : "#64748b";
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.store_name}</td>
                          <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{s.email}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <span style={{
                              padding: "2px 10px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: `${statusColor}20`,
                              color: statusColor,
                            }}>
                              {s.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>{((s.commission_rate || 0.15) * 100).toFixed(0)}%</td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>{s.total_orders}</td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                            ${((s.total_sales_cents || 0) / 100).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
