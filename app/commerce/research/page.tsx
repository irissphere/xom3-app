"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import { CommercePageActions } from "../components/CommercePageActions";
import { PRODUCT_CATEGORIES } from "@/lib/commerce/categories";

/* ─── types ─────────────────────────────────────────────────────── */

type TabId = "trends" | "validator" | "niche";

interface HistoryEntry {
  id: string;
  type: TabId;
  query: string;
  score: number | null;
  date: string;
  summary: string;
}

interface TrendProduct {
  name: string;
  description: string;
  platforms: string[];
  priceRange: { low: number; high: number };
  demandScore: number;
  competitionScore: number;
  marginScore: number;
  trendDirection: string;
  seasonality: string;
  entryDifficulty?: string;
  estimatedMonthlySales?: string;
  whyTrending?: string;
}

interface EmergingTrend {
  trend: string;
  description: string;
  timeframe: string;
  confidence: number;
  suggestedProducts: string[];
  platforms?: string[];
}

interface AvoidItem {
  product: string;
  reason: string;
}

interface TrendData {
  analysisDate?: string;
  niche?: string;
  marketOverview?: string;
  trendingProducts?: TrendProduct[];
  emergingTrends?: EmergingTrend[];
  avoidList?: AvoidItem[];
  actionSteps?: string[];
}

interface ScoreDetail {
  score: number;
  reasoning: string;
}

interface ValidateData {
  product?: string;
  recommendation?: string;
  overallScore?: number;
  scores?: {
    demand?: ScoreDetail;
    competition?: ScoreDetail;
    marginPotential?: ScoreDetail;
    trendMomentum?: ScoreDetail;
    fulfillmentEase?: ScoreDetail;
  };
  strengths?: string[];
  weaknesses?: string[];
  estimatedNumbers?: {
    monthlySalesPotential?: string;
    revenuePerMonth?: string;
    profitPerMonth?: string;
    startupCost?: string;
    timeToProfit?: string;
  };
  competitorCheck?: {
    topCompetitors?: string[];
    priceRange?: string;
    marketGap?: string;
  };
  supplierOptions?: {
    platform: string;
    estimatedCost: string;
    shippingTime: string;
    moq: string;
    recommendation?: string;
  }[];
  nextSteps?: string[];
  actionPlan?: {
    step: number;
    action: string;
    details: string;
    estimatedCost?: string;
    timeframe?: string;
  }[];
  alternativeProducts?: { name: string; whyBetter: string }[];
  summary?: string;
}

interface NicheProduct {
  name: string;
  priceRange: string;
  demandLevel: string;
  competitionLevel: string;
  profitPotential: string;
  bestPlatforms?: string[];
  quickTip?: string;
}

interface CompetitorEntry {
  name: string;
  size: string;
  marketShare: string;
  differentiator: string;
}

interface NicheData {
  niche?: string;
  overallOpportunityScore?: number;
  summary?: string;
  marketMetrics?: {
    estimatedSize?: string;
    annualGrowth?: string;
    saturationLevel?: string;
    entryBarrier?: string;
    averageMargin?: string;
  };
  topProducts?: NicheProduct[];
  targetAudience?: {
    demographics?: string;
    psychographics?: string;
    spendingHabits?: string;
    platforms?: string;
    painPoints?: string[];
  };
  competitorMap?: CompetitorEntry[];
  entryStrategy?: {
    recommendedApproach?: string;
    startupBudget?: string;
    timeToFirstSale?: string;
    bestPlatform?: string;
    marketingStrategy?: string;
    differentiationIdeas?: string[];
  };
  risks?: string[];
  opportunities?: string[];
}

/* ─── constants ─────────────────────────────────────────────────── */

const HISTORY_KEY = "xom3_research_history";
const MAX_HISTORY = 10;

const CATEGORIES = PRODUCT_CATEGORIES;

const SOURCES = [
  "Dropshipping",
  "Print on Demand",
  "Wholesale",
  "Digital Creation",
  "Affiliate",
];

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "trends", label: "Trend Discovery", icon: "📈" },
  { id: "validator", label: "Product Validator", icon: "✅" },
  { id: "niche", label: "Niche Explorer", icon: "🔍" },
];

/* ─── helpers ───────────────────────────────────────────────────── */

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY))
    );
  } catch {}
}

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function scoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  if (score >= 25) return "#f97316";
  return "#ef4444";
}

function verdictStyle(v: string): { bg: string; text: string; shadow: string } {
  const s = (v || "").toUpperCase();
  if (s === "STRONG BUY")
    return { bg: "#052e16", text: "#4ade80", shadow: "0 0 24px #22c55e44" };
  if (s === "BUY" || s === "GO")
    return { bg: "#0c2d48", text: "#60a5fa", shadow: "0 0 24px #3b82f644" };
  if (s === "HOLD" || s === "CAUTION")
    return { bg: "#422006", text: "#fbbf24", shadow: "0 0 24px #f59e0b44" };
  return { bg: "#350a0a", text: "#f87171", shadow: "0 0 24px #ef444444" };
}

function levelColor(level: string): string {
  const l = (level || "").toLowerCase();
  if (l === "high") return "#22c55e";
  if (l === "medium") return "#f59e0b";
  return "#ef4444";
}

function sizeColor(size: string): string {
  const s = (size || "").toLowerCase();
  if (s === "large") return "#a78bfa";
  if (s === "medium") return "#60a5fa";
  return "#34d399";
}

function directionArrow(d: string): string {
  const lower = (d || "").toLowerCase();
  if (lower.includes("ris")) return "↑";
  if (lower.includes("declin") || lower.includes("fall")) return "↓";
  return "→";
}

function directionColor(d: string): string {
  const lower = (d || "").toLowerCase();
  if (lower.includes("ris")) return "#22c55e";
  if (lower.includes("declin") || lower.includes("fall")) return "#ef4444";
  return "#f59e0b";
}

function saturationGauge(level: string): number {
  const l = (level || "").toLowerCase();
  if (l === "high") return 85;
  if (l === "medium") return 50;
  return 20;
}

/* ─── styles ────────────────────────────────────────────────────── */

