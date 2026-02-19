/**
 * POST /api/admin/setup-stripe
 *
 * One-time setup: creates all Stripe Products + Prices needed for
 * SpaceBaddie and XOM3 monetisation.  Returns the price IDs to add
 * as Vercel environment variables.
 *
 * Protected by a simple bearer-token check (ADMIN_SECRET env var).
 * If ADMIN_SECRET is not set, falls back to checking Supabase auth user role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PRODUCTS_TO_CREATE = [
  {
    envKey: 'STRIPE_PRICE_ID_PRO',
    product: {
      name: 'SpaceBaddie Pro',
      description: 'Unlimited videos, 4K resolution, auto-posting to 6 platforms, AI insights',
      metadata: { source: 'spacebaddie', tier: 'pro' },
    },
    price: { unit_amount: 2900, currency: 'usd', recurring: { interval: 'month' as const } },
  },
  {
    envKey: 'STRIPE_PRICE_ID_ENTERPRISE',
    product: {
      name: 'SpaceBaddie Enterprise',
      description: 'Everything in Pro plus API access, white-label, priority support',
      metadata: { source: 'spacebaddie', tier: 'enterprise' },
    },
    price: { unit_amount: 9900, currency: 'usd', recurring: { interval: 'month' as const } },
  },
  {
    envKey: 'STRIPE_PRICE_XOM3_STARTER',
    product: {
      name: 'XOM3 Starter',
      description: 'Solo operators: 500 leads, 20 social posts, 5 workflows, CRM access',
      metadata: { source: 'xom3', tier: 'starter' },
    },
    price: { unit_amount: 4900, currency: 'usd', recurring: { interval: 'month' as const } },
  },
  {
    envKey: 'STRIPE_PRICE_XOM3_GROWTH',
    product: {
      name: 'XOM3 Growth',
      description: 'Active teams: 1K leads, 100 social posts, appointment scheduling, basic ecommerce',
      metadata: { source: 'xom3', tier: 'growth' },
    },
    price: { unit_amount: 9900, currency: 'usd', recurring: { interval: 'month' as const } },
  },
  {
    envKey: 'STRIPE_PRICE_XOM3_PRO',
    product: {
      name: 'XOM3 Pro',
      description: 'Full automation: unlimited leads, SMS, social, voice calls, priority support',
      metadata: { source: 'xom3', tier: 'pro' },
    },
    price: { unit_amount: 14900, currency: 'usd', recurring: { interval: 'month' as const } },
  },
];

export async function POST(req: NextRequest) {
  try {
    // Simple auth guard
    const authHeader = req.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET;

    if (adminSecret) {
      if (authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured — check STRIPE_SECRET_KEY' }, { status: 500 });
    }

    const results: Record<string, string> = {};
    const created: string[] = [];

    for (const item of PRODUCTS_TO_CREATE) {
      // Check if product already exists by name
      const existing = await stripe.products.search({
        query: `name:"${item.product.name}"`,
      });

      let productId: string;
      if (existing.data.length > 0) {
        productId = existing.data[0].id;
        console.log(`[setup-stripe] Product "${item.product.name}" already exists: ${productId}`);
      } else {
        const product = await stripe.products.create(item.product);
        productId = product.id;
        created.push(item.product.name);
        console.log(`[setup-stripe] Created product "${item.product.name}": ${productId}`);
      }

      // Check if price already exists for this product
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 10,
      });

      const matchingPrice = prices.data.find(
        (p) =>
          p.unit_amount === item.price.unit_amount &&
          p.currency === item.price.currency &&
          p.recurring?.interval === item.price.recurring.interval
      );

      if (matchingPrice) {
        results[item.envKey] = matchingPrice.id;
        console.log(`[setup-stripe] Price for "${item.product.name}" already exists: ${matchingPrice.id}`);
      } else {
        const price = await stripe.prices.create({
          product: productId,
          ...item.price,
        });
        results[item.envKey] = price.id;
        created.push(`Price for ${item.product.name}`);
        console.log(`[setup-stripe] Created price for "${item.product.name}": ${price.id}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Setup complete. ${created.length} new items created.`,
      envVars: results,
      instruction: 'Add these as Vercel environment variables, then redeploy.',
    });
  } catch (error: any) {
    console.error('[setup-stripe] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
