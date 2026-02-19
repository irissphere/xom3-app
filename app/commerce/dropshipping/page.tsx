"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { FeatureGate } from "@/app/components/FeatureGate";
import { CommercePageActions } from "../components/CommercePageActions";

/* ─── types ───────────────────────────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface CalcInputs {
  productCost: number;
  shippingCost: number;
  sellingPrice: number;
  adSpend: number;
  platformFee: number;
  monthlyVolume: number;
}

/* ─── constants ───────────────────────────────────────────── */

const SB_GRADIENT = "linear-gradient(135deg, #FF006E, #8A2BE2)";
const SB_GRADIENT_SUBTLE = "linear-gradient(135deg, rgba(255,0,110,0.12), rgba(138,43,226,0.12))";
const SB_BORDER = "rgba(138,43,226,0.3)";

const TOC_SECTIONS = [
  { id: "what-is-dropshipping", label: "What is Dropshipping?" },
  { id: "setup-guide", label: "Step-by-Step Setup" },
  { id: "profit-calculator", label: "Profit Calculator" },
  { id: "common-mistakes", label: "Common Mistakes" },
  { id: "ai-advisor", label: "AI Advisor" },
] as const;

const SUPPLIERS = [
  {
    name: "AliExpress",
    url: "https://www.aliexpress.com",
    pricing: "Free to use, pay per product",
    shipping: "15–45 days (ePacket), 7–15 days (AliExpress Standard)",
    bestFor: "Beginners, wide product selection",
    accent: "#FF4747",
    description:
      "The world's largest dropshipping marketplace with millions of products across every category. No minimum order quantity and buyer protection on every order.",
    tip: "Look for sellers with 4.5+ rating and 95%+ positive feedback. Filter by \"Ships From\" your target country for faster delivery.",
  },
  {
    name: "CJ Dropshipping",
    url: "https://cjdropshipping.com",
    pricing: "Free to use, pay per order",
    shipping: "7–15 days (US/EU warehouses)",
    bestFor: "Faster shipping, product sourcing, custom packaging",
    accent: "#1E90FF",
    description:
      "Offers product sourcing, quality inspection, warehousing, and custom packaging. Has US, EU, and Asia warehouses for faster delivery.",
    tip: "Use their sourcing request feature to find products cheaper than AliExpress. They also offer print-on-demand and custom branding.",
  },
  {
    name: "Zendrop",
    url: "https://www.zendrop.com",
    pricing: "$49/mo (Pro), $79/mo (Plus)",
    shipping: "5–8 days (US fulfillment)",
    bestFor: "US-based fulfillment, automated orders, custom branding",
    accent: "#00C9A7",
    description:
      "US-based fulfillment with automated order processing. Offers custom branding, private labeling, and a built-in product catalog with vetted suppliers.",
    tip: "Their auto-fulfill feature saves hours daily. Great for scaling once you've validated a product.",
  },
  {
    name: "Printful",
    url: "https://www.printful.com",
    pricing: "No monthly fee, pay per order",
    shipping: "2–7 day production + 3–8 day shipping",
    bestFor: "Print-on-demand, custom designs, unique branding",
    accent: "#FF6B35",
    description:
      "Print-on-demand platform — upload your designs onto t-shirts, hoodies, mugs, posters, phone cases, and more. No inventory, no minimum orders.",
    tip: "Perfect for building a brand. Create unique designs and test what resonates before committing to inventory.",
  },
  {
    name: "AutoDS",
    url: "https://www.autods.com",
    pricing: "$26.90/mo (Import 200), $49.90/mo (Starter 500)",
    shipping: "Varies by supplier (multi-source)",
    bestFor: "All-in-one automation, multi-platform selling",
    accent: "#FFB800",
    description:
      "All-in-one dropshipping automation tool. Import products from 25+ suppliers, automatic price and stock monitoring, one-click order fulfillment.",
    tip: "Best for managing multiple stores or high volume. Their product research tool finds trending items automatically.",
  },
  {
    name: "DSers",
    url: "https://www.dsers.com",
    pricing: "Free (3,000 products), $19.90/mo (Advanced)",
    shipping: "Same as AliExpress suppliers",
    bestFor: "AliExpress integration, bulk ordering, Shopify users",
    accent: "#4ECDC4",
    description:
      "Official AliExpress dropshipping partner. Bulk order processing, supplier optimizer, automatic tracking sync, and variant mapping.",
    tip: "If you use AliExpress suppliers, DSers is a must. The bulk ordering feature saves significant time at scale.",
  },
] as const;

const SUGGESTED_QUESTIONS = [
  "What's the best niche for beginners?",
  "How much should I budget to start?",
  "How do I handle returns?",
  "What's a good ROAS target?",
] as const;