const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0c",
    color: "#f0f1f5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px 64px",
  } as React.CSSProperties,
  backLink: {
    color: "#8b92a7",
    textDecoration: "none",
    fontSize: 14,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    transition: "color .2s",
  } as React.CSSProperties,
  title: {
    fontSize: 32,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  subtitle: {
    color: "#8b92a7",
    fontSize: 15,
    marginTop: 4,
    marginBottom: 28,
  } as React.CSSProperties,
  tabBar: {
    display: "flex",
    gap: 4,
    background: "#16161a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      flex: 1,
      padding: "12px 16px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      transition: "all .2s",
      background: active
        ? "linear-gradient(135deg,#7c3aed,#6d28d9)"
        : "transparent",
      color: active ? "#fff" : "#8b92a7",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    }) as React.CSSProperties,
  glass: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
  } as React.CSSProperties,
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "#16161a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#f0f1f5",
    fontSize: 15,
    outline: "none",
    transition: "border-color .2s",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  select: {
    width: "100%",
    padding: "12px 16px",
    background: "#16161a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#f0f1f5",
    fontSize: 15,
    outline: "none",
    appearance: "none" as const,
    cursor: "pointer",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#8b92a7",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  btnPrimary: {
    padding: "12px 28px",
    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform .15s, opacity .2s",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  btnSecondary: {
    padding: "10px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#f0f1f5",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all .2s",
  } as React.CSSProperties,
  btnSmall: {
    padding: "6px 14px",
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.3)",
    borderRadius: 8,
    color: "#a78bfa",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all .2s",
  } as React.CSSProperties,
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
    gap: 16,
    marginBottom: 24,
  } as React.CSSProperties,
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
    gap: 16,
    marginBottom: 24,
  } as React.CSSProperties,
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 20,
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,
  pill: (color: string) =>
    ({
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      background: color + "18",
      color: color,
      marginRight: 4,
      marginBottom: 4,
    }) as React.CSSProperties,
  scoreBar: (pct: number, color: string) =>
    ({
      height: 8,
      borderRadius: 4,
      background: "rgba(255,255,255,0.06)",
      overflow: "hidden",
      position: "relative" as const,
      flex: 1,
    }) as React.CSSProperties,
  scoreBarFill: (pct: number, color: string) =>
    ({
      position: "absolute" as const,
      top: 0,
      left: 0,
      height: "100%",
      width: `${clamp(pct)}%`,
      background: color,
      borderRadius: 4,
      transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
    }) as React.CSSProperties,
  spinnerWrap: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "64px 0",
    gap: 16,
  } as React.CSSProperties,
  fadeIn: {
    animation: "fadeSlideUp .5s ease-out both",
  } as React.CSSProperties,
  mono: {
    fontFamily: '"SF Mono", "Fira Code", monospace',
    fontSize: 13,
    color: "#8b92a7",
  } as React.CSSProperties,
};

/* ─── sub-components ────────────────────────────────────────────── */

