import { NextRequest, NextResponse } from "next/server";
import { getStripe, STRIPE_CONFIG } from "@/lib/stripe/client";
import { enrollTrialWallet } from "@/lib/obols/obols-store";
import { addCredits, updateStripeCustomer } from "@/lib/obols/wallet-store";
import { saveSubscriptionRecord } from "@/lib/subscription/subscription-store";
import Stripe from "stripe";
import type { SubscriptionTier } from "@/lib/tiers/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * STRIPE WEBHOOK HANDLER
 * 
 * Handles Stripe webhook events for subscriptions AND credit purchases
 * Key events:
 * - checkout.session.completed: Create trial wallet + subscription record OR add credits
 * - customer.subscription.updated: Update subscription status
 * - customer.subscription.deleted: Mark subscription as cancelled
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    if (!STRIPE_CONFIG.webhookSecret) {
      console.error("Missing STRIPE_WEBHOOK_SECRET environment variable");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // Verify webhook signature
    const stripe = getStripe();
    if (!stripe) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        STRIPE_CONFIG.webhookSecret
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Event type: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ 
      error: error?.message || "webhook_failed" 
    }, { status: 500 });
  }
}

/**
 * Handle checkout.session.completed
 * Routes to appropriate handler based on checkout type:
 * - credit_purchase: Add credits to wallet
 * - subscription: Create trial wallet + subscription record
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const checkoutType = session.metadata?.type;

  if (!userId) {
    console.error("[Stripe Webhook] Missing userId in checkout session");
    return;
  }

  // Route based on checkout type
  if (checkoutType === "credit_purchase") {
    await handleCreditPurchase(session, userId);
  } else if (checkoutType === "spacebaddie_subscription") {
    await handleSpaceBaddieSubscription(session, userId);
  } else {
    await handleSubscriptionCheckout(session, userId);
  }
}

/**
 * Handle credit purchase checkout
 * Adds credits to user's wallet
 */
async function handleCreditPurchase(session: Stripe.Checkout.Session, userId: string) {
  const amountCents = parseInt(session.metadata?.amount_cents || "0", 10);
  
  if (amountCents <= 0) {
    console.error("[Stripe Webhook] Invalid amount for credit purchase");
    return;
  }

  console.log(`[Stripe Webhook] Credit purchase: ${amountCents} cents for user ${userId}`);

  try {
    // Add credits to wallet
    const { wallet, transaction } = await addCredits({
      userId,
      amountCents,
      type: "deposit",
      description: `Added $${(amountCents / 100).toFixed(2)} credits`,
      stripeSessionId: session.id,
      metadata: {
        stripe_payment_intent: session.payment_intent,
        stripe_customer: session.customer,
      },
    });

    // Update Stripe customer ID if we have one
    const customerId = typeof session.customer === "string" 
      ? session.customer 
      : session.customer?.id;
    
    if (customerId) {
      await updateStripeCustomer(userId, customerId).catch(err => {
        console.warn("[Stripe Webhook] Failed to update Stripe customer:", err);
      });
    }

    console.log(`[Stripe Webhook] Credits added: ${amountCents} cents, new balance: ${wallet.balance_cents} cents`);
  } catch (error: any) {
    console.error("[Stripe Webhook] Failed to add credits:", error);
  }
}

/**
 * Handle SpaceBaddie subscription checkout
 * Creates subscription record in subscriptions table
 */
async function handleSpaceBaddieSubscription(session: Stripe.Checkout.Session, userId: string) {
  const plan = session.metadata?.plan || "pro";
  const subscriptionId = typeof session.subscription === "string" 
    ? session.subscription 
    : session.subscription?.id;

  console.log(`[Stripe Webhook] SpaceBaddie subscription: ${plan} for user ${userId}`);

  if (subscriptionId) {
    try {
      await saveSubscriptionRecord({
        tier: plan as any,
        userId,
        subscribed: true,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        status: "active",
        updatedAt: new Date().toISOString(),
        source: "webhook",
      });
      console.log(`[Stripe Webhook] SpaceBaddie subscription created for ${userId}, plan: ${plan}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Failed to create SpaceBaddie subscription:`, error);
    }
  }
}

