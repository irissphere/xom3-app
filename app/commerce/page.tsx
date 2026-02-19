"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import { useAnalytics } from "@/lib/system/use-analytics";

/* ─── types ───────────────────────────────────────────────── */

interface Stats {
  connected: boolean;
  provider?: string;
  apiUrl?: string;
  stats?: {
    totalSales: string;
    orderCount: number;
    averageOrderValue: string;
    currency: string;
    productCount: number;
  };
}

interface SetupState {
  completedSteps: number[];
  currentStep: number;
}

interface AiProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

type StepStatus = "complete" | "current" | "upcoming";

const STORAGE_KEY = "xom3_commerce_setup";
const SHOP_URL = "xom3.io/shop";

/* ─── helpers ─────────────────────────────────────────────── */

function loadSetup(): SetupState {
  if (typeof window === "undefined") return { completedSteps: [], currentStep: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedSteps: [], currentStep: 1 };
}

function saveSetup(state: SetupState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function stepStatus(step: number, setup: SetupState): StepStatus {
  if (setup.completedSteps.includes(step)) return "complete";
  if (step === setup.currentStep) return "current";
  return "upcoming";
}

function nextIncompleteStep(setup: SetupState): number {
  for (let i = 1; i <= 5; i++) {
    if (!setup.completedSteps.includes(i)) return i;
  }
  return 5;
}

/* ─── page ────────────────────────────────────────────────── */

export default function CommercePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<SetupState>({ completedSteps: [], currentStep: 1 });
  useAnalytics("/commerce");

  // AI Quick Create (step 1)
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProduct, setAiProduct] = useState<AiProduct | null>(null);
  const [aiAddingProduct, setAiAddingProduct] = useState(false);

  // Trend Research
  const [trendNiche, setTrendNiche] = useState("");
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendResults, setTrendResults] = useState<any>(null);
  const [addingTrendIdx, setAddingTrendIdx] = useState<number | null>(null);

  // CJ Dropshipping picker
  const [cjPickerOpen, setCjPickerOpen] = useState(false);
  const [cjPickerLoading, setCjPickerLoading] = useState(false);
  const [cjResults, setCjResults] = useState<any[]>([]);
  const [cjPickerProduct, setCjPickerProduct] = useState<any>(null);
  const [cjImporting, setCjImporting] = useState<string | null>(null);

  // Floating AI Assistant
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Link copied (step 4)
  const [linkCopied, setLinkCopied] = useState(false);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch("/api/commerce/stats", { cache: "no-store" });
      const json = await r.json();
      if (json.ok) setStats(json);
    } catch {}
    setLoading(false);
  }, []);

  /* ── init ── */
  useEffect(() => {
    const saved = loadSetup();
    setSetup(saved);
    fetchStats();
  }, [fetchStats]);

  /* ── auto-complete logic ── */
  useEffect(() => {
    if (!stats) return;
    const s = { ...setup };
    let changed = false;

    // Step 1: auto-complete when products exist
    if ((stats.stats?.productCount ?? 0) > 0 && !s.completedSteps.includes(1)) {
      s.completedSteps.push(1);
      changed = true;
    }
    // Step 2: always complete (Stripe configured)
    if (!s.completedSteps.includes(2)) {
      s.completedSteps.push(2);
      changed = true;
    }

    if (changed) {
      s.currentStep = nextIncompleteStep(s);
      setSetup(s);
      saveSetup(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats]);

  /* ── complete step helper ── */
  const completeStep = useCallback(
    (step: number) => {
      setSetup((prev) => {
        if (prev.completedSteps.includes(step)) return prev;
        const next: SetupState = {
          completedSteps: [...prev.completedSteps, step],
          currentStep: nextIncompleteStep({
            completedSteps: [...prev.completedSteps, step],
            currentStep: prev.currentStep,
          }),
        };
        saveSetup(next);
        return next;
      });
    },
    [],
  );

  /* ── Trend Research ── */
  const [trendError, setTrendError] = useState<string | null>(null);
  const handleTrendSearch = async () => {
    if (!trendNiche.trim()) return;
    setTrendLoading(true);
    setTrendResults(null);
    setTrendError(null);
    try {
      const r = await fetch("/api/commerce/trend-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: trendNiche }),
      });
      const text = await r.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        setTrendError("AI took too long. Try a simpler niche like 'phone cases' or click a quick button below.");
        return;
      }
      if (json.ok) {
        setTrendResults(json.trends);
      } else {
        setTrendError(json.error || "Trend scan failed. Please try again.");
      }
    } catch (err) {
      console.error("Trend research failed:", err);
      setTrendError("Network error. Please check your connection and try again.");
    } finally {
      setTrendLoading(false);
    }
  };

  /* ── Add Trend Product to Store (CJ-aware) ── */
  const addTrendToStore = async (product: any, idx: number) => {
    // Digital products skip CJ verification
    if (product.selling_route === "digital") {
      setAddingTrendIdx(idx);
      try {
        const res = await fetch("/api/commerce/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            description: product.description || "",
            price: product.price || 29.99,
            category: product.category || "Digital",
            image_url: product.image_url || "",
            status: "active",
            inventory_count: -1,
            product_type: "digital",
          }),
        });
        const data = await res.json();
        if (data.ok) {
          alert(`"${product.name}" added to your store and is live!`);
          fetchStats();
        } else {
          alert(`Failed to add: ${data.error || "Unknown error"}`);
        }
      } catch {
        alert("Failed to add product. Please try again.");
      } finally {
        setAddingTrendIdx(null);
      }
      return;
    }

    // Physical products: search CJ Dropshipping first
    setAddingTrendIdx(idx);
    setCjPickerProduct(product);
    setCjPickerLoading(true);
    setCjPickerOpen(true);
    setCjResults([]);
    try {
      const searchQuery = product.supplier_search || product.name;
      const res = await fetch("/api/commerce/cj-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery, limit: 8 }),
      });
      const data = await res.json();
      if (data.ok && data.products?.length > 0) {
        setCjResults(data.products);
      } else {
        setCjResults([]);
      }
    } catch {
      setCjResults([]);
    } finally {
      setCjPickerLoading(false);
      setAddingTrendIdx(null);
    }
  };

  /* ── Import selected CJ product ── */
  const importCjProduct = async (cjProduct: any) => {
    setCjImporting(cjProduct.pid);
    try {
      const res = await fetch("/api/commerce/cj-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          pid: cjProduct.pid,
          markup: 2.5,
          customCategory: cjProduct.mappedCategory,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`"${data.product.name}" imported from CJ and is live at $${data.product.price}!`);
        setCjPickerOpen(false);
        setCjResults([]);
        setCjPickerProduct(null);
        fetchStats();
      } else {
        alert(`Import failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Failed to import from CJ. Please try again.");
    } finally {
      setCjImporting(null);
    }
  };

  /* ── Fallback: add trend product without CJ ── */
  const addTrendWithoutCj = async () => {
    const product = cjPickerProduct;
    if (!product) return;
    setCjImporting("fallback");
    try {
      const res = await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description || "",
          price: product.price || 29.99,
          category: product.category || "Other",
          image_url: product.image_url || "",
          status: "active",
          inventory_count: -1,
          product_type: "physical",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`"${product.name}" added (manual fulfillment — not linked to CJ supplier).`);
        setCjPickerOpen(false);
        setCjResults([]);
        setCjPickerProduct(null);
        fetchStats();
      } else {
        alert(`Failed to add: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Failed to add product. Please try again.");
    } finally {
      setCjImporting(null);
    }
  };

  /* ── AI Quick Create ── */
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiProduct(null);
    try {
      const r = await fetch("/api/commerce/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product", prompt: aiPrompt }),
      });
      const json = await r.json();
      if (json.product) {
        setAiProduct(json.product);
      } else {
        setAiProduct({
          name: aiPrompt.slice(0, 40),
          description: `AI-generated product based on: ${aiPrompt}`,
          price: 29.99,
          category: "general",
        });
      }
    } catch {
      setAiProduct({
        name: aiPrompt.slice(0, 40),
        description: `Product based on: ${aiPrompt}`,
        price: 29.99,
        category: "general",
      });
    }
    setAiGenerating(false);
  };

  const handleAddProduct = async () => {
    if (!aiProduct) return;
    setAiAddingProduct(true);
    try {
      await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...aiProduct, status: "active" }),
      });
      completeStep(1);
      setShowAiCreate(false);
      setAiProduct(null);
      setAiPrompt("");
      fetchStats();
    } catch {}
    setAiAddingProduct(false);
  };

  /* ── copy link (step 4) ── */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${SHOP_URL}`).catch(() => {});
    setLinkCopied(true);
    completeStep(4);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  /* ── AI chat ── */
  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    setChatMessages((m) => [...m, { role: "user", text: question }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const r = await fetch("/api/commerce/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "advice", question }),
      });
      const json = await r.json();
      setChatMessages((m) => [...m, { role: "assistant", text: json.answer || json.message || "I can help you with that! Try exploring the setup steps above." }]);
    } catch {
      setChatMessages((m) => [...m, { role: "assistant", text: "Hmm, I couldn't reach the server. Try again in a moment." }]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ── derived ── */
  const productCount = stats?.stats?.productCount ?? 0;
  const orderCount = stats?.stats?.orderCount ?? 0;
  const revenue = stats?.stats?.totalSales ?? "0.00";
  const allDone = setup.completedSteps.length >= 5;
  const completionPct = Math.round((setup.completedSteps.length / 5) * 100);

  /* ─── render ────────────────────────────────────────────── */

  return (
    <FeatureGate feature="ecommerce">
      <main className="xom3-home">
        <div className="xom3-container" style={{ paddingTop: 22, paddingBottom: 80 }}>

          {/* ═══ HEADER ═══ */}
          <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
                COMMERCE
              </div>
              <h1 style={{ margin: "10px 0 6px 0", fontSize: 28, fontWeight: 860, letterSpacing: "-0.02em" }}>
                Commerce Hub
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 640 }}>
                Your guided command center for selling online. Follow the steps below to go from zero to live store.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/products">
                Products
              </Link>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/orders">
                Orders
              </Link>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/research">
                Research
              </Link>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/dropshipping">
                Dropshipping
              </Link>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/marketplace">
                Marketplace
              </Link>
              <Link className="xom3-btn xom3-btnSecondary" href="/commerce/channels">
                Channels
              </Link>
              <Link className="xom3-btn xom3-btnPrimary" href="/shop" target="_blank" rel="noopener noreferrer">
                Shop
              </Link>
            </div>
          </header>

          {/* ═══ STATS ROW ═══ */}
          <section className="xom3-section" style={{ marginTop: 16 }}>
            <div className="xom3-grid xom3-grid3">
              <StatCard label="Products" value={loading ? "..." : String(productCount)} icon="📦" accent="#0a84ff" />
              <StatCard label="Orders" value={loading ? "..." : String(orderCount)} icon="🛒" accent="#22c55e" />
              <StatCard label="Revenue" value={loading ? "..." : `$${revenue}`} icon="💰" accent="#f59e0b" />
            </div>
          </section>

          {/* ═══ TREND RESEARCH (Top of Page) ═══ */}
          <section className="xom3-section" style={{ marginTop: 16 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: "24px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>&#x1F525;</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Trend Research</h2>
                  <p className="xom3-subtle" style={{ margin: 0, fontSize: 13 }}>
                    AI scans TikTok, Amazon, and social media to find trending products. One click to add to your store.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                  className="xom3-input"
                  value={trendNiche}
                  onChange={(e) => setTrendNiche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTrendSearch()}
                  placeholder='Try: "health gadgets", "pet accessories", "digital templates", "fitness"...'
                  style={{ flex: 1 }}
                />
                <button
                  className="xom3-btn xom3-btnPrimary"
                  onClick={handleTrendSearch}
                  disabled={trendLoading || !trendNiche.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {trendLoading ? "Scanning..." : "Find Trends"}
                </button>
              </div>

              {/* Quick niche buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: trendResults ? 20 : 0 }}>
                {["Health & Wellness", "Tech Gadgets", "Home Decor", "Pet Products", "Digital Templates", "Beauty", "Fitness"].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setTrendNiche(n); }}
                    style={{
                      padding: "4px 12px",
                      background: trendNiche === n ? "rgba(255,0,110,0.15)" : "rgba(255,255,255,0.05)",
                      border: trendNiche === n ? "1px solid rgba(255,0,110,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 20,
                      color: trendNiche === n ? "#FF006E" : "#94a3b8",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: trendNiche === n ? 700 : 400,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Trend Error */}
              {trendError && (
                <div style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 16,
                  color: "#f87171",
                  fontSize: 13,
                }}>
                  {trendError}
                </div>
              )}

              {/* Trend Results */}
              {trendResults && (
                <div>
                  {/* Summary */}
                  <div style={{
                    background: "rgba(255,0,110,0.06)",
                    border: "1px solid rgba(255,0,110,0.15)",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FF006E", marginBottom: 6 }}>
                      Market Pulse: {trendResults.niche}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      {trendResults.trend_summary}
                    </p>
                  </div>

                  {/* Hot Products Grid */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>
                    HOT PRODUCTS ({trendResults.hot_products?.length || 0}) &mdash; Click &quot;Add to Store&quot; to instantly list any product
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                    {(trendResults.hot_products || []).map((p: any, idx: number) => {
                      const diffColor = p.difficulty === "beginner" ? "#4ade80" : p.difficulty === "intermediate" ? "#fbbf24" : "#f87171";
                      const isAdding = addingTrendIdx === idx;
                      return (
                        <div key={idx} style={{
                          background: "rgba(255,255,255,0.03)",
                          border: idx === 0 ? "2px solid rgba(255,0,110,0.25)" : "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          padding: 16,
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                        }}>
                          {idx === 0 && (
                            <div style={{
                              position: "absolute", top: -1, left: 16,
                              padding: "2px 10px", background: "#FF006E",
                              borderRadius: "0 0 6px 6px", fontSize: 10,
                              fontWeight: 800, color: "#fff",
                            }}>
                              #1 PICK
                            </div>
                          )}

                          {p.image_url && (
                            <img src={p.image_url} alt="" style={{
                              width: "100%", height: 130, objectFit: "cover",
                              borderRadius: 8, marginBottom: 10,
                            }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}

                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, lineHeight: 1.4 }}>
                            {p.description}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>SELL AT</div>
                              <div style={{ fontWeight: 800, color: "#4ade80" }}>${p.price}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>MARGIN</div>
                              <div style={{ fontWeight: 700, color: p.margin_pct >= 60 ? "#4ade80" : "#fbbf24" }}>{p.margin_pct}%</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>STARTUP</div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.startup_cost}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>DIFFICULTY</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: diffColor, textTransform: "capitalize" }}>{p.difficulty}</div>
                            </div>
                          </div>

                          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>
                            {p.trend_source}
                          </div>

                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                            <span style={{ padding: "2px 8px", background: "rgba(59,130,246,0.12)", borderRadius: 4, fontSize: 10, color: "#60a5fa", fontWeight: 600 }}>
                              {p.selling_route}
                            </span>
                            <span style={{ padding: "2px 8px", background: `${diffColor}15`, borderRadius: 4, fontSize: 10, color: diffColor, fontWeight: 600 }}>
                              {p.time_to_first_sale}
                            </span>
                          </div>

                          {p.quick_tip && (
                            <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 12 }}>
                              Tip: {p.quick_tip}
                            </div>
                          )}

                          {/* ADD TO STORE BUTTON */}
                          <div style={{ marginTop: "auto" }}>
                            <button
                              onClick={() => addTrendToStore(p, idx)}
                              disabled={isAdding}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: idx === 0
                                  ? "linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)"
                                  : "linear-gradient(135deg, #0a84ff 0%, #6366f1 100%)",
                                border: "none",
                                borderRadius: 8,
                                color: "#fff",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: isAdding ? "wait" : "pointer",
                                opacity: isAdding ? 0.6 : 1,
                              }}
                            >
                              {isAdding ? "Adding..." : idx === 0 ? "Add Best Pick to Store" : "Add to Store"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Emerging Niches */}
                  {trendResults.emerging_niches && trendResults.emerging_niches.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>
                        EMERGING NICHES
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {trendResults.emerging_niches.map((en: any, idx: number) => (
                          <div key={idx} style={{
                            padding: "10px 14px",
                            background: "rgba(139,92,246,0.08)",
                            border: "1px solid rgba(139,92,246,0.2)",
                            borderRadius: 8,
                            flex: "1 1 200px",
                          }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#c4b5fd" }}>{en.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{en.why}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* What to avoid */}
                  {trendResults.avoid && trendResults.avoid.length > 0 && (
                    <div style={{ marginTop: 16, padding: 12, background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>AVOID</div>
                      {trendResults.avoid.map((a: string, idx: number) => (
                        <div key={idx} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>&#x26A0; {a}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ═══ COMMERCE ENGINES ═══ */}
          <section className="xom3-section" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10, letterSpacing: "0.06em" }}>
              COMMERCE ENGINES
            </div>
            <div className="xom3-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {([
                {
                  icon: "🔀",
                  title: "Funnel Builder",
                  description: "AI-powered landing pages, upsells, and checkout optimization. Select a product to generate funnels.",
                  status: "Available",
                  href: "/commerce/products",
                  cta: "Open Products → ⚡",
                },
                {
                  icon: "🏪",
                  title: "Store Builder",
                  description: "Generate AI product pages, hero sections, benefits, and FAQ modules for any product.",
                  status: "Available",
                  href: "/commerce/products",
                  cta: "Open Products → ⚡",
                },
                {
                  icon: "📢",
                  title: "Ad Engine",
                  description: "Generate ad creatives, audience targeting, and multi-platform campaigns from your product data.",
                  status: "Available",
                  href: "/commerce/products",
                  cta: "Open Products → ⚡",
                },
                {
                  icon: "📦",
                  title: "Fulfillment",
                  description: "AI order routing, supplier matching, shipping, and customer notifications. Fulfill from Orders page.",
                  status: "Available",
                  href: "/commerce/orders",
                  cta: "Open Orders → 📦",
                },
              ]).map((engine) => (
                <div
                  key={engine.title}
                  className="xom3-glass xom3-glassEdge"
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{engine.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{engine.title}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                        {engine.description}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        background:
                          engine.status === "Available"
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(251,191,36,0.12)",
                        color:
                          engine.status === "Available" ? "#4ade80" : "#fbbf24",
                        border:
                          engine.status === "Available"
                            ? "1px solid rgba(34,197,94,0.25)"
                            : "1px solid rgba(251,191,36,0.25)",
                      }}
                    >
                      {engine.status}
                    </span>
                  </div>

                  {engine.href && engine.cta ? (
                    <Link
                      href={engine.href}
                      style={{
                        display: "block",
                        padding: "8px 14px",
                        background: "rgba(10,132,255,0.1)",
                        border: "1px solid rgba(10,132,255,0.2)",
                        borderRadius: 8,
                        color: "#60a5fa",
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        textAlign: "center",
                        transition: "all 0.15s",
                      }}
                    >
                      {engine.cta}
                    </Link>
                  ) : (
                    <div
                      style={{
                        padding: "8px 14px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8,
                        color: "#475569",
                        fontSize: 12,
                        fontWeight: 500,
                        textAlign: "center",
                      }}
                    >
                      Coming Soon
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ═══ PROGRESS BAR ═══ */}
          <section className="xom3-section" style={{ marginTop: 20 }}>
            <div className="xom3-glass xom3-glassEdge" style={{ padding: "18px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {allDone ? "All set! Your store is live." : `Setup Progress — ${completionPct}%`}
                </div>
                <div className="xom3-mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {setup.completedSteps.length}/5 STEPS
                </div>
              </div>

              {/* track */}
              <div style={{ position: "relative", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${completionPct}%`,
                    borderRadius: 3,
                    background: allDone
                      ? "linear-gradient(90deg, #22c55e, #16a34a)"
                      : "linear-gradient(90deg, #0a84ff, #6366f1)",
                    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                  }}
                />
              </div>

              {/* step dots */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const st = stepStatus(s, setup);
                  return (
                    <button
                      key={s}
                      onClick={() => setSetup((prev) => ({ ...prev, currentStep: s }))}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          transition: "all 0.3s ease",
                          ...(st === "complete"
                            ? { background: "#22c55e", color: "#fff" }
                            : st === "current"
                              ? {
                                  background: "rgba(10,132,255,0.2)",
                                  color: "#0a84ff",
                                  border: "2px solid #0a84ff",
                                  boxShadow: "0 0 12px rgba(10,132,255,0.35)",
                                }
                              : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "2px solid rgba(255,255,255,0.1)" }),
                        }}
                      >
                        {st === "complete" ? "✓" : s}
                      </div>
                      <span style={{ fontSize: 10, color: st === "current" ? "#0a84ff" : "var(--text-2)", fontWeight: st === "current" ? 600 : 400 }}>
                        {["Product", "Payments", "Preview", "Share", "Grow"][s - 1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═══ SETUP STEPS ═══ */}
          <section className="xom3-section" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>

            {/* ── Step 1: Add Your First Product ── */}
            <StepCard
              step={1}
              title="Add Your First Product"
              description="Every store starts with a product. Add one now or let AI help you create it."
              status={stepStatus(1, setup)}
              isExpanded={setup.currentStep === 1}
              onToggle={() => setSetup((p) => ({ ...p, currentStep: p.currentStep === 1 ? 0 : 1 }))}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: showAiCreate ? 16 : 0 }}>
                <Link
                  href="/commerce/products"
                  className="xom3-btn xom3-btnPrimary"
                  style={{ fontSize: 13 }}
                >
                  Go to Products
                </Link>
                <button
                  className="xom3-btn xom3-btnSecondary"
                  style={{ fontSize: 13 }}
                  onClick={() => setShowAiCreate((v) => !v)}
                >
                  {showAiCreate ? "Close AI Creator" : "✨ AI Quick Create"}
                </button>
              </div>

              {showAiCreate && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: "rgba(10,132,255,0.06)",
                    border: "1px solid rgba(10,132,255,0.15)",
                  }}
                >
                  <label className="xom3-label" style={{ fontSize: 12, marginBottom: 8, display: "block" }}>
                    Describe your product idea
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      className="xom3-input"
                      placeholder="e.g., handmade candles, digital art prints, fitness ebook..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                      style={{ flex: 1, fontSize: 13, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f7f8ff", outline: "none" }}
                    />
                    <button
                      className="xom3-btn xom3-btnPrimary"
                      onClick={handleAiGenerate}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      style={{ fontSize: 13, whiteSpace: "nowrap", opacity: aiGenerating || !aiPrompt.trim() ? 0.5 : 1 }}
                    >
                      {aiGenerating ? "Generating..." : "Generate with AI"}
                    </button>
                  </div>

                  {aiGenerating && (
                    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, color: "#0a84ff", fontSize: 13 }}>
                      <Spinner size={16} /> Crafting your product...
                    </div>
                  )}

                  {aiProduct && !aiGenerating && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 14,
                        borderRadius: 10,
                        background: "rgba(34,197,94,0.06)",
                        border: "1px solid rgba(34,197,94,0.18)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        {aiProduct.image_url && (
                          <img
                            src={aiProduct.image_url}
                            alt={aiProduct.name}
                            style={{
                              width: 80,
                              height: 80,
                              borderRadius: 10,
                              objectFit: "cover",
                              flexShrink: 0,
                              background: "rgba(255,255,255,0.05)",
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{aiProduct.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>{aiProduct.description}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                        <span style={{ fontSize: 18, fontWeight: 800 }}>${aiProduct.price.toFixed(2)}</span>
                        <button
                          className="xom3-btn xom3-btnPrimary"
                          onClick={handleAddProduct}
                          disabled={aiAddingProduct}
                          style={{ fontSize: 13, opacity: aiAddingProduct ? 0.5 : 1 }}
                        >
                          {aiAddingProduct ? "Adding..." : "Add This Product"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {productCount > 0 && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 16 }}>✓</span> You have {productCount} product{productCount !== 1 ? "s" : ""}. Nice!
                </div>
              )}
            </StepCard>

            {/* ── Step 2: Set Up Payments ── */}
            <StepCard
              step={2}
              title="Set Up Payments"
              description="Connect Stripe to accept payments. Already configured for you."
              status={stepStatus(2, setup)}
              isExpanded={setup.currentStep === 2}
              onToggle={() => setSetup((p) => ({ ...p, currentStep: p.currentStep === 2 ? 0 : 2 }))}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.18)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(34,197,94,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#22c55e" }}>Stripe Connected</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                    Your payment keys are configured. Customers can check out securely.
                  </div>
                </div>
              </div>
            </StepCard>

            {/* ── Step 3: Preview Your Shop ── */}
            <StepCard
              step={3}
              title="Preview Your Shop"
              description="See how your store looks to customers."
              status={stepStatus(3, setup)}
              isExpanded={setup.currentStep === 3}
              onToggle={() => setSetup((p) => ({ ...p, currentStep: p.currentStep === 3 ? 0 : 3 }))}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  href="/shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="xom3-btn xom3-btnPrimary"
                  style={{ fontSize: 13 }}
                >
                  Preview Shop ↗
                </Link>
                {!setup.completedSteps.includes(3) && (
                  <button
                    className="xom3-btn xom3-btnSecondary"
                    style={{ fontSize: 13 }}
                    onClick={() => completeStep(3)}
                  >
                    Mark as Reviewed
                  </button>
                )}
              </div>
              {setup.completedSteps.includes(3) && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 16 }}>✓</span> Shop reviewed. Looking good!
                </div>
              )}
            </StepCard>

            {/* ── Step 4: Share Your Store ── */}
            <StepCard
              step={4}
              title="Share Your Store"
              description="Your store is live! Share it with the world."
              status={stepStatus(4, setup)}
              isExpanded={setup.currentStep === 4}
              onToggle={() => setSetup((p) => ({ ...p, currentStep: p.currentStep === 4 ? 0 : 4 }))}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  marginBottom: 12,
                }}
              >
                <span className="xom3-mono" style={{ flex: 1, fontSize: 13, color: "#f7f8ff", wordBreak: "break-all" }}>
                  https://{SHOP_URL}
                </span>
                <button
                  className="xom3-btn xom3-btnSecondary"
                  onClick={handleCopyLink}
                  style={{ fontSize: 12, whiteSpace: "nowrap", padding: "6px 14px" }}
                >
                  {linkCopied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {setup.completedSteps.includes(4) && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
                  <span style={{ fontSize: 16 }}>✓</span> Link copied and ready to share!
                </div>
              )}
            </StepCard>

            {/* ── Step 5: Manage & Grow ── */}
            <StepCard
              step={5}
              title="Manage & Grow"
              description="You're all set! Use these tools to manage your business."
              status={stepStatus(5, setup)}
              isExpanded={setup.currentStep === 5 || allDone}
              onToggle={() => setSetup((p) => ({ ...p, currentStep: p.currentStep === 5 ? 0 : 5 }))}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                <QuickActionCard icon="🛒" label="View Orders" href="/commerce/orders" />
                <QuickActionCard icon="📊" label="Product Analytics" href="/commerce/products" />
                <QuickActionCard icon="🔍" label="Product Research" href="/commerce/research" />
                <QuickActionCard icon="📦" label="Dropshipping Guide" href="/commerce/dropshipping" />
                <QuickActionCard icon="🎬" label="Marketing Videos" href="/spacebaddie/studio" />
                <QuickActionCard
                  icon="🤖"
                  label="AI Advisor"
                  onClick={() => {
                    setChatOpen(true);
                    completeStep(5);
                  }}
                />
              </div>
              {!allDone && !setup.completedSteps.includes(5) && (
                <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-2)" }}>
                  Complete the earlier steps first to unlock your full toolkit.
                </div>
              )}
            </StepCard>
          </section>
        </div>

        {/* ═══ FLOATING AI ASSISTANT ═══ */}
        {chatOpen && (
          <div
            style={{
              position: "fixed",
              bottom: 80,
              right: 20,
              width: 340,
              maxWidth: "calc(100vw - 40px)",
              maxHeight: 420,
              borderRadius: 16,
              background: "#111114",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 1000,
              animation: "fadeSlideUp 0.25s ease",
            }}
          >
            {/* chat header */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>Commerce AI</div>
              <button
                onClick={() => setChatOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {chatMessages.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-2)", fontSize: 13 }}>
                  Ask me anything about your store, products, or selling online.
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    ...(m.role === "user"
                      ? { background: "rgba(10,132,255,0.18)", color: "#f7f8ff", borderBottomRightRadius: 4 }
                      : { background: "rgba(255,255,255,0.06)", color: "#c5c8d4", borderBottomLeftRadius: 4 }),
                  }}
                >
                  {m.text}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)", fontSize: 13 }}>
                  <Spinner size={14} /> Thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* input */}
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
              <input
                className="xom3-input"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleChatSend()}
                style={{ flex: 1, fontSize: 13, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#f7f8ff", outline: "none" }}
              />
              <button
                className="xom3-btn xom3-btnPrimary"
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                style={{ fontSize: 13, padding: "8px 14px", opacity: chatLoading || !chatInput.trim() ? 0.5 : 1 }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setChatOpen((v) => !v)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: chatOpen ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #0a84ff, #6366f1)",
            border: chatOpen ? "1px solid rgba(255,255,255,0.15)" : "none",
            color: "#fff",
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: chatOpen ? "none" : "0 4px 20px rgba(10,132,255,0.4)",
            transition: "all 0.25s ease",
            zIndex: 1001,
          }}
          title="AI Commerce Assistant"
        >
          {chatOpen ? "×" : "✦"}
        </button>

        {/* keyframe animations */}
        <style>{`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </main>

      {/* ═══ CJ DROPSHIPPING PICKER MODAL ═══ */}
      {cjPickerOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => { setCjPickerOpen(false); setCjResults([]); setCjPickerProduct(null); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#141419", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16, maxWidth: 720, width: "100%", maxHeight: "80vh",
              overflow: "auto", padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Source from CJ Dropshipping</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {cjPickerProduct?.name ? `Searching for: "${cjPickerProduct.name}"` : "Searching CJ catalog..."}
                </div>
              </div>
              <button
                onClick={() => { setCjPickerOpen(false); setCjResults([]); setCjPickerProduct(null); }}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 22, cursor: "pointer" }}
              >
                &times;
              </button>
            </div>

            {cjPickerLoading && (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
                <Spinner size={28} />
                <div style={{ marginTop: 12, fontSize: 13 }}>Searching CJ Dropshipping catalog...</div>
              </div>
            )}

            {!cjPickerLoading && cjResults.length === 0 && (
              <div style={{ textAlign: "center", padding: 30 }}>
                <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>
                  No matching products found on CJ Dropshipping.
                </div>
                <button
                  onClick={addTrendWithoutCj}
                  disabled={cjImporting === "fallback"}
                  style={{
                    padding: "10px 20px", background: "rgba(251,191,36,0.15)",
                    border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8,
                    color: "#fbbf24", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {cjImporting === "fallback" ? "Adding..." : "Add Anyway (Manual Fulfillment)"}
                </button>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                  You will need to source and ship this product yourself.
                </div>
              </div>
            )}

            {!cjPickerLoading && cjResults.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {cjResults.map((cj: any) => {
                  const isImporting = cjImporting === cj.pid;
                  return (
                    <div
                      key={cj.pid}
                      style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10, padding: 12, display: "flex", flexDirection: "column",
                      }}
                    >
                      {cj.image && (
                        <img
                          src={cj.image} alt=""
                          style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 6, marginBottom: 8 }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                        {cj.name?.slice(0, 60)}{cj.name?.length > 60 ? "..." : ""}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>COST</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>
                            ${cj.sourcePrice?.toFixed(2) || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#64748b" }}>SELL AT</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                            ${(cj.sourcePrice * 2.5).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: "#8b92a7", marginBottom: 8 }}>
                        {cj.mappedCategory} &middot; {cj.variantCount} variant{cj.variantCount !== 1 ? "s" : ""}
                      </div>
                      <button
                        onClick={() => importCjProduct(cj)}
                        disabled={!!cjImporting}
                        style={{
                          marginTop: "auto", width: "100%", padding: "8px",
                          background: isImporting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #0a84ff 0%, #6366f1 100%)",
                          border: "none", borderRadius: 6, color: "#fff", fontSize: 12,
                          fontWeight: 700, cursor: isImporting ? "wait" : "pointer",
                          opacity: cjImporting && !isImporting ? 0.4 : 1,
                        }}
                      >
                        {isImporting ? "Importing..." : "Import to Store"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!cjPickerLoading && cjResults.length > 0 && (
              <div style={{ textAlign: "center", marginTop: 16 }}>
                <button
                  onClick={addTrendWithoutCj}
                  disabled={!!cjImporting}
                  style={{
                    padding: "6px 14px", background: "none",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
                    color: "#64748b", fontSize: 11, cursor: "pointer",
                  }}
                >
                  Skip CJ &mdash; add manually instead
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </FeatureGate>
  );
}

/* ─── sub-components ──────────────────────────────────────── */

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent: string }) {
  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.06em" }}>
          {label.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", color: accent }}>
        {value}
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  status,
  isExpanded,
  onToggle,
  children,
}: {
  step: number;
  title: string;
  description: string;
  status: StepStatus;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const color = status === "complete" ? "#22c55e" : status === "current" ? "#0a84ff" : "rgba(255,255,255,0.25)";
  const bgGlow =
    status === "current"
      ? "rgba(10,132,255,0.04)"
      : status === "complete"
        ? "rgba(34,197,94,0.03)"
        : "transparent";

  return (
    <div
      className="xom3-glass xom3-glassEdge"
      style={{
        borderRadius: 14,
        overflow: "hidden",
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: color,
        background: bgGlow,
        transition: "all 0.3s ease",
      }}
    >
      {/* header (clickable) */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        {/* badge */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            transition: "all 0.3s ease",
            ...(status === "complete"
              ? { background: "#22c55e", color: "#fff" }
              : status === "current"
                ? { background: "rgba(10,132,255,0.18)", color: "#0a84ff", border: "2px solid #0a84ff", boxShadow: "0 0 10px rgba(10,132,255,0.3)" }
                : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.08)" }),
          }}
        >
          {status === "complete" ? "✓" : step}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: status === "upcoming" ? "rgba(255,255,255,0.45)" : "#f7f8ff" }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{description}</div>
        </div>

        {/* chevron */}
        <span
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            transition: "transform 0.25s ease",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>

      {/* body */}
      <div
        style={{
          maxHeight: isExpanded ? 500 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ padding: "0 20px 18px 66px" }}>{children}</div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const inner = (
    <div
      className="xom3-glass xom3-glassEdge"
      style={{
        padding: "16px 14px",
        borderRadius: 10,
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(10,132,255,0.3)";
        e.currentTarget.style.background = "rgba(10,132,255,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "";
        e.currentTarget.style.background = "";
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
    </div>
  );

  if (href) {
    return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return <div onClick={onClick}>{inner}</div>;
}


function Spinner({ size = 20 }: { size?: number }) {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: size,
          height: size,
          border: `2px solid rgba(10,132,255,0.25)`,
          borderTopColor: "#0a84ff",
          borderRadius: "50%",
          animation: "xom3Spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes xom3Spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
