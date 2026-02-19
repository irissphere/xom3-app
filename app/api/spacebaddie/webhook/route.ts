/**
 * Stripe Webhook Handler for SpaceBaddie
 * Handles subscription lifecycle events
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, type Stripe } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[Webhook] Database not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  console.log('[Webhook] Event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_email || session.customer_details?.email;
        const metadata = session.metadata || {};

        console.log('[Webhook] Checkout completed:', { customerId, subscriptionId, customerEmail });

        // Find user by email or userId in metadata
        let userId = metadata.userId !== 'anonymous' ? metadata.userId : null;
        
        if (!userId && customerEmail) {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const matchingUser = authUsers?.users?.find((u: { email?: string }) => u.email === customerEmail);
          userId = matchingUser?.id;
        }

        if (userId) {
          // Update or create subscription
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier: metadata.plan || 'pro',
            status: 'active',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

          console.log('[Webhook] Subscription activated for:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Find subscription by customer ID
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          const status = subscription.status === 'active' ? 'active' 
            : subscription.status === 'trialing' ? 'trial'
            : subscription.status === 'past_due' ? 'past_due'
            : subscription.status === 'canceled' ? 'cancelled'
            : 'active';

          const periodStart = (subscription as any).current_period_start;
          const periodEnd = (subscription as any).current_period_end;
          
          await supabase.from('subscriptions').update({
            status,
            current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
            current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            trial_ends_at: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
            updated_at: new Date().toISOString(),
          }).eq('id', existingSub.id);

          console.log('[Webhook] Subscription updated:', existingSub.id, status);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade to free tier
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single();

        if (existingSub) {
          await supabase.from('subscriptions').update({
            tier: 'free',
            status: 'cancelled',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          }).eq('id', existingSub.id);

          console.log('[Webhook] Subscription cancelled, downgraded to free:', existingSub.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Mark subscription as past due
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId);

        console.log('[Webhook] Payment failed for customer:', customerId);
        break;
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