/**
 * Handle subscription checkout
 * Create trial wallet if eligible + subscription record
 */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session, userId: string) {
  const productTier = (session.metadata?.tier as "xom3" | "healthcare") || "xom3";
  const subscriptionTier = (session.metadata?.subscriptionTier as SubscriptionTier) || (productTier === "xom3" ? "pro" : "growth");
  const trialEligible = session.metadata?.trialEligible === "true";
  const promoId = typeof session.metadata?.promoId === "string" ? session.metadata.promoId : null;

  console.log(`[Stripe Webhook] Subscription checkout for user ${userId}, product ${productTier}, tier ${subscriptionTier}, trial ${trialEligible}`);

  // Enroll trial wallet if eligible (XOM3 tier only)
  if (productTier === "xom3" && trialEligible) {
    try {
      const wallet = await enrollTrialWallet(userId, promoId || "grand_opening_v1");
      console.log(`[Stripe Webhook] Trial wallet enrolled: ${wallet.limitObols} Obols for ${userId}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Failed to enroll trial wallet:`, error);
    }
  }

  // Create subscription record
  const subscriptionId = typeof session.subscription === "string" 
    ? session.subscription 
    : session.subscription?.id;

  if (subscriptionId) {
    try {
      await saveSubscriptionRecord({
        tier: subscriptionTier,
        userId,
        subscribed: true,
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        status: "active",
        updatedAt: new Date().toISOString(),
        source: "webhook",
      });
      console.log(`[Stripe Webhook] Subscription record created for ${userId}`);
    } catch (error: any) {
      console.error(`[Stripe Webhook] Failed to create subscription record:`, error);
    }
  }
}

/**
 * Handle customer.subscription.created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subscriptionTier = (subscription.metadata?.subscriptionTier as SubscriptionTier) || "pro";

  if (!userId) {
    console.error("[Stripe Webhook] Missing userId in subscription");
    return;
  }

  console.log(`[Stripe Webhook] Subscription created for user ${userId}`);

  await saveSubscriptionRecord({
    tier: subscriptionTier,
    userId,
    subscribed: true,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : undefined,
    status: subscription.status,
    updatedAt: new Date().toISOString(),
    source: "webhook",
  });
}

/**
 * Handle customer.subscription.updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subscriptionTier = (subscription.metadata?.subscriptionTier as SubscriptionTier) || "pro";

  if (!userId) {
    console.error("[Stripe Webhook] Missing userId in subscription");
    return;
  }

  console.log(`[Stripe Webhook] Subscription updated for user ${userId}, status ${subscription.status}`);

  await saveSubscriptionRecord({
    tier: subscriptionTier,
    userId,
    subscribed: subscription.status === "active" || subscription.status === "trialing",
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    updatedAt: new Date().toISOString(),
    source: "webhook",
  });
}

/**
 * Handle customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const subscriptionTier = (subscription.metadata?.subscriptionTier as SubscriptionTier) || "pro";

  if (!userId) {
    console.error("[Stripe Webhook] Missing userId in subscription");
    return;
  }

  console.log(`[Stripe Webhook] Subscription deleted for user ${userId}`);

  await saveSubscriptionRecord({
    tier: subscriptionTier,
    userId,
    subscribed: false,
    stripeSubscriptionId: subscription.id,
    status: "canceled",
    canceledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "webhook",
  });
}

/**
 * Handle invoice.paid
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const userId = (invoice as any)?.subscription_details?.metadata?.userId || (invoice as any)?.metadata?.userId;
  
  if (!userId) {
    console.log("[Stripe Webhook] Invoice paid but no userId found");
    return;
  }

  console.log(`[Stripe Webhook] Invoice paid for user ${userId}, amount ${invoice.amount_paid / 100}`);
  
  // Optional: Log revenue, send confirmation email, etc.
}

/**
 * Handle invoice.payment_failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = (invoice as any)?.subscription_details?.metadata?.userId || (invoice as any)?.metadata?.userId;
  
  if (!userId) {
    console.log("[Stripe Webhook] Payment failed but no userId found");
    return;
  }

  console.error(`[Stripe Webhook] Payment failed for user ${userId}, amount ${invoice.amount_due / 100}`);
  
  // Optional: Send payment failure notification, alert operator, etc.
}