function Spinner({ text }: { text: string }) {
  return (
    <div style={S.spinnerWrap}>
      <style>{`
        @keyframes rspin { to { transform: rotate(360deg) } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(124,58,237,0.2)",
          borderTopColor: "#7c3aed",
          borderRadius: "50%",
          animation: "rspin .8s linear infinite",
        }}
      />
      <span style={{ color: "#8b92a7", fontSize: 15 }}>{text}</span>
    </div>
  );
}

function ScoreBar({
  label,
  score,
  color,
  reasoning,
}: {
  label: string;
  score: number;
  color: string;
  reasoning?: string;
}) {
  return (
    <div style={{ marginBottom: reasoning ? 14 : 10 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: "#c4c9d8" }}>
          {label}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {clamp(score)}
        </span>
      </div>
      <div style={S.scoreBar(score, color)}>
        <div style={S.scoreBarFill(score, color)} />
      </div>
      {reasoning && (
        <p
          style={{
            fontSize: 12,
            color: "#6b7280",
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {reasoning}
        </p>
      )}
    </div>
  );
}

function PlatformPills({ platforms }: { platforms: string[] }) {
  const colorMap: Record<string, string> = {
    tiktok: "#ff0050",
    amazon: "#ff9900",
    instagram: "#e1306c",
    shopify: "#96bf48",
    etsy: "#f56400",
    google: "#4285f4",
    facebook: "#1877f2",
    youtube: "#ff0000",
    pinterest: "#e60023",
    ebay: "#e53238",
  };
  return (
    <div style={{ marginBottom: 8 }}>
      {(platforms || []).map((p) => {
        const key = p.toLowerCase().replace(/\s+/g, "");
        const c = colorMap[key] || "#a78bfa";
        return (
          <span key={p} style={S.pill(c)}>
            {p}
          </span>
        );
      })}
    </div>
  );
}

function MarketingTip({ product }: { product?: string }) {
  return (
    <div
      style={{
        ...S.glass,
        background:
          "linear-gradient(135deg,rgba(124,58,237,0.08),rgba(236,72,153,0.06))",
        border: "1px solid rgba(124,58,237,0.2)",
        marginTop: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>🎬</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#c4b5fd" }}>
          Marketing Tip — SpaceBaddie Studio
        </span>
      </div>
      <p style={{ color: "#a5b4fc", fontSize: 14, marginBottom: 12, margin: 0 }}>
        Create marketing videos for{" "}
        <strong>{product || "this product"}</strong> with SpaceBaddie:
      </p>
      <ul
        style={{
          margin: "12px 0",
          paddingLeft: 20,
          color: "#c4c9d8",
          fontSize: 14,
          lineHeight: 1.8,
        }}
      >
        <li>Product showcase video (9:16 for TikTok/Reels)</li>
        <li>Unboxing / review video</li>
        <li>Before/After comparison</li>
      </ul>
      <Link
        href="/spacebaddie/studio"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 22px",
          background: "linear-gradient(135deg,#7c3aed,#ec4899)",
          borderRadius: 10,
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          textDecoration: "none",
          marginTop: 4,
          transition: "transform .15s",
        }}
      >
        🎬 Create Video in SpaceBaddie Studio
      </Link>
    </div>
  );
}

/* ─── main component ────────────────────────────────────────────── */

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<TabId>("trends");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  /* trend state */
  const [trendQuery, setTrendQuery] = useState("");
  const [trendData, setTrendData] = useState<TrendData | null>(null);

  /* validator state */
  const [valProduct, setValProduct] = useState("");
  const [valPrice, setValPrice] = useState("");
  const [valCategory, setValCategory] = useState("");
  const [valSource, setValSource] = useState("");
  const [valData, setValData] = useState<ValidateData | null>(null);

  /* niche state */
  const [nicheQuery, setNicheQuery] = useState("");
  const [nicheData, setNicheData] = useState<NicheData | null>(null);

  /* live trend research (same as hub: /api/commerce/trend-research + Add to store) */
  const [liveTrendNiche, setLiveTrendNiche] = useState("");
  const [liveTrendLoading, setLiveTrendLoading] = useState(false);
  const [liveTrendResults, setLiveTrendResults] = useState<any>(null);
  const [liveTrendError, setLiveTrendError] = useState<string | null>(null);
  const [addingTrendIdx, setAddingTrendIdx] = useState<number | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const pushHistory = useCallback(
    (entry: Omit<HistoryEntry, "id" | "date">) => {
      const h: HistoryEntry = {
        ...entry,
        id: uid(),
        date: new Date().toISOString(),
      };
      const updated = [h, ...loadHistory().filter((e) => e.query !== entry.query)].slice(
        0,
        MAX_HISTORY
      );
      saveHistory(updated);
      setHistory(updated);
    },
    []
  );

  /* ─── API calls ─── */

  const runTrends = async (query?: string) => {
    const q = query || trendQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setTrendData(null);
    try {
      const res = await fetch("/api/commerce/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "trends", niche: q }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Research failed");
      setTrendData(json.data);
      pushHistory({
        type: "trends",
        query: q,
        score: null,
        summary: json.data?.marketOverview?.slice(0, 120) || q,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runValidate = async (product?: string) => {
    const p = product || valProduct.trim();
    if (!p) return;
    setLoading(true);
    setError(null);
    setValData(null);
    try {
      const res = await fetch("/api/commerce/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "validate",
          product: p,
          price: valPrice || undefined,
          category: valCategory || undefined,
          source: valSource || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Validation failed");
      setValData(json.data);
      pushHistory({
        type: "validator",
        query: p,
        score: json.data?.overallScore ?? null,
        summary:
          json.data?.recommendation ||
          json.data?.summary?.slice(0, 120) ||
          p,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runNiche = async (query?: string) => {
    const q = query || nicheQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setNicheData(null);
    try {
      const res = await fetch("/api/commerce/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "niche", niche: q }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Niche analysis failed");
      setNicheData(json.data);
      pushHistory({
        type: "niche",
        query: q,
        score: json.data?.overallOpportunityScore ?? null,
        summary: json.data?.summary?.slice(0, 120) || q,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Live Trend Research (hub-style: trend-research API + Add to store) ── */
  const handleLiveTrendSearch = async () => {
    if (!liveTrendNiche.trim()) return;
    setLiveTrendLoading(true);
    setLiveTrendResults(null);
    setLiveTrendError(null);
    try {
      const r = await fetch("/api/commerce/trend-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: liveTrendNiche }),
      });
      const text = await r.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        setLiveTrendError("AI took too long. Try a simpler niche or click a quick button below.");
        return;
      }
      if (json.ok) {
        setLiveTrendResults(json.trends);
      } else {
        setLiveTrendError(json.error || "Trend scan failed. Please try again.");
      }
    } catch (err) {
      console.error("Trend research failed:", err);
      setLiveTrendError("Network error. Please check your connection and try again.");
    } finally {
      setLiveTrendLoading(false);
    }
  };

  const addTrendToStore = async (product: any, idx: number) => {
    setAddingTrendIdx(idx);
    try {
      const res = await fetch("/api/commerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          description: product.description || "",
          price: product.price || 29.99,
          category: product.category || "General",
          image_url: product.image_url || "",
          status: "active",
          inventory_count: -1,
          product_type: product.selling_route === "digital" ? "digital" : "physical",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`"${product.name}" added to your store and is live!`);
      } else {
        alert(`Failed to add: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert("Failed to add product. Please try again.");
    } finally {
      setAddingTrendIdx(null);
    }
  };

  const rerunFromHistory = (entry: HistoryEntry) => {
    setActiveTab(entry.type);
    if (entry.type === "trends") {
      setTrendQuery(entry.query);
      setTimeout(() => runTrends(entry.query), 50);
    } else if (entry.type === "validator") {
      setValProduct(entry.query);
      setTimeout(() => runValidate(entry.query), 50);
    } else if (entry.type === "niche") {
      setNicheQuery(entry.query);
      setTimeout(() => runNiche(entry.query), 50);
    }
  };

  const clearHistory = () => {
    saveHistory([]);
    setHistory([]);
  };

  const switchToValidator = (productName: string) => {
    setActiveTab("validator");
    setValProduct(productName);
    setValData(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ─── render ─── */

  return (
    <FeatureGate feature="ecommerce">
      <style>{`
        @keyframes rspin { to { transform: rotate(360deg) } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        .xr-fade { animation: fadeSlideUp .5s ease-out both; }
        .xr-fade-d1 { animation-delay: .05s; }
        .xr-fade-d2 { animation-delay: .1s; }
        .xr-fade-d3 { animation-delay: .15s; }
        .xr-fade-d4 { animation-delay: .2s; }
        .xr-card:hover { border-color: rgba(124,58,237,0.3) !important; transform: translateY(-2px); }
        .xr-btn:hover { opacity:0.9; transform:scale(1.02); }
        .xr-tab:hover { color:#c4b5fd !important; }
        .xr-input:focus { border-color:rgba(124,58,237,0.5) !important; }
        .xr-hist:hover { border-color:rgba(124,58,237,0.4) !important; background:rgba(124,58,237,0.06) !important; }
      `}</style>

      <div style={S.page} className="xom3-home">
        <div style={S.container} className="xom3-container">
          {/* header */}
          <div style={{ marginBottom: 16 }}>
            <CommercePageActions />
          </div>
          <h1 style={S.title}>Product Research</h1>
          <p style={S.subtitle}>AI-powered market intelligence</p>

          {/* Live Trend Research (same as Commerce Hub: real-time + Add to store) */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ ...S.glass, padding: "24px 20px" } as React.CSSProperties}>
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
                  value={liveTrendNiche}
                  onChange={(e) => setLiveTrendNiche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLiveTrendSearch()}
                  placeholder='Try: "health gadgets", "pet accessories", "digital templates", "fitness"...'
                  style={{ flex: 1 }}
                />
                <button
                  className="xom3-btn xom3-btnPrimary"
                  onClick={handleLiveTrendSearch}
                  disabled={liveTrendLoading || !liveTrendNiche.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {liveTrendLoading ? "Scanning..." : "Find Trends"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: liveTrendResults ? 20 : 0 }}>
                {["Health & Wellness", "Tech Gadgets", "Home Decor", "Pet Products", "Digital Templates", "Beauty", "Fitness"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setLiveTrendNiche(n)}
                    style={{
                      padding: "4px 12px",
                      background: liveTrendNiche === n ? "rgba(255,0,110,0.15)" : "rgba(255,255,255,0.05)",
                      border: liveTrendNiche === n ? "1px solid rgba(255,0,110,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 20,
                      color: liveTrendNiche === n ? "#FF006E" : "#94a3b8",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: liveTrendNiche === n ? 700 : 400,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {liveTrendError && (
                <div style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 16,
                  color: "#f87171",
                  fontSize: 13,
                }}>
                  {liveTrendError}
                </div>
              )}
              {liveTrendResults && (
                <div>
                  <div style={{
                    background: "rgba(255,0,110,0.06)",
                    border: "1px solid rgba(255,0,110,0.15)",
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#FF006E", marginBottom: 6 }}>
                      Market Pulse: {liveTrendResults.niche}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
                      {liveTrendResults.trend_summary}
                    </p>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>
                    HOT PRODUCTS ({liveTrendResults.hot_products?.length || 0}) — Click &quot;Add to Store&quot; to instantly list any product
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                    {(liveTrendResults.hot_products || []).map((p: any, idx: number) => {
                      const diffColor = p.difficulty === "beginner" ? "#4ade80" : p.difficulty === "intermediate" ? "#fbbf24" : "#f87171";
                      const isAdding = addingTrendIdx === idx;
                      return (
                        <div
                          key={idx}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: idx === 0 ? "2px solid rgba(255,0,110,0.25)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            padding: 16,
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
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
                            <img
                              src={p.image_url}
                              alt=""
                              style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 8, marginBottom: 10 }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, lineHeight: 1.4 }}>{p.description}</div>
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
                          <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 6 }}>{p.trend_source}</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                            <span style={{ padding: "2px 8px", background: "rgba(59,130,246,0.12)", borderRadius: 4, fontSize: 10, color: "#60a5fa", fontWeight: 600 }}>{p.selling_route}</span>
                            <span style={{ padding: "2px 8px", background: `${diffColor}15`, borderRadius: 4, fontSize: 10, color: diffColor, fontWeight: 600 }}>{p.time_to_first_sale}</span>
                          </div>
                          {p.quick_tip && (
                            <div style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 12 }}>Tip: {p.quick_tip}</div>
                          )}
                          <div style={{ marginTop: "auto" }}>
                            <button
                              type="button"
                              onClick={() => addTrendToStore(p, idx)}
                              disabled={isAdding}
                              style={{
                                width: "100%",
                                padding: "10px",
                                background: idx === 0 ? "linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)" : "linear-gradient(135deg, #0a84ff 0%, #6366f1 100%)",
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
                  {liveTrendResults.emerging_niches?.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 10 }}>EMERGING NICHES</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {liveTrendResults.emerging_niches.map((en: any, i: number) => (
                          <div key={i} style={{ padding: "10px 14px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 8, flex: "1 1 200px" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#c4b5fd" }}>{en.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{en.why}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {liveTrendResults.avoid?.length > 0 && (
                    <div style={{ marginTop: 16, padding: 12, background: "rgba(248,113,113,0.06)", borderRadius: 8, border: "1px solid rgba(248,113,113,0.15)" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>AVOID</div>
                      {liveTrendResults.avoid.map((a: string, i: number) => (
                        <div key={i} style={{ fontSize: 12, color: "#94a3b8", marginBottom: 2 }}>&#x26A0; {a}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* tabs */}
          <div style={S.tabBar}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className="xr-tab"
                style={S.tab(activeTab === t.id)}
                onClick={() => setActiveTab(t.id)}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* error */}
          {error && (
            <div
              style={{
                ...S.glass,
                background: "rgba(239,68,68,0.08)",
                borderColor: "rgba(239,68,68,0.3)",
                color: "#f87171",
                fontSize: 14,
              }}
            >
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                style={{
                  float: "right",
                  background: "none",
                  border: "none",
                  color: "#f87171",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ═══════ TAB 1: TREND DISCOVERY ═══════ */}
          {activeTab === "trends" && (
            <div className="xr-fade">
              <div style={S.glass} className="xom3-glass">
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    className="xr-input xom3-input"
                    style={{ ...S.input, flex: 1 }}
                    placeholder="e.g., pet accessories, home fitness, eco-friendly products"
                    value={trendQuery}
                    onChange={(e) => setTrendQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && runTrends()
                    }
                  />
                  <button
                    className="xr-btn xom3-btn xom3-btnPrimary"
                    style={{
                      ...S.btnPrimary,
                      opacity: loading || !trendQuery.trim() ? 0.5 : 1,
                      pointerEvents:
                        loading || !trendQuery.trim() ? "none" : "auto",
                    }}
                    onClick={() => runTrends()}
                  >
                    {loading ? "Analyzing…" : "Discover Trends"}
                  </button>
                </div>
              </div>

              {loading && <Spinner text="Analyzing market data…" />}

              {!loading && trendData && !trendData.trendingProducts && trendData && (
                <div style={{ ...S.glass, color: "#f59e0b" }}>
                  Received raw response. Try a more specific query.
                </div>
              )}

              {!loading && trendData?.trendingProducts && (
                <div className="xr-fade">
                  {/* market overview */}
                  {trendData.marketOverview && (
                    <div
                      className="xr-fade xr-fade-d1"
                      style={{
                        ...S.glass,
                        background:
                          "linear-gradient(135deg,rgba(124,58,237,0.06),rgba(59,130,246,0.04))",
                        borderColor: "rgba(124,58,237,0.15)",
                      }}
                    >
                      <h3 style={{ ...S.sectionTitle, color: "#c4b5fd" }}>
                        📊 Market Overview
                      </h3>
                      <p
                        style={{
                          color: "#c4c9d8",
                          fontSize: 15,
                          lineHeight: 1.65,
                          margin: 0,
                        }}
                      >
                        {trendData.marketOverview}
                      </p>
                    </div>
                  )}

                  {/* trending products */}
                  <h3 style={S.sectionTitle}>🔥 Trending Products</h3>
                  <div style={S.grid2}>
                    {trendData.trendingProducts.map((p, i) => (
                      <div
                        key={i}
                        className="xr-card xr-fade"
                        style={{
                          ...S.card,
                          transition: "all .25s",
                          animationDelay: `${i * 0.06}s`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 6,
                          }}
                        >
                          <h4
                            style={{
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          >
                            {p.name}
                          </h4>
                          <span
                            style={{
                              fontSize: 20,
                              color: directionColor(p.trendDirection),
                              fontWeight: 700,
                              lineHeight: 1,
                            }}
                          >
                            {directionArrow(p.trendDirection)}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: 13,
                            color: "#8b92a7",
                            lineHeight: 1.5,
                            marginBottom: 10,
                            marginTop: 2,
                          }}
                        >
                          {p.description}
                        </p>
                        <PlatformPills platforms={p.platforms || []} />

                        <ScoreBar
                          label="Demand"
                          score={p.demandScore}
                          color="#22c55e"
                        />
                        <ScoreBar
                          label="Competition"
                          score={p.competitionScore}
                          color="#f97316"
                        />
                        <ScoreBar
                          label="Margin"
                          score={p.marginScore}
                          color="#3b82f6"
                        />

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 13,
                            color: "#6b7280",
                            marginTop: 10,
                            marginBottom: 10,
                          }}
                        >
                          <span>
                            💰 ${p.priceRange?.low}–${p.priceRange?.high}
                          </span>
                          <span>📅 {p.seasonality}</span>
                        </div>

                        <button
                          className="xr-btn"
                          style={{ ...S.btnSmall, width: "100%" }}
                          onClick={() => switchToValidator(p.name)}
                        >
                          Research This Product →
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* emerging trends */}
                  {trendData.emergingTrends &&
                    trendData.emergingTrends.length > 0 && (
                      <div className="xr-fade xr-fade-d2">
                        <h3 style={S.sectionTitle}>🌱 Emerging Trends</h3>
                        <div style={S.grid3}>
                          {trendData.emergingTrends.map((t, i) => (
                            <div
                              key={i}
                              className="xr-card"
                              style={{
                                ...S.card,
                                transition: "all .25s",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 8,
                                }}
                              >
                                <h4
                                  style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 700,
                                  }}
                                >
                                  {t.trend}
                                </h4>
                                <span
                                  style={S.pill(
                                    t.confidence >= 70 ? "#22c55e" : "#f59e0b"
                                  )}
                                >
                                  {t.confidence}% conf
                                </span>
                              </div>
                              <p
                                style={{
                                  fontSize: 13,
                                  color: "#8b92a7",
                                  lineHeight: 1.5,
                                  margin: "0 0 8px",
                                }}
                              >
                                {t.description}
                              </p>
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                  margin: "0 0 8px",
                                }}
                              >
                                ⏱ {t.timeframe}
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {t.suggestedProducts?.map((sp, j) => (
                                  <span
                                    key={j}
                                    style={S.pill("#a78bfa")}
                                  >
                                    {sp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* avoid list */}
                  {trendData.avoidList && trendData.avoidList.length > 0 && (
                    <div className="xr-fade xr-fade-d3">
                      <h3 style={{ ...S.sectionTitle, color: "#f87171" }}>
                        🚫 Products to Avoid
                      </h3>
                      <div style={S.grid3}>
                        {trendData.avoidList.map((a, i) => (
                          <div
                            key={i}
                            className="xr-card"
                            style={{
                              ...S.card,
                              borderColor: "rgba(239,68,68,0.3)",
                              transition: "all .25s",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 6px",
                                fontSize: 15,
                                fontWeight: 700,
                                color: "#fca5a5",
                              }}
                            >
                              {a.product}
                            </h4>
                            <p
                              style={{
                                fontSize: 13,
                                color: "#8b92a7",
                                margin: 0,
                                lineHeight: 1.5,
                              }}
                            >
                              {a.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* action steps */}
                  {trendData.actionSteps && trendData.actionSteps.length > 0 && (
                    <div className="xr-fade xr-fade-d4">
                      <h3 style={S.sectionTitle}>⚡ Action Steps</h3>
                      <div style={S.glass}>
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            lineHeight: 2,
                            color: "#c4c9d8",
                            fontSize: 14,
                          }}
                        >
                          {trendData.actionSteps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}

                  <MarketingTip product={trendQuery} />
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB 2: PRODUCT VALIDATOR ═══════ */}
          {activeTab === "validator" && (
            <div className="xr-fade">
              <div style={S.glass} className="xom3-glass">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.label} className="xom3-label">
                      Product Name *
                    </label>
                    <input
                      className="xr-input xom3-input"
                      style={S.input}
                      placeholder="e.g., LED dog collar, aesthetic phone case, digital planner"
                      value={valProduct}
                      onChange={(e) => setValProduct(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !loading && runValidate()
                      }
                    />
                  </div>
                  <div>
                    <label style={S.label} className="xom3-label">
                      Target Price (optional)
                    </label>
                    <input
                      className="xr-input xom3-input"
                      style={S.input}
                      placeholder="e.g., 29.99"
                      value={valPrice}
                      onChange={(e) => setValPrice(e.target.value)}
                      type="number"
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={S.label} className="xom3-label">
                      Category
                    </label>
                    <select
                      className="xr-input"
                      style={S.select}
                      value={valCategory}
                      onChange={(e) => setValCategory(e.target.value)}
                      aria-label="Category"
                    >
                      <option value="">Select category…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.label} className="xom3-label">
                      Source
                    </label>
                    <select
                      className="xr-input"
                      style={S.select}
                      value={valSource}
                      onChange={(e) => setValSource(e.target.value)}
                      aria-label="Source"
                    >
                      <option value="">Select source…</option>
                      {SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  className="xr-btn xom3-btn xom3-btnPrimary"
                  style={{
                    ...S.btnPrimary,
                    opacity: loading || !valProduct.trim() ? 0.5 : 1,
                    pointerEvents:
                      loading || !valProduct.trim() ? "none" : "auto",
                  }}
                  onClick={() => runValidate()}
                >
                  {loading ? "Analyzing…" : "Validate Product"}
                </button>
              </div>

              {loading && <Spinner text="Running product validation…" />}

              {!loading && valData && valData.overallScore !== undefined && (
                <div className="xr-fade">
                  {/* verdict + score */}
                  <div
                    className="xr-fade xr-fade-d1"
                    style={{
                      display: "flex",
                      gap: 24,
                      marginBottom: 24,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* verdict badge */}
                    <div
                      style={{
                        ...S.glass,
                        flex: "1 1 200px",
                        textAlign: "center",
                        background: verdictStyle(
                          valData.recommendation || ""
                        ).bg,
                        boxShadow: verdictStyle(
                          valData.recommendation || ""
                        ).shadow,
                        borderColor: verdictStyle(
                          valData.recommendation || ""
                        ).text + "33",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#8b92a7",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 600,
                        }}
                      >
                        Verdict
                      </div>
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 800,
                          color: verdictStyle(
                            valData.recommendation || ""
                          ).text,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {valData.recommendation || "N/A"}
                      </div>
                    </div>

                    {/* overall score */}
                    <div
                      style={{
                        ...S.glass,
                        flex: "1 1 200px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#8b92a7",
                          marginBottom: 8,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          fontWeight: 600,
                        }}
                      >
                        Overall Score
                      </div>
                      <div
                        style={{
                          fontSize: 56,
                          fontWeight: 800,
                          color: scoreColor(valData.overallScore),
                          lineHeight: 1,
                          fontFamily: '"SF Mono","Fira Code",monospace',
                        }}
                      >
                        {valData.overallScore}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#6b7280",
                          marginTop: 4,
                        }}
                      >
                        out of 100
                      </div>
                    </div>
                  </div>

                  {/* score breakdown */}
                  {valData.scores && (
                    <div
                      className="xr-fade xr-fade-d2"
                      style={S.glass}
                    >
                      <h3 style={S.sectionTitle}>📊 Score Breakdown</h3>
                      <ScoreBar
                        label="Demand"
                        score={valData.scores.demand?.score || 0}
                        color="#22c55e"
                        reasoning={valData.scores.demand?.reasoning}
                      />
                      <ScoreBar
                        label="Competition (lower = better)"
                        score={valData.scores.competition?.score || 0}
                        color="#f97316"
                        reasoning={valData.scores.competition?.reasoning}
                      />
                      <ScoreBar
                        label="Margin Potential"
                        score={valData.scores.marginPotential?.score || 0}
                        color="#3b82f6"
                        reasoning={valData.scores.marginPotential?.reasoning}
                      />
                      <ScoreBar
                        label="Trend Momentum"
                        score={valData.scores.trendMomentum?.score || 0}
                        color="#a78bfa"
                        reasoning={valData.scores.trendMomentum?.reasoning}
                      />
                      <ScoreBar
                        label="Fulfillment Ease"
                        score={valData.scores.fulfillmentEase?.score || 0}
                        color="#06b6d4"
                        reasoning={valData.scores.fulfillmentEase?.reasoning}
                      />
                    </div>
                  )}

                  {/* strengths & weaknesses */}
                  <div
                    className="xr-fade xr-fade-d2"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    {valData.strengths && valData.strengths.length > 0 && (
                      <div style={S.glass}>
                        <h3
                          style={{
                            ...S.sectionTitle,
                            color: "#4ade80",
                            fontSize: 16,
                          }}
                        >
                          ✅ Strengths
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 0,
                            listStyle: "none",
                          }}
                        >
                          {valData.strengths.map((s, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 14,
                                color: "#c4c9d8",
                                padding: "6px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <span style={{ color: "#22c55e", flexShrink: 0 }}>
                                ✓
                              </span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {valData.weaknesses && valData.weaknesses.length > 0 && (
                      <div style={S.glass}>
                        <h3
                          style={{
                            ...S.sectionTitle,
                            color: "#f87171",
                            fontSize: 16,
                          }}
                        >
                          ✕ Weaknesses
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 0,
                            listStyle: "none",
                          }}
                        >
                          {valData.weaknesses.map((w, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 14,
                                color: "#c4c9d8",
                                padding: "6px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <span style={{ color: "#ef4444", flexShrink: 0 }}>
                                ✕
                              </span>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* estimated numbers */}
                  {valData.estimatedNumbers && (
                    <div className="xr-fade xr-fade-d3" style={S.glass}>
                      <h3 style={S.sectionTitle}>💰 Estimated Numbers</h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(180px,1fr))",
                          gap: 16,
                        }}
                      >
                        {[
                          {
                            label: "Monthly Sales",
                            value:
                              valData.estimatedNumbers.monthlySalesPotential,
                          },
                          {
                            label: "Revenue / mo",
                            value: valData.estimatedNumbers.revenuePerMonth,
                          },
                          {
                            label: "Profit / mo",
                            value: valData.estimatedNumbers.profitPerMonth,
                          },
                          {
                            label: "Startup Cost",
                            value: valData.estimatedNumbers.startupCost,
                          },
                          {
                            label: "Time to Profit",
                            value: valData.estimatedNumbers.timeToProfit,
                          },
                        ].map((m, i) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              borderRadius: 10,
                              padding: "14px 16px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                                fontWeight: 600,
                              }}
                            >
                              {m.label}
                            </div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#f0f1f5",
                              }}
                            >
                              {m.value || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* competitor check */}
                  {valData.competitorCheck && (
                    <div className="xr-fade xr-fade-d3" style={S.glass}>
                      <h3 style={S.sectionTitle}>🏆 Competitor Check</h3>
                      {valData.competitorCheck.topCompetitors && (
                        <div style={{ marginBottom: 12 }}>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#6b7280",
                              fontWeight: 600,
                            }}
                          >
                            Top Competitors:
                          </span>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 6,
                            }}
                          >
                            {valData.competitorCheck.topCompetitors.map(
                              (c, i) => (
                                <span key={i} style={S.pill("#60a5fa")}>
                                  {c}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                      {valData.competitorCheck.priceRange && (
                        <p
                          style={{
                            fontSize: 14,
                            color: "#c4c9d8",
                            margin: "8px 0",
                          }}
                        >
                          <strong>Price Range:</strong>{" "}
                          {valData.competitorCheck.priceRange}
                        </p>
                      )}
                      {valData.competitorCheck.marketGap && (
                        <p
                          style={{
                            fontSize: 14,
                            color: "#a5b4fc",
                            margin: "8px 0",
                          }}
                        >
                          <strong>Market Gap:</strong>{" "}
                          {valData.competitorCheck.marketGap}
                        </p>
                      )}
                    </div>
                  )}

                  {/* supplier options */}
                  {valData.supplierOptions &&
                    valData.supplierOptions.length > 0 && (
                      <div className="xr-fade xr-fade-d3">
                        <h3 style={S.sectionTitle}>📦 Supplier Options</h3>
                        <div style={S.grid3}>
                          {valData.supplierOptions.map((s, i) => (
                            <div
                              key={i}
                              className="xr-card"
                              style={{
                                ...S.card,
                                transition: "all .25s",
                              }}
                            >
                              <h4
                                style={{
                                  margin: "0 0 10px",
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: "#a78bfa",
                                }}
                              >
                                {s.platform}
                              </h4>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#c4c9d8",
                                  lineHeight: 1.8,
                                }}
                              >
                                <div>
                                  <strong>Cost:</strong> {s.estimatedCost}
                                </div>
                                <div>
                                  <strong>Shipping:</strong> {s.shippingTime}
                                </div>
                                <div>
                                  <strong>MOQ:</strong> {s.moq}
                                </div>
                              </div>
                              {s.recommendation && (
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    marginTop: 8,
                                    marginBottom: 0,
                                    fontStyle: "italic",
                                  }}
                                >
                                  {s.recommendation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* action plan / next steps */}
                  {(valData.actionPlan?.length || valData.nextSteps?.length) ? (
                    <div className="xr-fade xr-fade-d4" style={S.glass}>
                      <h3 style={S.sectionTitle}>🗺️ Action Plan</h3>
                      {valData.actionPlan && valData.actionPlan.length > 0 ? (
                        <div>
                          {valData.actionPlan.map((ap, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                gap: 14,
                                padding: "14px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "rgba(124,58,237,0.15)",
                                  color: "#a78bfa",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 700,
                                  fontSize: 14,
                                  flexShrink: 0,
                                }}
                              >
                                {ap.step || i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    marginBottom: 4,
                                  }}
                                >
                                  {ap.action}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: "#8b92a7",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {ap.details}
                                </div>
                                {(ap.estimatedCost || ap.timeframe) && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 16,
                                      marginTop: 6,
                                      fontSize: 12,
                                      color: "#6b7280",
                                    }}
                                  >
                                    {ap.estimatedCost && (
                                      <span>💵 {ap.estimatedCost}</span>
                                    )}
                                    {ap.timeframe && (
                                      <span>⏱ {ap.timeframe}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ol
                          style={{
                            margin: 0,
                            paddingLeft: 20,
                            lineHeight: 2,
                            color: "#c4c9d8",
                            fontSize: 14,
                          }}
                        >
                          {(valData.nextSteps || []).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ol>
                      )}
                    </div>
                  ) : null}

                  {/* alternative products */}
                  {valData.alternativeProducts &&
                    valData.alternativeProducts.length > 0 &&
                    (valData.overallScore ?? 100) < 60 && (
                      <div className="xr-fade xr-fade-d4">
                        <h3 style={S.sectionTitle}>💡 Alternative Products</h3>
                        <div style={S.grid3}>
                          {valData.alternativeProducts.map((a, i) => (
                            <div
                              key={i}
                              className="xr-card"
                              style={{
                                ...S.card,
                                borderColor: "rgba(96,165,250,0.2)",
                                transition: "all .25s",
                              }}
                            >
                              <h4
                                style={{
                                  margin: "0 0 6px",
                                  fontSize: 15,
                                  fontWeight: 700,
                                }}
                              >
                                {a.name}
                              </h4>
                              <p
                                style={{
                                  fontSize: 13,
                                  color: "#8b92a7",
                                  margin: 0,
                                  lineHeight: 1.5,
                                }}
                              >
                                {a.whyBetter}
                              </p>
                              <button
                                className="xr-btn"
                                style={{ ...S.btnSmall, marginTop: 10 }}
                                onClick={() => switchToValidator(a.name)}
                              >
                                Validate This →
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* add to store */}
                  <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                    <Link
                      href={`/commerce/products?prefill=${encodeURIComponent(
                        valData.product || valProduct
                      )}`}
                      className="xr-btn"
                      style={{
                        ...S.btnPrimary,
                        textDecoration: "none",
                      }}
                    >
                      🛒 Add to Store
                    </Link>
                  </div>

                  <MarketingTip product={valData.product || valProduct} />
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB 3: NICHE EXPLORER ═══════ */}
          {activeTab === "niche" && (
            <div className="xr-fade">
              <div style={S.glass} className="xom3-glass">
                <div style={{ display: "flex", gap: 12 }}>
                  <input
                    className="xr-input xom3-input"
                    style={{ ...S.input, flex: 1 }}
                    placeholder="e.g., sustainable fashion, smart home gadgets, pet wellness"
                    value={nicheQuery}
                    onChange={(e) => setNicheQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !loading && runNiche()
                    }
                  />
                  <button
                    className="xr-btn xom3-btn xom3-btnPrimary"
                    style={{
                      ...S.btnPrimary,
                      opacity: loading || !nicheQuery.trim() ? 0.5 : 1,
                      pointerEvents:
                        loading || !nicheQuery.trim() ? "none" : "auto",
                    }}
                    onClick={() => runNiche()}
                  >
                    {loading ? "Analyzing…" : "Explore Niche"}
                  </button>
                </div>
              </div>

              {loading && <Spinner text="Mapping niche landscape…" />}

              {!loading && nicheData && nicheData.overallOpportunityScore !== undefined && (
                <div className="xr-fade">
                  {/* opportunity score + summary */}
                  <div
                    className="xr-fade xr-fade-d1"
                    style={{
                      ...S.glass,
                      textAlign: "center",
                      background:
                        "linear-gradient(135deg,rgba(124,58,237,0.06),rgba(34,197,94,0.04))",
                      borderColor: "rgba(124,58,237,0.15)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "#8b92a7",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontWeight: 600,
                        marginBottom: 8,
                      }}
                    >
                      Opportunity Score
                    </div>
                    <div
                      style={{
                        fontSize: 64,
                        fontWeight: 800,
                        color: scoreColor(nicheData.overallOpportunityScore),
                        lineHeight: 1,
                        fontFamily: '"SF Mono","Fira Code",monospace',
                      }}
                    >
                      {nicheData.overallOpportunityScore}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#6b7280",
                        marginTop: 4,
                        marginBottom: 16,
                      }}
                    >
                      out of 100
                    </div>
                    {nicheData.summary && (
                      <p
                        style={{
                          fontSize: 15,
                          color: "#c4c9d8",
                          lineHeight: 1.65,
                          maxWidth: 720,
                          margin: "0 auto",
                        }}
                      >
                        {nicheData.summary}
                      </p>
                    )}
                  </div>

                  {/* market metrics */}
                  {nicheData.marketMetrics && (
                    <div className="xr-fade xr-fade-d1" style={S.glass}>
                      <h3 style={S.sectionTitle}>📈 Market Metrics</h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(180px,1fr))",
                          gap: 16,
                        }}
                      >
                        {[
                          {
                            label: "Market Size",
                            value: nicheData.marketMetrics.estimatedSize,
                          },
                          {
                            label: "Annual Growth",
                            value: nicheData.marketMetrics.annualGrowth,
                          },
                          {
                            label: "Entry Barrier",
                            value: nicheData.marketMetrics.entryBarrier,
                          },
                          {
                            label: "Avg Margin",
                            value: nicheData.marketMetrics.averageMargin,
                          },
                        ].map((m, i) => (
                          <div
                            key={i}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              borderRadius: 10,
                              padding: "14px 16px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 6,
                                fontWeight: 600,
                              }}
                            >
                              {m.label}
                            </div>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#f0f1f5",
                              }}
                            >
                              {m.value || "—"}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* saturation gauge */}
                      {nicheData.marketMetrics.saturationLevel && (
                        <div style={{ marginTop: 16 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "#c4c9d8",
                              }}
                            >
                              Saturation Level
                            </span>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: levelColor(
                                  nicheData.marketMetrics.saturationLevel ===
                                    "low"
                                    ? "high"
                                    : nicheData.marketMetrics
                                        .saturationLevel === "high"
                                    ? "low"
                                    : "medium"
                                ),
                                textTransform: "capitalize",
                              }}
                            >
                              {nicheData.marketMetrics.saturationLevel}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 10,
                              borderRadius: 5,
                              background: "rgba(255,255,255,0.06)",
                              overflow: "hidden",
                              position: "relative",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                height: "100%",
                                width: `${saturationGauge(
                                  nicheData.marketMetrics.saturationLevel
                                )}%`,
                                borderRadius: 5,
                                transition: "width 0.8s ease",
                                background:
                                  nicheData.marketMetrics.saturationLevel ===
                                  "low"
                                    ? "#22c55e"
                                    : nicheData.marketMetrics
                                        .saturationLevel === "high"
                                    ? "#ef4444"
                                    : "#f59e0b",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* top products */}
                  {nicheData.topProducts && nicheData.topProducts.length > 0 && (
                    <div className="xr-fade xr-fade-d2">
                      <h3 style={S.sectionTitle}>🏷️ Top Products</h3>
                      <div style={S.grid3}>
                        {nicheData.topProducts.map((p, i) => (
                          <div
                            key={i}
                            className="xr-card"
                            style={{
                              ...S.card,
                              transition: "all .25s",
                            }}
                          >
                            <h4
                              style={{
                                margin: "0 0 6px",
                                fontSize: 15,
                                fontWeight: 700,
                              }}
                            >
                              {p.name}
                            </h4>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#6b7280",
                                marginBottom: 10,
                              }}
                            >
                              {p.priceRange}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                fontSize: 12,
                                marginBottom: 8,
                              }}
                            >
                              <span>
                                Demand:{" "}
                                <strong
                                  style={{ color: levelColor(p.demandLevel) }}
                                >
                                  {p.demandLevel}
                                </strong>
                              </span>
                              <span>
                                Comp:{" "}
                                <strong
                                  style={{
                                    color: levelColor(
                                      p.competitionLevel === "low"
                                        ? "high"
                                        : p.competitionLevel === "high"
                                        ? "low"
                                        : "medium"
                                    ),
                                  }}
                                >
                                  {p.competitionLevel}
                                </strong>
                              </span>
                              <span>
                                Profit:{" "}
                                <strong
                                  style={{
                                    color: levelColor(p.profitPotential),
                                  }}
                                >
                                  {p.profitPotential}
                                </strong>
                              </span>
                            </div>
                            {p.quickTip && (
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "#a5b4fc",
                                  margin: 0,
                                  fontStyle: "italic",
                                }}
                              >
                                💡 {p.quickTip}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* target audience */}
                  {nicheData.targetAudience && (
                    <div className="xr-fade xr-fade-d2" style={S.glass}>
                      <h3 style={S.sectionTitle}>👥 Target Audience</h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 16,
                          fontSize: 14,
                          color: "#c4c9d8",
                          lineHeight: 1.7,
                        }}
                      >
                        {nicheData.targetAudience.demographics && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Demographics:
                            </strong>
                            <br />
                            {nicheData.targetAudience.demographics}
                          </div>
                        )}
                        {nicheData.targetAudience.psychographics && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Psychographics:
                            </strong>
                            <br />
                            {nicheData.targetAudience.psychographics}
                          </div>
                        )}
                        {nicheData.targetAudience.spendingHabits && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Spending Habits:
                            </strong>
                            <br />
                            {nicheData.targetAudience.spendingHabits}
                          </div>
                        )}
                        {nicheData.targetAudience.platforms && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Platforms:
                            </strong>
                            <br />
                            {nicheData.targetAudience.platforms}
                          </div>
                        )}
                      </div>
                      {nicheData.targetAudience.painPoints &&
                        nicheData.targetAudience.painPoints.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <strong
                              style={{
                                color: "#8b92a7",
                                fontSize: 14,
                              }}
                            >
                              Pain Points:
                            </strong>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 6,
                              }}
                            >
                              {nicheData.targetAudience.painPoints.map(
                                (pp, i) => (
                                  <span key={i} style={S.pill("#f97316")}>
                                    {pp}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* competitor map */}
                  {nicheData.competitorMap &&
                    nicheData.competitorMap.length > 0 && (
                      <div className="xr-fade xr-fade-d3">
                        <h3 style={S.sectionTitle}>🗺️ Competitor Map</h3>
                        <div style={S.grid3}>
                          {nicheData.competitorMap.map((c, i) => (
                            <div
                              key={i}
                              className="xr-card"
                              style={{
                                ...S.card,
                                transition: "all .25s",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: 8,
                                }}
                              >
                                <h4
                                  style={{
                                    margin: 0,
                                    fontSize: 15,
                                    fontWeight: 700,
                                  }}
                                >
                                  {c.name}
                                </h4>
                                <span
                                  style={S.pill(sizeColor(c.size))}
                                >
                                  {c.size}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "#c4c9d8",
                                  lineHeight: 1.6,
                                }}
                              >
                                <div>
                                  <strong>Share:</strong> {c.marketShare}
                                </div>
                                <div style={{ marginTop: 4 }}>
                                  {c.differentiator}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* entry strategy */}
                  {nicheData.entryStrategy && (
                    <div className="xr-fade xr-fade-d3" style={S.glass}>
                      <h3 style={S.sectionTitle}>🚀 Entry Strategy</h3>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 16,
                          fontSize: 14,
                          color: "#c4c9d8",
                          lineHeight: 1.7,
                          marginBottom: 16,
                        }}
                      >
                        {nicheData.entryStrategy.recommendedApproach && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Approach:
                            </strong>
                            <br />
                            {nicheData.entryStrategy.recommendedApproach}
                          </div>
                        )}
                        {nicheData.entryStrategy.startupBudget && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Budget:
                            </strong>
                            <br />
                            {nicheData.entryStrategy.startupBudget}
                          </div>
                        )}
                        {nicheData.entryStrategy.timeToFirstSale && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Time to First Sale:
                            </strong>
                            <br />
                            {nicheData.entryStrategy.timeToFirstSale}
                          </div>
                        )}
                        {nicheData.entryStrategy.bestPlatform && (
                          <div>
                            <strong style={{ color: "#8b92a7" }}>
                              Best Platform:
                            </strong>
                            <br />
                            {nicheData.entryStrategy.bestPlatform}
                          </div>
                        )}
                      </div>
                      {nicheData.entryStrategy.marketingStrategy && (
                        <div
                          style={{
                            fontSize: 14,
                            color: "#c4c9d8",
                            marginBottom: 12,
                          }}
                        >
                          <strong style={{ color: "#8b92a7" }}>
                            Marketing:
                          </strong>{" "}
                          {nicheData.entryStrategy.marketingStrategy}
                        </div>
                      )}
                      {nicheData.entryStrategy.differentiationIdeas &&
                        nicheData.entryStrategy.differentiationIdeas.length >
                          0 && (
                          <div>
                            <strong
                              style={{
                                color: "#8b92a7",
                                fontSize: 14,
                              }}
                            >
                              Differentiation Ideas:
                            </strong>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 8,
                              }}
                            >
                              {nicheData.entryStrategy.differentiationIdeas.map(
                                (d, i) => (
                                  <span key={i} style={S.pill("#34d399")}>
                                    {d}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  )}

                  {/* risks & opportunities */}
                  <div
                    className="xr-fade xr-fade-d4"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    {nicheData.risks && nicheData.risks.length > 0 && (
                      <div style={S.glass}>
                        <h3
                          style={{
                            ...S.sectionTitle,
                            color: "#f87171",
                            fontSize: 16,
                          }}
                        >
                          ⚠️ Risks
                        </h3>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 0,
                            listStyle: "none",
                          }}
                        >
                          {nicheData.risks.map((r, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: 14,
                                color: "#c4c9d8",
                                padding: "6px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                display: "flex",
                                gap: 8,
                                alignItems: "flex-start",
                              }}
                            >
                              <span
                                style={{
                                  color: "#ef4444",
                                  flexShrink: 0,
                                }}
                              >
                                •
                              </span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {nicheData.opportunities &&
                      nicheData.opportunities.length > 0 && (
                        <div style={S.glass}>
                          <h3
                            style={{
                              ...S.sectionTitle,
                              color: "#4ade80",
                              fontSize: 16,
                            }}
                          >
                            🌟 Opportunities
                          </h3>
                          <ul
                            style={{
                              margin: 0,
                              paddingLeft: 0,
                              listStyle: "none",
                            }}
                          >
                            {nicheData.opportunities.map((o, i) => (
                              <li
                                key={i}
                                style={{
                                  fontSize: 14,
                                  color: "#c4c9d8",
                                  padding: "6px 0",
                                  borderBottom:
                                    "1px solid rgba(255,255,255,0.04)",
                                  display: "flex",
                                  gap: 8,
                                  alignItems: "flex-start",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#22c55e",
                                    flexShrink: 0,
                                  }}
                                >
                                  •
                                </span>
                                {o}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>

                  <MarketingTip product={nicheQuery} />
                </div>
              )}
            </div>
          )}

          {/* ═══════ RESEARCH HISTORY ═══════ */}
          {history.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h3 style={{ ...S.sectionTitle, margin: 0 }}>
                  🕐 Research History
                </h3>
                <button
                  className="xr-btn"
                  style={{
                    ...S.btnSecondary,
                    fontSize: 12,
                    padding: "6px 14px",
                    color: "#ef4444",
                    borderColor: "rgba(239,68,68,0.2)",
                  }}
                  onClick={clearHistory}
                >
                  Clear History
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  overflowX: "auto",
                  paddingBottom: 8,
                }}
              >
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="xr-hist"
                    onClick={() => rerunFromHistory(h)}
                    style={{
                      minWidth: 220,
                      maxWidth: 280,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "all .2s",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                      }}
                    >
                      <span style={S.pill("#a78bfa")}>
                        {h.type === "trends"
                          ? "📈 Trends"
                          : h.type === "validator"
                          ? "✅ Validate"
                          : "🔍 Niche"}
                      </span>
                      {h.score !== null && (
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: scoreColor(h.score),
                            fontFamily: '"SF Mono","Fira Code",monospace',
                          }}
                        >
                          {h.score}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.query}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.summary}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#4b5563",
                        marginTop: 6,
                      }}
                    >
                      {new Date(h.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </FeatureGate>
  );
}
