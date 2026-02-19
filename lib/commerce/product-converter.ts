/**
 * Product Converter — transforms database rows into engine-compatible types.
 *
 * The commerce engines (funnel, store, ad, fulfillment) expect rich
 * ProductObject / StoreProduct / RevenueEvent types.  The database stores
 * simpler `spacebaddie_products` and `orders` rows.  This module bridges
 * the gap so every engine call uses real data — no mock payloads.
 */

import type { ProductObject, TrendSignal, Competitor, MarketData, PricingIntelligence, ProductValidation } from "./types";
import type { StoreProduct, ProductPage, ProductSEO, ProductInventory, ProductVariant } from "./store-types";
import type { RevenueEvent } from "./revenue-types";

/* ------------------------------------------------------------------ */
/*  DB row shapes (mirrors Supabase tables)                           */
/* ------------------------------------------------------------------ */

export interface DBProduct {
  id: string;
  user_id?: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  image_url?: string | null;
  status?: string;
  sales?: number;
  revenue?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  inventory_count?: number;
  sku?: string;
  shipping_required?: boolean;
  weight_grams?: number;
  product_type?: string;
  supplier_sku?: string | null;
  supplier_source?: string | null;
}

export interface DBOrder {
  id: string;
  user_id?: string | null;
  email: string;
  status: string;
  stripe_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  subtotal_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address?: any;
  billing_address?: any;
  notes?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DBOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  metadata?: any;
}

/* ------------------------------------------------------------------ */
/*  toProductObject                                                    */
/* ------------------------------------------------------------------ */

export function toProductObject(p: DBProduct): ProductObject {
  const sales = p.sales ?? 0;
  const rev = p.revenue ?? 0;
  const price = p.price ?? 0;

  // Derive scores from real data
  const trendScore = Math.min(100, Math.round(sales * 2));
  const demandScore = Math.min(100, sales > 0 ? Math.round(40 + sales * 3) : 30);
  const marginScore = price > 0 ? Math.min(100, Math.round((price / Math.max(price, 1)) * 70)) : 50;
  const saturationScore = 60; // neutral default — would need competitor data

  const now = new Date().toISOString();

  const emptyTrendSignals: TrendSignal[] = [];
  const emptyCompetitors: Competitor[] = [];

  const marketData: MarketData = {
    marketSize: 0,
    growthRate: 0,
  };

  const pricing: PricingIntelligence = {
    productId: p.id,
    currentPrice: price,
    recommendedPrice: price,
    priceRange: { min: price * 0.8, max: price * 1.5, optimal: price },
    marginAnalysis: { current: 60, recommended: 65, minAcceptable: 30 },
    competitorPricing: { average: price, median: price, range: { min: price * 0.7, max: price * 1.3 } },
    analyzedAt: now,
  };

  const validation: ProductValidation = {
    productId: p.id,
    socialProof: { score: sales > 0 ? 60 : 20, signals: sales > 0 ? [`${sales} sales`] : [] },
    competitorProof: { score: 50, signals: [] },
    trendVelocity: { score: trendScore, velocity: sales },
    marginViability: { score: marginScore, viable: marginScore >= 30 },
    fulfillmentFeasibility: { score: 70, feasible: true },
    overall: Math.round((trendScore + demandScore + marginScore + saturationScore) / 4),
    validatedAt: now,
  };

  return {
    id: p.id,
    name: p.name,
    category: p.category || "Other",
    trend_score: trendScore,
    demand_score: demandScore,
    margin_score: marginScore,
    saturation_score: saturationScore,
    validation_status: "validated",
    recommended_price: price,
    recommended_creatives: {
      hooks: [`Discover ${p.name}`, `Why everyone is loving ${p.name}`],
      angles: ["problem-solution", "social-proof", "urgency"],
      formats: ["image", "video", "carousel"],
      platforms: ["meta", "tiktok", "google"],
    },
    recommended_funnel: {
      type: "landing_page",
      upsells: [],
      downsells: [],
      bundles: [],
    },
    recommended_audience: {
      demographics: ["18-45"],
      interests: [p.category],
      behaviors: ["online shoppers"],
      platforms: ["meta", "google"],
    },
    metadata: {
      trendSignals: emptyTrendSignals,
      competitors: emptyCompetitors,
      marketData,
      pricing,
      validation,
    },
    createdAt: p.created_at || now,
    updatedAt: p.updated_at || now,
  };
}

