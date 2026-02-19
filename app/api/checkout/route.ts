/**
 * Commerce Checkout API
 * POST /api/checkout
 *
 * Creates a pending order in Supabase, then creates a Stripe Checkout
 * session in payment mode. Supports authenticated and guest checkout.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getOrCreateCustomer } from '@/lib/stripe/client';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CheckoutItem {
  product_id: string;
  name: string;
  price: number;       // price in dollars (e.g. 29.99)
  quantity: number;
  image_url?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await request.json();
    const items: CheckoutItem[] = body.items;

    // --- Validate items ---
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number') {
        return NextResponse.json({ error: 'Invalid cart item' }, { status: 400 });
      }
      if (item.price < 0 || item.quantity < 1) {
        return NextResponse.json({ error: 'Invalid price or quantity' }, { status: 400 });
      }
    }

    // --- Get authenticated user (optional – guest checkout allowed) ---
    let userId: string | null = null;
    let userEmail: string | null = null;

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email ?? null;
      }
    } catch {
      // Anonymous / guest checkout
    }

    // --- Determine if order is digital-only (skip shipping) ---
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const productIds = items.map(i => i.product_id).filter(Boolean);
    let isDigitalOnly = false;
    if (productIds.length > 0) {
      const { data: productRows } = await supabaseAdmin
        .from('spacebaddie_products')
        .select('id, product_type')
        .in('id', productIds);

      if (productRows && productRows.length > 0) {
        isDigitalOnly = productRows.every(
          (p: any) => p.product_type === 'digital'
        );
      }
    }

    // --- Calculate totals (convert dollars → cents) ---
    const originalSubtotalCents = items.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    );
    let subtotalCents = originalSubtotalCents;
    let firstPurchaseDiscountCents = 0;

    if (userId) {
      const { count } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['paid', 'fulfilling', 'shipped', 'delivered']);
      if (count === 0) {
        firstPurchaseDiscountCents = Math.floor(originalSubtotalCents * 0.10);
        subtotalCents = originalSubtotalCents - firstPurchaseDiscountCents;
      }
    }

    const shippingCents = isDigitalOnly ? 0 : (subtotalCents >= 5000 ? 0 : 499);
    const taxCents = 0; // TODO: integrate tax calculation
    const totalCents = subtotalCents + shippingCents + taxCents;

    // --- Create pending order in Supabase ---
    // (supabaseAdmin already initialized above for digital-only check)

    // Build order payload dynamically (currency/source may not exist yet)
    const orderPayload: Record<string, any> = {
      email: userEmail ?? 'guest@checkout.pending',
      status: 'pending',
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
    };
    if (userId) orderPayload.user_id = userId;

    // Try with currency/source first, fall back without if columns don't exist
    let order: { id: string } | null = null;
    let orderError: any = null;

    const { data: o1, error: e1 } = await supabaseAdmin
      .from('orders')
      .insert({ ...orderPayload, currency: 'usd', source: 'xom3_commerce' })
      .select('id')
      .single();

    if (e1 && e1.message?.includes('column')) {
      // Columns don't exist yet — retry without them
      console.warn('[Checkout] currency/source columns missing, retrying without them');
      const { data: o2, error: e2 } = await supabaseAdmin
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single();
      order = o2;
      orderError = e2;
    } else {
      order = o1;
      orderError = e1;
    }

    if (orderError || !order) {
      console.error('[Checkout] Order creation failed:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const orderId = order.id;

    // --- Create order items (using correct schema field names) ---
    const orderItems = items.map((item) => ({
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price_cents: Math.round(item.price * 100),
      total_cents: Math.round(item.price * 100) * item.quantity,
      metadata: item.image_url ? { image_url: item.image_url } : null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('[Checkout] Order items creation failed:', itemsError);
      // Clean up the orphaned order
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // --- Check for marketplace seller products (Stripe Connect splits) ---
    let sellerStripeAccountId: string | null = null;
    let applicationFeeCents: number | null = null;

    if (productIds.length > 0) {
      const { data: sellerProducts } = await supabaseAdmin
        .from('spacebaddie_products')
        .select('id, seller_id')
        .in('id', productIds)
        .not('seller_id', 'is', null);

      if (sellerProducts && sellerProducts.length > 0) {
        // Use the first seller's account (Stripe only supports one destination per session)
        const primarySellerId = sellerProducts[0].seller_id;
        const { data: seller } = await supabaseAdmin
          .from('marketplace_sellers')
          .select('stripe_account_id, commission_rate')
          .eq('id', primarySellerId)
          .eq('status', 'active')
          .single();

        if (seller?.stripe_account_id) {
          sellerStripeAccountId = seller.stripe_account_id;
          const platformCut = seller.commission_rate || 0.15; // default 15% platform fee
          applicationFeeCents = Math.round(totalCents * platformCut);
          console.log(`[Checkout] Marketplace split: ${platformCut * 100}% platform fee → seller ${primarySellerId}`);
        }
      }
    }

    // --- Check for affiliate referral code ---
    let affiliateCode: string | null = null;
    const refParam = body.ref || null;
    if (refParam) {
      const { data: affLink } = await supabaseAdmin
        .from('affiliate_links')
        .select('code')
        .eq('code', refParam)
        .single();
      if (affLink) {
        affiliateCode = affLink.code;
      }
    }

    // Store affiliate code on order if present
    if (affiliateCode) {
      await supabaseAdmin.from('orders').update({ affiliate_code: affiliateCode }).eq('id', orderId);
    }

    const priceMultiplier = originalSubtotalCents > 0 ? subtotalCents / originalSubtotalCents : 1;

    // --- Build Stripe line items ---
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          ...(item.image_url ? { images: [item.image_url] } : {}),
          metadata: { product_id: item.product_id },
        },
        unit_amount: Math.round(item.price * 100 * priceMultiplier),
      },
      quantity: item.quantity,
    }));

    // --- Create Stripe checkout session ---
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
      cancel_url: `${baseUrl}/cart`,
      metadata: {
        source: 'xom3_commerce',
        order_id: orderId,
        ...(userId ? { user_id: userId } : {}),
      },
      ...(isDigitalOnly ? {} : {
        shipping_address_collection: {
          allowed_countries: ['US', 'CA', 'GB', 'AU'],
        },
      }),
      customer_creation: 'always',
      billing_address_collection: 'auto',
      ...(userEmail ? { customer_email: userEmail } : {}),
      ...(sellerStripeAccountId ? {
        payment_intent_data: {
          application_fee_amount: applicationFeeCents!,
          transfer_data: {
            destination: sellerStripeAccountId,
          },
        },
      } : {}),
    };

    // If user already has a Stripe customer, attach it
    if (userId && userEmail) {
      try {
        const { customerId } = await getOrCreateCustomer({ email: userEmail });
        sessionParams.customer = customerId;
        delete (sessionParams as any).customer_email;
        delete (sessionParams as any).customer_creation;
      } catch {
        // Fall back to customer_email
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // --- Store Stripe session ID on the order ---
    await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', orderId);

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      url: session.url,
      orderId,
    });
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Checkout failed' },
      { status: 500 },
    );
  }
}