const COMMON_MISTAKES = [
  {
    title: "Choosing oversaturated products",
    detail:
      "Products like generic fidget spinners or undifferentiated phone cases are flooded with sellers competing on price. Instead, find a unique angle — solve a specific problem, target a specific audience, or offer a bundled value proposition that competitors don't.",
  },
  {
    title: "Underpricing products",
    detail:
      "Many beginners set prices based only on product cost + small markup. You need to account for advertising costs ($5–$15 per sale typical), platform transaction fees (2.9% + $0.30 for Stripe), returns (budget 5–10% of revenue), and your time. A product that costs $8 and sells for $15 is usually unprofitable after ads.",
  },
  {
    title: "Poor supplier vetting",
    detail:
      "Always order samples before listing a product. Check supplier ratings (4.5+ stars), read recent reviews, test shipping speed to your target market, and evaluate product quality firsthand. One bad supplier can generate chargebacks and tank your store reputation.",
  },
  {
    title: "Ignoring shipping times",
    detail:
      "Customers expect to know when their order arrives. If shipping takes 15–30 days, clearly state the estimated delivery window on your product page and in order confirmation emails. Consider using suppliers with local warehouses (US/EU) for your best-selling products.",
  },
  {
    title: "No customer service plan",
    detail:
      "Respond to every customer inquiry within 24 hours. Have templates ready for common questions: order status, shipping delays, returns, and refunds. A simple FAQ page on your store prevents most support tickets. Unhappy customers leave bad reviews and file chargebacks.",
  },
  {
    title: "Copying competitor stores exactly",
    detail:
      "Duplicating a competitor's product listings, images, and descriptions signals low quality to customers and search engines. Instead, write original descriptions emphasizing benefits, use unique lifestyle photos (or order samples for your own photos), and develop a distinct brand voice.",
  },
  {
    title: "Giving up too early",
    detail:
      "Most first products don't become winners. Successful dropshippers test 3–5 products before finding one that converts. Budget for at least $200–$500 in ad testing. Analyze your data — if a product gets clicks but no sales, the issue might be your product page, pricing, or shipping times, not the product itself.",
  },
  {
    title: "Not tracking metrics",
    detail:
      "Key metrics to track: Return on Ad Spend (ROAS — aim for 2x+), Customer Acquisition Cost (CAC), Customer Lifetime Value (LTV), conversion rate (2–3% is good for cold traffic), cart abandonment rate, and net profit margin. Without data, you're guessing.",
  },
] as const;

/* ─── page component ─────────────────────────────────────── */