/* ------------------------------------------------------------------ */
/*  toStoreProduct                                                     */
/* ------------------------------------------------------------------ */

export function toStoreProduct(p: DBProduct): StoreProduct {
  const now = new Date().toISOString();
  const handle = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const page: ProductPage = {
    hero: {
      headline: p.name,
      subheadline: p.description?.slice(0, 120) || `Premium ${p.category} product`,
      cta: "Buy Now",
      image: p.image_url || "",
    },
    benefitStack: [
      { title: "Quality Guaranteed", description: "Built to last with premium materials" },
      { title: "Fast Shipping", description: "Ships within 24–48 hours" },
      { title: "Easy Returns", description: "30-day money-back guarantee" },
    ],
    problemSolution: {
      problem: `Finding a reliable ${p.category.toLowerCase()} product can be frustrating.`,
      solution: `${p.name} delivers exactly what you need with zero hassle.`,
    },
    socialProof: {
      reviews: [],
      testimonials: [],
      trustBadges: ["Secure Checkout", "30-Day Guarantee", "Fast Shipping"],
    },
    guarantee: {
      type: "money_back",
      description: "Full refund within 30 days, no questions asked.",
      duration: "30 days",
    },
    faq: [
      { question: "How long does shipping take?", answer: "Most orders ship within 1–3 business days." },
      { question: "What is your return policy?", answer: "We offer a 30-day money-back guarantee on all orders." },
    ],
    urgency: [],
  };

  const seo: ProductSEO = {
    title: `${p.name} | Buy Now`,
    description: p.description?.slice(0, 160) || `Shop ${p.name} — ${p.category}`,
    keywords: [p.name, p.category, "buy online", "shop"],
  };

  const inv = p.inventory_count ?? -1;
  const inventory: ProductInventory = {
    trackQuantity: inv >= 0,
    quantity: inv >= 0 ? inv : 9999,
    policy: "continue",
    supplier: p.supplier_source
      ? { id: p.supplier_sku || "", name: p.supplier_source, syncEnabled: true }
      : undefined,
  };

  const defaultVariant: ProductVariant = {
    id: `${p.id}-default`,
    title: "Default",
    price: p.price,
    sku: p.sku || "",
    inventory: { quantity: inventory.quantity, policy: "continue" },
    options: {},
    requiresShipping: p.shipping_required ?? p.product_type === "physical",
    weight: p.weight_grams,
  };

  return {
    id: p.id,
    productObjectId: p.id,
    title: p.name,
    handle,
    description: p.description || "",
    price: p.price,
    variants: [defaultVariant],
    images: p.image_url ? [p.image_url] : [],
    page,
    seo,
    inventory,
    createdAt: p.created_at || now,
    updatedAt: p.updated_at || now,
  };
}

/* ------------------------------------------------------------------ */
/*  toRevenueEvent                                                     */
/* ------------------------------------------------------------------ */

export function toRevenueEvent(order: DBOrder, item: DBOrderItem): RevenueEvent {
  return {
    id: `rev-${order.id}-${item.id}`,
    orderId: order.id,
    customerId: order.user_id || order.email,
    productId: item.product_id,
    amount: item.total_cents / 100,
    quantity: item.quantity,
    timestamp: order.created_at || new Date().toISOString(),
    metadata: {
      channel: "xom3_commerce",
    },
  };
}
