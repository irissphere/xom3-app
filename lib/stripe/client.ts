/**
 * Stripe Integration Client
 * 
 * Handles subscription management, checkout sessions, and customer portal.
 */

import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

// Get or initialize Stripe client
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as any,
      typescript: true,
    });
  }

  return stripeSingleton;
}

// Legacy export for backwards compatibility
export function getStripe(): Stripe | null {
  try {
    return getStripeClient();
  } catch {
    return null;
  }
}

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    priceId: null,
    features: {
      videosPerMonth: 5,
      maxResolution: '720p',
      autoPosting: false,
      crmContacts: 100,
      platforms: 0,
      aiInsights: false,
    },
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_ID_PRO,
    monthlyPrice: 29,
    features: {
      videosPerMonth: -1,
      maxResolution: '4K',
      autoPosting: true,
      crmContacts: -1,
      platforms: 6,
      aiInsights: true,
    },
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    monthlyPrice: 99,
    features: {
      videosPerMonth: -1,
      maxResolution: '4K',
      autoPosting: true,
      crmContacts: -1,
      platforms: -1,
      aiInsights: true,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

// Stripe configuration
export const STRIPE_CONFIG = {
  priceIds: {
    xom3: process.env.STRIPE_PRICE_XOM3 || '',
    healthcare: process.env.STRIPE_PRICE_HEALTHCARE || '',
  },
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  trial: { enabled: true, days: 30, obols: 1000 },
  metadata: { source: 'xom3-cockpit', version: '1.0.0' },
};

/**
 * Create a Stripe checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId?: string;
  customerEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: params.customerId,
    customer_email: params.customerId ? undefined : params.customerEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: params.trialDays ? {
      trial_period_days: params.trialDays,
      metadata: params.metadata,
    } : { metadata: params.metadata },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error('Failed to create checkout session');
  return { sessionId: session.id, url: session.url };
}

/**
 * Create a Stripe customer portal session
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
  return { url: session.url };
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateCustomer(params: {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}): Promise<{ customerId: string; isNew: boolean }> {
  const stripe = getStripeClient();
  
  const existingCustomers = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return { customerId: existingCustomers.data[0].id, isNew: false };
  }

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });

  return { customerId: customer.id, isNew: true };
}

/**
 * Construct webhook event from raw body and signature
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

/**
 * Verify all required Stripe configuration is present
 */
export function verifyStripeConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_PUBLISHABLE_KEY) missing.push('STRIPE_PUBLISHABLE_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push('STRIPE_WEBHOOK_SECRET');
  return { valid: missing.length === 0, missing };
}

export type { Stripe };
