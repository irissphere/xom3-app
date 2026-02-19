// Commerce Engine - Funnel Engine Type Definitions
// The system that turns traffic → orders → revenue

import { StoreProduct, ProductPage } from "./store-types";
import { ProductObject } from "./types";

export type FunnelType = "landing_page" | "shopify_store" | "direct_link";
export type FunnelStatus = "draft" | "active" | "paused" | "archived";

export interface Funnel {
  id: string;
  funnelId: string;
  productId: string;
  productObjectId: string;
  type: FunnelType;
  status: FunnelStatus;
  landingPage: LandingPage;
  productPage: ProductPage;
  upsells: Upsell[];
  downsells: Downsell[];
  bundles: Bundle[];
  checkout: CheckoutConfig;
  postPurchase: PostPurchaseConfig;
  optimizationScore: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface LandingPage {
  hero: LandingHero;
  problemAgitation: ProblemAgitation;
  solution: SolutionSection;
  benefitStack: BenefitStack[];
  socialProof: LandingSocialProof;
  ctaBlocks: CTABlock[];
  seo: LandingSEO;
}

export interface LandingHero {
  headline: string;
  subheadline: string;
  cta: string;
  ctaSecondary?: string;
  image: string;
  video?: string;
}

export interface ProblemAgitation {
  problem: string;
  agitation: string[]; // Pain points
  emotionalTriggers: string[];
}

export interface SolutionSection {
  headline: string;
  description: string;
  features: string[];
  image?: string;
}

export interface BenefitStack {
  title: string;
  description: string;
  icon?: string;
}

export interface LandingSocialProof {
  testimonials: LandingTestimonial[];
  trustBadges: string[];
  stats?: {
    customers: number;
    reviews: number;
    rating: number;
  };
}

export interface LandingTestimonial {
  name: string;
  role?: string;
  quote: string;
  image?: string;
  rating?: number;
}

export interface CTABlock {
  headline: string;
  description: string;
  cta: string;
  urgency?: string;
}

export interface LandingSEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface Upsell {
  id: string;
  type: "one_click" | "post_purchase" | "cart";
  productId: string;
  title: string;
  description: string;
  price: number;
  discount?: number;
  urgency?: string;
  trigger: "immediate" | "after_add_to_cart" | "after_checkout";
  position: number;
}

export interface Downsell {
  id: string;
  type: "cheaper_variant" | "bundle_discount" | "smaller_size";
  productId: string;
  title: string;
  description: string;
  price: number;
  discount: number;
  trigger: "upsell_declined" | "cart_abandoned";
  position: number;
}

export interface Bundle {
  id: string;
  name: string;
  type: "2_pack" | "3_pack" | "family_pack" | "seasonal";
  products: string[]; // Product IDs
  price: number;
  savings: number;
  description: string;
  image?: string;
}

export interface CheckoutConfig {
  paymentMethods: PaymentMethod[];
  shippingOptions: ShippingOption[];
  trustElements: TrustElement[];
  formOptimization: FormOptimization;
  mobileOptimization: boolean;
  abandonedCartRecovery: boolean;
}

export interface PaymentMethod {
  type: "credit_card" | "paypal" | "apple_pay" | "google_pay" | "shop_pay";
  enabled: boolean;
  priority: number;
}

export interface ShippingOption {
  name: string;
  price: number;
  duration: string;
  enabled: boolean;
  priority: number;
}

export interface TrustElement {
  type: "ssl" | "money_back" | "secure_checkout" | "verified" | "guarantee";
  text: string;
  icon?: string;
}

export interface FormOptimization {
  fields: CheckoutField[];
  autoFill: boolean;
  validation: "real_time" | "on_submit";
  frictionReduction: string[];
}

export interface CheckoutField {
  name: string;
  required: boolean;
  type: "text" | "email" | "phone" | "select" | "checkbox";
  placeholder?: string;
}

export interface PostPurchaseConfig {
  thankYouPage: ThankYouPage;
  crossSell: CrossSell[];
  emailSequence: EmailSequence[];
  smsFollowUp: SMSFollowUp[];
  reviewRequest: ReviewRequest;
}

export interface ThankYouPage {
  headline: string;
  message: string;
  orderDetails: boolean;
  trackingInfo: boolean;
  crossSellEnabled: boolean;
}

export interface CrossSell {
  productId: string;
  title: string;
  description: string;
  price: number;
  discount?: number;
  position: number;
}

export interface EmailSequence {
  id: string;
  trigger: "order_confirmation" | "shipping_notification" | "delivery_confirmation" | "follow_up";
  delay: number; // hours
  subject: string;
  content: string;
  cta?: string;
}

export interface SMSFollowUp {
  id: string;
  trigger: "order_confirmation" | "shipping_notification" | "delivery_confirmation";
  delay: number; // hours
  message: string;
}

export interface ReviewRequest {
  enabled: boolean;
  delay: number; // days after delivery
  platform: "email" | "sms" | "both";
  incentive?: string;
}

export interface FunnelObject {
  funnel_id: string;
  product_id: string;
  landing_page: LandingPage;
  product_page: ProductPage;
  upsells: Upsell[];
  downsells: Downsell[];
  bundles: Bundle[];
  checkout: CheckoutConfig;
  post_purchase: PostPurchaseConfig;
  optimization_score: number;
}
