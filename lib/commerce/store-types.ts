// Commerce Engine - Store Engine Type Definitions
// The system that turns products → stores → funnels → ads → orders → revenue

import { ProductObject } from "./types";

export type StoreTheme = "minimal" | "bold" | "elegant" | "modern" | "vintage" | "custom";

export type StoreStatus = "draft" | "building" | "live" | "paused" | "archived";

export interface Store {
  id: string;
  storeId: string;
  domain: string;
  name: string;
  theme: StoreTheme;
  status: StoreStatus;
  branding: StoreBranding;
  collections: StoreCollection[];
  products: StoreProduct[];
  funnels: StoreFunnel[];
  apps: StoreApp[];
  optimizationScore: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface StoreBranding {
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    fontSize: {
      heading: string;
      body: string;
    };
  };
  logo?: {
    url: string;
    alt: string;
  };
  iconography?: {
    style: string;
    set: string;
  };
  brandVoice: {
    tone: "professional" | "casual" | "friendly" | "authoritative" | "playful";
    personality: string[];
  };
}

export interface StoreCollection {
  id: string;
  name: string;
  handle: string;
  type: "category" | "bundle" | "seasonal" | "trend";
  products: string[]; // Product IDs
  description?: string;
  image?: string;
  sortOrder: number;
}

export interface StoreProduct {
  id: string;
  productObjectId: string; // Reference to ProductObject
  title: string;
  handle: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  variants: ProductVariant[];
  images: string[];
  page: ProductPage;
  seo: ProductSEO;
  inventory: ProductInventory;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  hero: ProductHero;
  benefitStack: ProductBenefit[];
  problemSolution: ProblemSolution;
  socialProof: SocialProof;
  guarantee: ProductGuarantee;
  faq: ProductFAQ[];
  urgency: UrgencyModule[];
}

export interface ProductHero {
  headline: string;
  subheadline: string;
  cta: string;
  image: string;
  video?: string;
}

export interface ProductBenefit {
  title: string;
  description: string;
  icon?: string;
}

export interface ProblemSolution {
  problem: string;
  solution: string;
  beforeAfter?: {
    before: string;
    after: string;
  };
}

export interface SocialProof {
  reviews: ProductReview[];
  testimonials: ProductTestimonial[];
  trustBadges: string[];
  socialCounts?: {
    followers: number;
    customers: number;
  };
}

export interface ProductReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  verified: boolean;
  date: string;
}

export interface ProductTestimonial {
  id: string;
  name: string;
  role?: string;
  quote: string;
  image?: string;
}

export interface ProductGuarantee {
  type: "money_back" | "satisfaction" | "lifetime" | "custom";
  description: string;
  duration?: string;
}

export interface ProductFAQ {
  question: string;
  answer: string;
}

export interface UrgencyModule {
  type: "countdown" | "stock" | "price" | "limited";
  message: string;
  expiresAt?: string;
  stockCount?: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  barcode?: string;
  inventory: {
    quantity: number;
    policy: "deny" | "continue";
  };
  options: {
    [key: string]: string; // e.g., { "Size": "Large", "Color": "Blue" }
  };
  image?: string;
  weight?: number;
  requiresShipping: boolean;
}

export interface ProductSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface ProductInventory {
  trackQuantity: boolean;
  quantity: number;
  policy: "deny" | "continue";
  supplier?: {
    id: string;
    name: string;
    syncEnabled: boolean;
  };
}

export interface StoreFunnel {
  id: string;
  name: string;
  type: "landing_page" | "shopify_store" | "direct_link";
  entryPoint: string;
  upsells: string[]; // Product IDs
  downsells: string[]; // Product IDs
  bundles: string[]; // Product IDs
  status: "draft" | "active" | "paused";
}

export interface StoreApp {
  id: string;
  name: string;
  type: "analytics" | "marketing" | "fulfillment" | "customer_service" | "other";
  enabled: boolean;
  config?: Record<string, any>;
}

export interface StoreObject {
  store_id: string;
  domain: string;
  theme: StoreTheme;
  branding: StoreBranding;
  collections: StoreCollection[];
  products: StoreProduct[];
  funnels: StoreFunnel[];
  apps: StoreApp[];
  optimization_score: number;
}