export default function DropshippingGuidePage() {
  const [activeSection, setActiveSection] = useState("what-is-dropshipping");
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({ step1: true });
  const [expandedMistakes, setExpandedMistakes] = useState<Record<number, boolean>>({});

  /* profit calculator state */
  const [calc, setCalc] = useState<CalcInputs>({
    productCost: 8.0,
    shippingCost: 3.5,
    sellingPrice: 29.99,
    adSpend: 7.0,
    platformFee: 2.9,
    monthlyVolume: 100,
  });

  /* AI advisor state */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* ── intersection observer for TOC highlight ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const s of TOC_SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  /* ── accordion helpers ── */
  const toggleStep = useCallback((key: string) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleMistake = useCallback((idx: number) => {
    setExpandedMistakes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  /* ── profit calculations ── */
  const results = useMemo(() => {
    const platformFeeAmount = calc.sellingPrice * (calc.platformFee / 100);
    const stripeFlatFee = 0.3;
    const totalCost = calc.productCost + calc.shippingCost + calc.adSpend + platformFeeAmount + stripeFlatFee;
    const profitPerUnit = calc.sellingPrice - totalCost;
    const marginPct = calc.sellingPrice > 0 ? (profitPerUnit / calc.sellingPrice) * 100 : 0;
    const monthlyRevenue = calc.sellingPrice * calc.monthlyVolume;
    const monthlyProfit = profitPerUnit * calc.monthlyVolume;
    const annualProfit = monthlyProfit * 12;
    const breakEvenROAS = calc.adSpend > 0 ? calc.sellingPrice / calc.adSpend : 0;
    const status: "green" | "yellow" | "red" =
      marginPct >= 20 ? "green" : marginPct >= 0 ? "yellow" : "red";
    return { profitPerUnit, marginPct, monthlyRevenue, monthlyProfit, annualProfit, breakEvenROAS, totalCost, platformFeeAmount, stripeFlatFee, status };
  }, [calc]);

  /* ── AI chat ── */
  const sendChat = useCallback(
    async (question: string) => {
      if (!question.trim()) return;
      setChatMessages((m) => [...m, { role: "user", text: question.trim() }]);
      setChatInput("");
      setChatLoading(true);
      try {
        const r = await fetch("/api/commerce/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "advice", question: question.trim() }),
        });
        const json = await r.json();
        setChatMessages((m) => [
          ...m,
          {
            role: "assistant",
            text:
              json.answer ||
              json.message ||
              "I can help with that! Try rephrasing your question or check the guide sections above for detailed information.",
          },
        ]);
      } catch {
        setChatMessages((m) => [
          ...m,
          { role: "assistant", text: "Couldn't reach the server. Please try again in a moment." },
        ]);
      }
      setChatLoading(false);
    },
    []
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /* ─── render ────────────────────────────────────────────── */

  return (
    <FeatureGate feature="ecommerce">
      <main className="xom3-home">
        <div
          className="xom3-container"
          style={{ paddingTop: 22, paddingBottom: 80, display: "flex", gap: 32, alignItems: "flex-start" }}
        >
          {/* ═══ STICKY TOC SIDEBAR (desktop only) ═══ */}
          <nav
            style={{
              position: "sticky",
              top: 80,
              width: 210,
              flexShrink: 0,
              display: "none",
              flexDirection: "column",
              gap: 2,
              // show on desktop via media query injected below
            }}
            className="ds-toc-sidebar"
          >
            <div
              className="xom3-mono"
              style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}
            >
              ON THIS PAGE
            </div>
            {TOC_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  display: "block",
                  padding: "7px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: activeSection === s.id ? 600 : 400,
                  color: activeSection === s.id ? "#0a84ff" : "rgba(255,255,255,0.5)",
                  background: activeSection === s.id ? "rgba(10,132,255,0.08)" : "transparent",
                  borderLeft: activeSection === s.id ? "2px solid #0a84ff" : "2px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>

          {/* ═══ MAIN CONTENT ═══ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ── Header ── */}
            <header style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <CommercePageActions />
              </div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
                DROPSHIPPING
              </div>
              <h1 style={{ margin: "10px 0 8px", fontSize: 32, fontWeight: 860, letterSpacing: "-0.02em" }}>
                Dropshipping Guide
              </h1>
              <p className="xom3-subtle" style={{ margin: 0, maxWidth: 640, fontSize: 15, lineHeight: 1.6 }}>
                Everything you need to start selling without inventory
              </p>
            </header>

            {/* ═══════════════════════════════════════════════════════════
                SECTION 1: WHAT IS DROPSHIPPING?
            ═══════════════════════════════════════════════════════════ */}
            <section id="what-is-dropshipping" className="xom3-section" style={{ marginBottom: 40 }}>
              <SectionHeading number={1} title="What is Dropshipping?" />

              <div style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.78)", marginBottom: 20 }}>
                <p style={{ margin: "0 0 14px" }}>
                  Dropshipping is a retail fulfillment method where you sell products to customers without holding any
                  inventory. When a customer places an order on your online store, you purchase the item from a
                  third-party supplier who ships it directly to the customer. You never see or handle the product
                  yourself — your role is marketing, customer service, and building the brand.
                </p>
                <p style={{ margin: 0 }}>
                  This model has become one of the most accessible ways to start an e-commerce business because it
                  eliminates the need for upfront inventory investment, warehouse space, and fulfillment logistics. You
                  focus on finding winning products, driving traffic, and converting visitors into buyers while suppliers
                  handle production and shipping.
                </p>
              </div>

              {/* ── How It Works: 3-Step Flow ── */}
              <div
                className="xom3-glass xom3-glassEdge"
                style={{
                  padding: 24,
                  borderRadius: 14,
                  marginBottom: 24,
                }}
              >
                <div
                  className="xom3-mono"
                  style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--text-2)", marginBottom: 16 }}
                >
                  HOW IT WORKS
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    { icon: "🛒", label: "Customer Orders", sub: "from your store" },
                    { icon: "📋", label: "You Forward Order", sub: "to supplier" },
                    { icon: "📦", label: "Supplier Ships", sub: "direct to customer" },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          padding: "12px 16px",
                          minWidth: 130,
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            background: "rgba(10,132,255,0.1)",
                            border: "1px solid rgba(10,132,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 26,
                            marginBottom: 10,
                          }}
                        >
                          {step.icon}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{step.label}</div>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>{step.sub}</div>
                      </div>
                      {i < 2 && (
                        <div
                          style={{
                            fontSize: 20,
                            color: "rgba(10,132,255,0.5)",
                            padding: "0 4px",
                            flexShrink: 0,
                          }}
                        >
                          →
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Pros & Cons ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
                {/* Pros */}
                <div
                  className="xom3-glass xom3-glassEdge"
                  style={{ padding: 20, borderRadius: 14, borderLeft: "3px solid #22c55e" }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#22c55e" }}>Advantages</div>
                  {[
                    "No inventory costs — suppliers hold all stock",
                    "Low startup cost ($0–$500 to launch)",
                    "Location independent — run from anywhere",
                    "Wide product selection — millions of items available",
                    "Easy to test products before committing",
                    "Highly scalable without warehouse constraints",
                  ].map((pro, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <span style={{ color: "#22c55e", fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                        ✓
                      </span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{pro}</span>
                    </div>
                  ))}
                </div>

                {/* Cons */}
                <div
                  className="xom3-glass xom3-glassEdge"
                  style={{ padding: 20, borderRadius: 14, borderLeft: "3px solid #ef4444" }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: "#ef4444" }}>Challenges</div>
                  {[
                    "Lower margins (typically 15–30% net)",
                    "Shipping times can be long (15–45 days from China)",
                    "Less control over product quality and packaging",
                    "Supplier reliability issues (stockouts, errors)",
                    "High competition in popular niches",
                  ].map((con, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <span style={{ color: "#ef4444", fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                        ✕
                      </span>
                      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{con}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Realistic Expectations Callout ── */}
              <div
                style={{
                  padding: "18px 22px",
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>
                    Realistic Expectations
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.6 }}>
                    Dropshipping is a real business, not a get-rich-quick scheme. Most successful stores take 3–6 months
                    to become consistently profitable. Expect to test multiple products, refine your marketing, and
                    learn from early failures. The sellers who succeed are the ones who treat it like a business from day
                    one.
                  </div>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                SECTION 2: STEP-BY-STEP SETUP GUIDE
            ═══════════════════════════════════════════════════════════ */}
            <section id="setup-guide" className="xom3-section" style={{ marginBottom: 40 }}>
              <SectionHeading number={2} title="Step-by-Step Setup Guide" />

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* ── STEP 1: Choose Your Niche ── */}
                <AccordionCard
                  stepNum={1}
                  title="Choose Your Niche"
                  expanded={!!expandedSteps.step1}
                  onToggle={() => toggleStep("step1")}
                >
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 16px" }}>
                    Your niche determines everything — who you market to, what products you sell, and how you position
                    your brand. A well-chosen niche has passionate buyers, solvable problems, and room for a newcomer.
                  </p>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#f7f8ff" }}>
                    Niche Selection Criteria
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {[
                      { label: "Passionate audience", desc: "People who identify with the niche and buy emotionally" },
                      { label: "$20–$80 price sweet spot", desc: "Low enough for impulse buys, high enough for profit" },
                      { label: "Not dominated by big brands", desc: "Avoid categories where Amazon/Walmart dominate" },
                      { label: "Solves a real problem", desc: "Problem-solving products convert better than wants" },
                      { label: "Year-round demand", desc: "Avoid purely seasonal niches unless you plan for off-season" },
                    ].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "rgba(10,132,255,0.15)",
                            color: "#0a84ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "#f7f8ff" }}>{c.label}</span>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}> — {c.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Example Profitable Niches</div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {[
                      "Pet Accessories",
                      "Home Organization",
                      "Fitness Accessories",
                      "Phone Accessories",
                      "Car Accessories",
                      "Eco-Friendly Products",
                      "Baby & Toddler",
                      "Kitchen Gadgets",
                      "LED Lighting",
                      "Desk & Office Gear",
                    ].map((niche) => (
                      <span
                        key={niche}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: "rgba(10,132,255,0.08)",
                          border: "1px solid rgba(10,132,255,0.15)",
                          fontSize: 12,
                          fontWeight: 500,
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {niche}
                      </span>
                    ))}
                  </div>

                  <Link
                    href="/commerce/research"
                    className="xom3-btn xom3-btnPrimary"
                    style={{ fontSize: 13, display: "inline-flex" }}
                  >
                    Open Product Research Tool →
                  </Link>
                </AccordionCard>

                {/* ── STEP 2: Find Reliable Suppliers ── */}
                <AccordionCard
                  stepNum={2}
                  title="Find Reliable Suppliers"
                  expanded={!!expandedSteps.step2}
                  onToggle={() => toggleStep("step2")}
                >
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 20px" }}>
                    Your supplier is your business partner. Reliable suppliers mean happy customers, fewer refunds, and a
                    sustainable business. Here are the top vetted platforms used by successful dropshippers worldwide.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {SUPPLIERS.map((sup) => (
                      <div
                        key={sup.name}
                        className="xom3-glass xom3-glassEdge"
                        style={{
                          padding: 20,
                          borderRadius: 12,
                          borderLeft: `3px solid ${sup.accent}`,
                          transition: "border-color 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ fontSize: 16, fontWeight: 800, color: sup.accent }}>{sup.name}</div>
                          <a
                            href={sup.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: sup.accent,
                              textDecoration: "none",
                              padding: "4px 14px",
                              borderRadius: 6,
                              border: `1px solid ${sup.accent}40`,
                              background: `${sup.accent}10`,
                              transition: "background 0.2s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = `${sup.accent}25`)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = `${sup.accent}10`)}
                          >
                            Visit ↗
                          </a>
                        </div>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: "0 0 14px" }}>
                          {sup.description}
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                            gap: 10,
                            marginBottom: 12,
                          }}
                        >
                          <InfoChip label="Pricing" value={sup.pricing} />
                          <InfoChip label="Shipping" value={sup.shipping} />
                          <InfoChip label="Best For" value={sup.bestFor} />
                        </div>
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            background: "rgba(245,158,11,0.06)",
                            border: "1px solid rgba(245,158,11,0.12)",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.6)",
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#f59e0b" }}>Tip: </span>
                          {sup.tip}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionCard>

                {/* ── STEP 3: Set Up Your Store ── */}
                <AccordionCard
                  stepNum={3}
                  title="Set Up Your Store"
                  expanded={!!expandedSteps.step3}
                  onToggle={() => toggleStep("step3")}
                >
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 16px" }}>
                    Your store is your storefront — it needs to look professional and trustworthy. XOM3 Commerce gives you
                    everything you need to create a high-converting store without external platforms.
                  </p>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Essential Store Pages</div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: 8,
                      marginBottom: 18,
                    }}
                  >
                    {[
                      { icon: "🏠", name: "Homepage", desc: "Your brand's first impression" },
                      { icon: "📦", name: "Product Pages", desc: "Detailed, benefit-focused listings" },
                      { icon: "ℹ️", name: "About Us", desc: "Build trust and tell your story" },
                      { icon: "💬", name: "Contact Page", desc: "Easy way to reach you" },
                      { icon: "🚚", name: "Shipping Policy", desc: "Clear delivery expectations" },
                      { icon: "↩️", name: "Returns Policy", desc: "30-day return standard" },
                      { icon: "🔒", name: "Privacy Policy", desc: "Required by law in most regions" },
                    ].map((p) => (
                      <div
                        key={p.name}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div style={{ fontSize: 18, marginBottom: 6 }}>{p.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href="/commerce" className="xom3-btn xom3-btnPrimary" style={{ fontSize: 13 }}>
                      Open Commerce Setup →
                    </Link>
                  </div>
                </AccordionCard>

                {/* ── STEP 4: Product Listing Best Practices ── */}
                <AccordionCard
                  stepNum={4}
                  title="Product Listing Best Practices"
                  expanded={!!expandedSteps.step4}
                  onToggle={() => toggleStep("step4")}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
                    {[
                      {
                        title: "Write compelling titles",
                        desc: "Include the primary keyword + key benefit. Example: \"Ergonomic Lumbar Support Pillow — Instant Back Pain Relief\" is better than \"Pillow for Back.\"",
                      },
                      {
                        title: "Use high-quality images",
                        desc: "Request product photos from your supplier, or order a sample and photograph it yourself. Include lifestyle shots, multiple angles, and size reference images. White background + lifestyle = best combo.",
                      },
                      {
                        title: "Write benefit-focused descriptions",
                        desc: "Don't list features — explain how those features help the customer. \"Memory foam contours to your spine\" → \"Wake up pain-free every morning.\" Use bullet points for scanability.",
                      },
                      {
                        title: "Set competitive pricing",
                        desc: "Research competitor prices on Amazon, Etsy, and niche stores. Price within the expected range but emphasize your unique value (faster shipping, bundle offers, better support).",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "rgba(10,132,255,0.12)",
                            color: "#0a84ff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#f7f8ff", marginBottom: 3 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Link href="/commerce/products" className="xom3-btn xom3-btnPrimary" style={{ fontSize: 13 }}>
                      Create Products with AI Assist →
                    </Link>
                  </div>

                  {/* SpaceBaddie Video Tip */}
                  <div
                    style={{
                      marginTop: 18,
                      padding: "16px 18px",
                      borderRadius: 12,
                      background: SB_GRADIENT_SUBTLE,
                      border: `1px solid ${SB_BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      <span style={{ background: SB_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Video Marketing Tip
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 10 }}>
                      Create product showcase videos with SpaceBaddie AI Studio. AI-generated video content converts 2–3x
                      better than static images on social media platforms.
                    </div>
                    <Link
                      href="/spacebaddie/studio"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#fff",
                        textDecoration: "none",
                        padding: "6px 16px",
                        borderRadius: 8,
                        background: SB_GRADIENT,
                        display: "inline-block",
                      }}
                    >
                      Open SpaceBaddie Studio →
                    </Link>
                  </div>
                </AccordionCard>

                {/* ── STEP 5: Pricing Strategy ── */}
                <AccordionCard
                  stepNum={5}
                  title="Pricing Strategy"
                  expanded={!!expandedSteps.step5}
                  onToggle={() => toggleStep("step5")}
                >
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: "0 0 16px" }}>
                    Pricing is one of the biggest factors in dropshipping profitability. Use this formula as your
                    starting point:
                  </p>

                  <div
                    className="xom3-glass xom3-glassEdge"
                    style={{
                      padding: 18,
                      borderRadius: 12,
                      marginBottom: 18,
                      textAlign: "center",
                    }}
                  >
                    <div
                      className="xom3-mono"
                      style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.06em", marginBottom: 8 }}
                    >
                      PRICING FORMULA
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#0a84ff", letterSpacing: "-0.01em" }}>
                      Product Cost + Shipping + (2–3x Markup) = Retail Price
                    </div>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Example Calculation</div>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontSize: 13,
                      lineHeight: 2,
                      color: "rgba(255,255,255,0.7)",
                      marginBottom: 16,
                    }}
                  >
                    <div>Product cost from supplier: <strong style={{ color: "#f7f8ff" }}>$8.00</strong></div>
                    <div>Shipping cost: <strong style={{ color: "#f7f8ff" }}>$3.50</strong></div>
                    <div>Your total cost: <strong style={{ color: "#f7f8ff" }}>$11.50</strong></div>
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
                    <div>With 2.5x markup: $11.50 × 2.5 = <strong style={{ color: "#22c55e" }}>$28.75 → Round to $29.99</strong></div>
                    <div>Profit before ads: $29.99 − $11.50 = <strong style={{ color: "#22c55e" }}>$18.49 per unit</strong></div>
                    <div>After $7 ad spend + fees: <strong style={{ color: "#22c55e" }}>~$10.62 net profit per sale</strong></div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {[
                      "Factor in platform transaction fees (Stripe: 2.9% + $0.30 per transaction)",
                      "Budget 5–10% of revenue for returns and refunds",
                      "Account for advertising costs ($5–$15 per conversion is typical)",
                      "Minimum profit margin target: 30–40% after all costs",
                    ].map((t, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ color: "#f59e0b", fontSize: 13, flexShrink: 0 }}>•</span>
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{t}</span>
                      </div>
                    ))}
                  </div>

                  <a
                    href="#profit-calculator"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("profit-calculator")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="xom3-btn xom3-btnPrimary"
                    style={{ fontSize: 13, display: "inline-flex", textDecoration: "none" }}
                  >
                    Use Profit Calculator Below ↓
                  </a>
                </AccordionCard>

                {/* ── STEP 6: Order Fulfillment ── */}
                <AccordionCard
                  stepNum={6}
                  title="Order Fulfillment"
                  expanded={!!expandedSteps.step6}
                  onToggle={() => toggleStep("step6")}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Fulfillment Flow</div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    {[
                      "Customer places order",
                      "You receive notification",
                      "Forward order to supplier",
                      "Supplier ships to customer",
                      "Provide tracking number",
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: "rgba(10,132,255,0.08)",
                            border: "1px solid rgba(10,132,255,0.12)",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "rgba(255,255,255,0.7)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s}
                        </span>
                        {i < 4 && <span style={{ color: "rgba(10,132,255,0.4)", fontSize: 14 }}>→</span>}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Handling Returns & Refunds</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 16 }}>
                    Offer a clear 30-day return policy. For low-value items (under $15), it&apos;s often more cost-effective
                    to refund and let the customer keep the item rather than paying return shipping. For higher-value
                    items, have the customer ship to your address (not the supplier), inspect it, and then process the
                    refund. Keep customer communication proactive — send status updates before they ask.
                  </div>

                  <Link href="/commerce/orders" className="xom3-btn xom3-btnPrimary" style={{ fontSize: 13 }}>
                    Open Order Management →
                  </Link>
                </AccordionCard>

                {/* ── STEP 7: Marketing Your Products ── */}
                <AccordionCard
                  stepNum={7}
                  title="Marketing Your Products"
                  expanded={!!expandedSteps.step7}
                  onToggle={() => toggleStep("step7")}
                >
                  {/* Organic */}
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#22c55e" }}>
                    Organic Strategies (Free)
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {[
                      {
                        platform: "TikTok",
                        tactics: "Product demos, trending sounds, before/after reveals, UGC-style content. Post 1–3 times daily. Use hooks in first 2 seconds.",
                        cost: "Free",
                      },
                      {
                        platform: "Instagram Reels",
                        tactics: "Product showcases, lifestyle content, customer testimonials. Use relevant hashtags (mix broad + niche). Post Reels daily for algorithm boost.",
                        cost: "Free",
                      },
                      {
                        platform: "Pinterest",
                        tactics: "Product pins with SEO-optimized descriptions. Pinterest is a search engine — target long-tail keywords. Create infographic-style pins for higher saves.",
                        cost: "Free",
                      },
                      {
                        platform: "SEO & Blogging",
                        tactics: "Write how-to articles, buying guides, and comparison posts targeting product-related keywords. Drives free organic traffic over time. Focus on long-tail keywords with buyer intent.",
                        cost: "Free (time investment)",
                      },
                    ].map((s) => (
                      <div
                        key={s.platform}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 10,
                          background: "rgba(34,197,94,0.04)",
                          border: "1px solid rgba(34,197,94,0.1)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f7f8ff" }}>{s.platform}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#22c55e",
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(34,197,94,0.1)",
                            }}
                          >
                            {s.cost}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>{s.tactics}</div>
                      </div>
                    ))}
                  </div>

                  {/* Paid */}
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "#0a84ff" }}>
                    Paid Strategies
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                    {[
                      {
                        platform: "Facebook / Instagram Ads",
                        tactics: "Start with $5–$10/day per ad set. Test 3–5 different creatives (videos perform best). Use Advantage+ Shopping campaigns for broad targeting. Kill ads with less than 1% CTR after $20 spent.",
                        budget: "$5–$10/day to start",
                      },
                      {
                        platform: "TikTok Ads",
                        tactics: "Spark Ads (boost organic posts) for authentic feel. Use $20/day minimum budget. Creative is everything — make ads look like native TikTok content. Target ages 18–45 based on your product.",
                        budget: "$20/day minimum",
                      },
                      {
                        platform: "Google Shopping Ads",
                        tactics: "Best for high-intent buyers actively searching for your product. Requires Google Merchant Center setup. Higher conversion rate than social ads but more technical to set up. Start with Performance Max campaigns.",
                        budget: "$10–$20/day",
                      },
                    ].map((s) => (
                      <div
                        key={s.platform}
                        style={{
                          padding: "14px 16px",
                          borderRadius: 10,
                          background: "rgba(10,132,255,0.04)",
                          border: "1px solid rgba(10,132,255,0.1)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#f7f8ff" }}>{s.platform}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#0a84ff",
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "rgba(10,132,255,0.1)",
                            }}
                          >
                            {s.budget}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", lineHeight: 1.6 }}>{s.tactics}</div>
                      </div>
                    ))}
                  </div>

                  {/* SpaceBaddie Video Marketing */}
                  <div
                    style={{
                      padding: 22,
                      borderRadius: 14,
                      background: SB_GRADIENT_SUBTLE,
                      border: `1px solid ${SB_BORDER}`,
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                      <span style={{ background: SB_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        SpaceBaddie Video Marketing
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.68)", lineHeight: 1.7, margin: "0 0 14px" }}>
                      Create AI-powered marketing videos for your products. SpaceBaddie Studio lets you create unlimited
                      marketing videos with AI avatars, custom voices, and cinematic effects — perfect for product ads
                      that convert.
                    </p>

                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "rgba(255,255,255,0.8)" }}>
                      Video Types You Can Create:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                      {[
                        "Product Showcases (9:16 for TikTok/Reels)",
                        "Unboxing Videos",
                        "How-to / Tutorial Videos",
                        "Before & After Comparisons",
                        "Customer Testimonial Style",
                      ].map((v) => (
                        <span
                          key={v}
                          style={{
                            padding: "5px 12px",
                            borderRadius: 16,
                            background: "rgba(138,43,226,0.12)",
                            border: "1px solid rgba(138,43,226,0.2)",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link
                        href="/spacebaddie/studio"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#fff",
                          textDecoration: "none",
                          padding: "10px 20px",
                          borderRadius: 10,
                          background: SB_GRADIENT,
                          display: "inline-block",
                        }}
                      >
                        Create Marketing Videos →
                      </Link>
                      <a
                        href="https://spacebaddie.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#8A2BE2",
                          textDecoration: "none",
                          padding: "10px 20px",
                          borderRadius: 10,
                          border: `1px solid ${SB_BORDER}`,
                          display: "inline-block",
                        }}
                      >
                        Learn More About SpaceBaddie ↗
                      </a>
                    </div>
                  </div>
                </AccordionCard>

                {/* ── STEP 8: Scaling Your Business ── */}
                <AccordionCard
                  stepNum={8}
                  title="Scaling Your Business"
                  expanded={!!expandedSteps.step8}
                  onToggle={() => toggleStep("step8")}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#22c55e" }}>
                    When to Scale
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 16 }}>
                    Scale when you have consistent daily revenue of $50+ for at least 7 days, a positive ROAS (return on
                    ad spend) of 2x or higher, and a tested fulfillment process that runs smoothly. Premature scaling on
                    an unoptimized funnel wastes money.
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>How to Scale</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {[
                      {
                        title: "Increase ad budget gradually",
                        desc: "Raise budget by 20% per day maximum. Sudden large increases confuse the ad algorithm and spike your cost per acquisition.",
                      },
                      {
                        title: "Expand product catalog",
                        desc: "Add complementary products to your winners. If a posture corrector sells well, add resistance bands, yoga mats, and massage balls.",
                      },
                      {
                        title: "Implement upsells and bundles",
                        desc: "Post-purchase upsells can increase average order value by 20–30%. Offer a discount on a related product right after checkout.",
                      },
                      {
                        title: "Test new advertising platforms",
                        desc: "If Facebook works, test TikTok. If social ads work, try Google Shopping for high-intent traffic. Diversify to reduce platform risk.",
                      },
                      {
                        title: "Automate fulfillment",
                        desc: "Use auto-fulfillment tools (AutoDS, DSers, Zendrop) to process orders without manual intervention. Set up automated email sequences for order confirmation, shipping updates, and review requests.",
                      },
                      {
                        title: "Hire when ready",
                        desc: "When customer service takes 2+ hours daily, hire a virtual assistant ($4–$8/hr on OnlineJobs.ph or Upwork). Focus your time on marketing and product research.",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            background: "rgba(34,197,94,0.12)",
                            color: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#f7f8ff", marginBottom: 2 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionCard>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                SECTION 3: PROFIT CALCULATOR
            ═══════════════════════════════════════════════════════════ */}
            <section id="profit-calculator" className="xom3-section" style={{ marginBottom: 40 }}>
              <SectionHeading number={3} title="Profit Calculator" />

              <div className="xom3-glass xom3-glassEdge" style={{ padding: 24, borderRadius: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                  <CalcField
                    label="Product Cost ($)"
                    value={calc.productCost}
                    onChange={(v) => setCalc((p) => ({ ...p, productCost: v }))}
                  />
                  <CalcField
                    label="Shipping Cost ($)"
                    value={calc.shippingCost}
                    onChange={(v) => setCalc((p) => ({ ...p, shippingCost: v }))}
                  />
                  <CalcField
                    label="Selling Price ($)"
                    value={calc.sellingPrice}
                    onChange={(v) => setCalc((p) => ({ ...p, sellingPrice: v }))}
                  />
                  <CalcField
                    label="Ad Spend Per Sale ($)"
                    value={calc.adSpend}
                    onChange={(v) => setCalc((p) => ({ ...p, adSpend: v }))}
                  />
                  <CalcField
                    label="Platform Fees (%)"
                    value={calc.platformFee}
                    onChange={(v) => setCalc((p) => ({ ...p, platformFee: v }))}
                    step={0.1}
                  />
                  <CalcField
                    label="Monthly Order Volume"
                    value={calc.monthlyVolume}
                    onChange={(v) => setCalc((p) => ({ ...p, monthlyVolume: Math.round(v) }))}
                    step={1}
                    min={0}
                  />
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />

                {/* Results */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 12,
                  }}
                >
                  <ResultCard
                    label="Profit Per Unit"
                    value={`$${results.profitPerUnit.toFixed(2)}`}
                    status={results.status}
                  />
                  <ResultCard
                    label="Profit Margin"
                    value={`${results.marginPct.toFixed(1)}%`}
                    status={results.status}
                  />
                  <ResultCard
                    label="Break-Even ROAS"
                    value={`${results.breakEvenROAS.toFixed(2)}x`}
                    status={results.breakEvenROAS <= 3 ? "green" : results.breakEvenROAS <= 5 ? "yellow" : "red"}
                  />
                  <ResultCard
                    label="Monthly Revenue"
                    value={`$${results.monthlyRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    status="neutral"
                  />
                  <ResultCard
                    label="Monthly Profit"
                    value={`$${results.monthlyProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    status={results.status}
                  />
                  <ResultCard
                    label="Annual Projected"
                    value={`$${results.annualProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    status={results.status}
                  />
                </div>

                {/* Cost Breakdown */}
                <div
                  style={{
                    marginTop: 20,
                    padding: "14px 18px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.8,
                  }}
                >
                  <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Cost Breakdown Per Unit: </span>
                  Product ${calc.productCost.toFixed(2)} + Shipping ${calc.shippingCost.toFixed(2)} + Ads ${calc.adSpend.toFixed(2)} + Platform Fee ${results.platformFeeAmount.toFixed(2)} + Stripe Flat ${results.stripeFlatFee.toFixed(2)} = <strong style={{ color: "#f7f8ff" }}>${results.totalCost.toFixed(2)} total cost</strong>
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                SECTION 4: COMMON MISTAKES
            ═══════════════════════════════════════════════════════════ */}
            <section id="common-mistakes" className="xom3-section" style={{ marginBottom: 40 }}>
              <SectionHeading number={4} title="Common Mistakes to Avoid" />

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {COMMON_MISTAKES.map((m, i) => (
                  <div
                    key={i}
                    className="xom3-glass xom3-glassEdge"
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      transition: "border-color 0.2s",
                      borderLeft: "3px solid rgba(239,68,68,0.4)",
                    }}
                  >
                    <button
                      onClick={() => toggleMistake(i)}
                      style={{
                        width: "100%",
                        background: "none",
                        border: "none",
                        padding: "14px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                        textAlign: "left",
                        color: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#f7f8ff" }}>{m.title}</span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-2)",
                          transition: "transform 0.25s ease",
                          transform: expandedMistakes[i] ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      style={{
                        maxHeight: expandedMistakes[i] ? 300 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.3s cubic-bezier(.4,0,.2,1)",
                      }}
                    >
                      <div
                        style={{
                          padding: "0 18px 16px 56px",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.6)",
                          lineHeight: 1.7,
                        }}
                      >
                        {m.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════
                SECTION 5: AI ADVISOR
            ═══════════════════════════════════════════════════════════ */}
            <section id="ai-advisor" className="xom3-section" style={{ marginBottom: 20 }}>
              <SectionHeading number={5} title="AI Advisor" />

              <div className="xom3-glass xom3-glassEdge" style={{ borderRadius: 14, overflow: "hidden" }}>
                {/* Chat messages area */}
                <div
                  style={{
                    minHeight: 180,
                    maxHeight: 360,
                    overflowY: "auto",
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {chatMessages.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "32px 16px",
                        color: "var(--text-2)",
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 10 }}>💬</div>
                      Ask anything about dropshipping — niches, suppliers, marketing, pricing, or scaling.
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%",
                        padding: "10px 16px",
                        borderRadius: 14,
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        ...(m.role === "user"
                          ? {
                              background: "rgba(10,132,255,0.15)",
                              color: "#f7f8ff",
                              borderBottomRightRadius: 4,
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              color: "#c5c8d4",
                              borderBottomLeftRadius: 4,
                            }),
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && (
                    <div
                      style={{
                        alignSelf: "flex-start",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--text-2)",
                        fontSize: 13,
                      }}
                    >
                      <Spinner size={14} /> Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested questions */}
                {chatMessages.length === 0 && (
                  <div style={{ padding: "0 20px 14px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendChat(q)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 20,
                          background: "rgba(10,132,255,0.08)",
                          border: "1px solid rgba(10,132,255,0.15)",
                          color: "#0a84ff",
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(10,132,255,0.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(10,132,255,0.08)")}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div
                  style={{
                    padding: "14px 20px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <input
                    className="xom3-input"
                    placeholder="Ask anything about dropshipping..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !chatLoading && sendChat(chatInput)}
                    style={{
                      flex: 1,
                      fontSize: 13,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#f7f8ff",
                      outline: "none",
                    }}
                  />
                  <button
                    className="xom3-btn xom3-btnPrimary"
                    onClick={() => sendChat(chatInput)}
                    disabled={chatLoading || !chatInput.trim()}
                    style={{
                      fontSize: 13,
                      padding: "10px 18px",
                      opacity: chatLoading || !chatInput.trim() ? 0.5 : 1,
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ═══ RESPONSIVE STYLES ═══ */}
        <style>{`
          @media (min-width: 900px) {
            .ds-toc-sidebar {
              display: flex !important;
            }
          }
          @keyframes xom3Spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    </FeatureGate>
  );
}

/* ─── sub-components ──────────────────────────────────────── */

function SectionHeading({ number, title }: { number: number; title: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        className="xom3-mono"
        style={{ fontSize: 11, color: "#0a84ff", letterSpacing: "0.08em", marginBottom: 6 }}
      >
        SECTION {number}
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.015em" }}>{title}</h2>
      <div style={{ width: 40, height: 3, borderRadius: 2, background: "#0a84ff", marginTop: 10, opacity: 0.6 }} />
    </div>
  );
}

function AccordionCard({
  stepNum,
  title,
  expanded,
  onToggle,
  children,
}: {
  stepNum: number;
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="xom3-glass xom3-glassEdge"
      style={{
        borderRadius: 14,
        overflow: "hidden",
        borderLeft: expanded ? "3px solid #0a84ff" : "3px solid rgba(255,255,255,0.08)",
        transition: "border-color 0.3s ease",
      }}
    >
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
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: expanded ? "rgba(10,132,255,0.15)" : "rgba(255,255,255,0.05)",
            color: expanded ? "#0a84ff" : "rgba(255,255,255,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 800,
            flexShrink: 0,
            border: expanded ? "2px solid #0a84ff" : "2px solid rgba(255,255,255,0.08)",
            transition: "all 0.3s ease",
          }}
        >
          {stepNum}
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: "#f7f8ff" }}>
          Step {stepNum}: {title}
        </span>
        <span
          style={{
            fontSize: 14,
            color: "var(--text-2)",
            transition: "transform 0.25s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </button>
      <div
        style={{
          maxHeight: expanded ? 3000 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ padding: "0 20px 20px 64px" }}>{children}</div>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="xom3-mono" style={{ fontSize: 10, color: "var(--text-2)", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function CalcField({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <div>
      <label className="xom3-label" style={{ fontSize: 12, display: "block", marginBottom: 6, color: "rgba(255,255,255,0.55)" }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        title={label}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#f7f8ff",
          fontSize: 15,
          fontWeight: 700,
          outline: "none",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(10,132,255,0.4)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
      />
    </div>
  );
}

function ResultCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "green" | "yellow" | "red" | "neutral";
}) {
  const colorMap = {
    green: { text: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
    yellow: { text: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
    red: { text: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
    neutral: { text: "#0a84ff", bg: "rgba(10,132,255,0.06)", border: "rgba(10,132,255,0.15)" },
  };
  const c = colorMap[status];

  return (
    <div
      style={{
        padding: "16px 14px",
        borderRadius: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        textAlign: "center",
      }}
    >
      <div className="xom3-mono" style={{ fontSize: 10, color: "var(--text-2)", letterSpacing: "0.06em", marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: c.text, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(10,132,255,0.25)",
        borderTopColor: "#0a84ff",
        borderRadius: "50%",
        animation: "xom3Spin 0.7s linear infinite",
      }}
    />
  );
}
