/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 * 
 * Handles payment completion, sends order confirmation emails,
 * and manages subscription lifecycle events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent, SUBSCRIPTION_TIERS } from '@/lib/stripe/client';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email/client';
import { orderConfirmationEmail } from '@/lib/email/templates';

// Lazy-initialize Supabase admin client (avoids build-time errors)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials not configured for webhook');
  }
  
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const event = constructWebhookEvent(rawBody, signature);
    const supabaseAdmin = getSupabaseAdmin();
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── Commerce order fulfillment ──
        if (session.metadata?.source === 'xom3_commerce') {
          const orderId = session.metadata?.order_id;
          const userId = session.metadata?.user_id;

          if (orderId) {
            // 1. Update order status → paid & store payment intent
            const updatePayload: Record<string, any> = {
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: typeof session.payment_intent === 'string'
                ? session.payment_intent
                : (session.payment_intent as any)?.id ?? null,
            };

            // 2. Store shipping address if collected
            let shippingAddress: any = null;
            if (session.shipping_details?.address) {
              const addr = session.shipping_details.address;
              shippingAddress = {
                name: session.shipping_details.name ?? '',
                line1: addr.line1 ?? '',
                line2: addr.line2 ?? '',
                city: addr.city ?? '',
                state: addr.state ?? '',
                postal_code: addr.postal_code ?? '',
                country: addr.country ?? '',
              };
              updatePayload.shipping_address = shippingAddress;
            }

            // Store customer email from session if available
            const customerEmail = session.customer_details?.email;
            if (customerEmail) {
              updatePayload.email = customerEmail;
            }

            await supabaseAdmin
              .from('orders')
              .update(updatePayload)
              .eq('id', orderId);

            // 3. Deduct inventory for purchased items
            try {
              const { data: orderItems } = await supabaseAdmin
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', orderId);

              if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                  if (!item.product_id) continue;
                  // Decrement inventory (only for products with finite stock)
                  const { data: product } = await supabaseAdmin
                    .from('spacebaddie_products')
                    .select('inventory_count')
                    .eq('id', item.product_id)
                    .single();

                  if (product && product.inventory_count > 0) {
                    const newCount = Math.max(0, product.inventory_count - item.quantity);
                    const updateData: Record<string, any> = { inventory_count: newCount };
                    // Auto-hide sold-out products
                    if (newCount === 0) {
                      updateData.status = 'draft';
                    }
                    await supabaseAdmin
                      .from('spacebaddie_products')
                      .update(updateData)
                      .eq('id', item.product_id);
                  }
                }
                console.log(`[Stripe Webhook] Inventory deducted for order ${orderId}`);
              }
            } catch (invErr) {
              console.error('[Stripe Webhook] Inventory deduction failed (non-fatal):', invErr);
            }

            // 4. Clear the user's cart items (if authenticated)
            if (userId) {
              await supabaseAdmin
                .from('cart_items')
                .delete()
                .eq('user_id', userId);
            }

            // 5. Deliver digital products instantly
            try {
              const { data: orderItemsFull } = await supabaseAdmin
                .from('order_items')
                .select('product_id, product_name')
                .eq('order_id', orderId);

              if (orderItemsFull) {
                const digitalProductIds = orderItemsFull
                  .filter(i => i.product_id)
                  .map(i => i.product_id);

                if (digitalProductIds.length > 0) {
                  const { data: digitalProducts } = await supabaseAdmin
                    .from('spacebaddie_products')
                    .select('id, name, product_type, digital_file_url')
                    .in('id', digitalProductIds)
                    .eq('product_type', 'digital');

                  const customerEmail2 = session.customer_details?.email || session.metadata?.customer_email;
                  if (digitalProducts && digitalProducts.length > 0 && customerEmail2) {
                    const downloadLinks = digitalProducts
                      .filter(p => p.digital_file_url)
                      .map(p => `<li><strong>${p.name}</strong>: <a href="${p.digital_file_url}" style="color:#FF006E;">Download Now</a></li>`)
                      .join('');

                    if (downloadLinks) {
                      await sendEmail({
                        to: customerEmail2,
                        subject: `Your Digital Products Are Ready!`,
                        html: `
                          <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 12px;">
                            <h1 style="color: #FF006E; margin-bottom: 16px;">Your Downloads Are Ready!</h1>
                            <p>Thank you for your purchase! Here are your digital products:</p>
                            <ul style="margin: 24px 0; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; list-style: none;">
                              ${downloadLinks}
                            </ul>
                            <p style="color: #94a3b8; font-size: 13px;">These download links are active for 7 days. If you need them re-sent, contact support.</p>
                            <p style="color: #64748b; font-size: 12px; margin-top: 32px;">SpaceBaddie Shop</p>
                          </div>
                        `,
                      });
                      console.log(`[Stripe Webhook] Digital delivery email sent to ${customerEmail2}`);
                    }
                  }
                }
              }
            } catch (digErr) {
              console.error('[Stripe Webhook] Digital delivery failed (non-fatal):', digErr);
            }

            // 7. Route dropshipping orders to CJ Dropshipping
            if (shippingAddress) {
              try {
                const { data: dropshipItems } = await supabaseAdmin
                  .from('order_items')
                  .select('product_id, quantity')
                  .eq('order_id', orderId);

                if (dropshipItems && dropshipItems.length > 0) {
                  const dropshipProductIds = dropshipItems.map(i => i.product_id).filter(Boolean);
                  const { data: supplierProducts } = await supabaseAdmin
                    .from('spacebaddie_products')
                    .select('id, supplier_source, supplier_sku')
                    .in('id', dropshipProductIds)
                    .eq('supplier_source', 'cj_dropshipping');

                  if (supplierProducts && supplierProducts.length > 0) {
                    const { placeCJOrder } = await import('@/lib/commerce/suppliers/cj-dropship');
                    const cjItems = supplierProducts
                      .filter((p: any) => p.supplier_sku)
                      .map((p: any) => {
                        const orderItem = dropshipItems.find(i => i.product_id === p.id);
                        return { vid: p.supplier_sku, quantity: orderItem?.quantity || 1 };
                      });

                    if (cjItems.length > 0) {
                      const cjResult = await placeCJOrder({
                        orderId,
                        shippingAddress: {
                          name: shippingAddress.name || 'Customer',
                          phone: '',
                          country: shippingAddress.country || 'US',
                          province: shippingAddress.state || '',
                          city: shippingAddress.city || '',
                          address: [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', '),
                          zip: shippingAddress.postal_code || '',
                        },
                        items: cjItems,
                      });

                      if (cjResult) {
                        await supabaseAdmin.from('orders').update({
                          status: 'fulfilling',
                          notes: `CJ Order: ${cjResult.orderNumber}`,
                        }).eq('id', orderId);
                        console.log(`[Stripe Webhook] CJ order placed: ${cjResult.orderNumber}`);
                      }
                    }
                  }
                }
              } catch (cjErr) {
                console.error('[Stripe Webhook] CJ Dropshipping order failed (non-fatal):', cjErr);
              }
            }

            // 8. Credit affiliate commission if applicable
            try {
              const { data: orderForAffiliate } = await supabaseAdmin
                .from('orders')
                .select('affiliate_code, total_cents')
                .eq('id', orderId)
                .single();

              if (orderForAffiliate?.affiliate_code) {
                const { data: affLink } = await supabaseAdmin
                  .from('affiliate_links')
                  .select('id, affiliate_user_id')
                  .eq('code', orderForAffiliate.affiliate_code)
                  .single();

                if (affLink) {
                  const { data: affProfile } = await supabaseAdmin
                    .from('affiliate_profiles')
                    .select('tier')
                    .eq('user_id', affLink.affiliate_user_id)
                    .single();

                  const tierRates: Record<string, number> = { starter: 0.10, silver: 0.15, gold: 0.20, diamond: 0.25 };
                  const rate = tierRates[affProfile?.tier || 'starter'] || 0.10;
                  const commissionCents = Math.floor((orderForAffiliate.total_cents || 0) * rate);

                  await supabaseAdmin.from('affiliate_commissions').insert({
                    affiliate_user_id: affLink.affiliate_user_id,
                    order_id: orderId,
                    order_total_cents: orderForAffiliate.total_cents || 0,
                    commission_rate: rate,
                    commission_cents: commissionCents,
                    status: 'pending',
                  });

                  await supabaseAdmin.from('affiliate_links').update({
                    conversions: (await supabaseAdmin.from('affiliate_links').select('conversions').eq('id', affLink.id).single()).data?.conversions + 1 || 1,
                    revenue_cents: (await supabaseAdmin.from('affiliate_links').select('revenue_cents').eq('id', affLink.id).single()).data?.revenue_cents + (orderForAffiliate.total_cents || 0),
                    commission_cents: (await supabaseAdmin.from('affiliate_links').select('commission_cents').eq('id', affLink.id).single()).data?.commission_cents + commissionCents,
                  }).eq('id', affLink.id);

                  await supabaseAdmin.from('affiliate_profiles').update({
                    total_sales_cents: (await supabaseAdmin.from('affiliate_profiles').select('total_sales_cents').eq('user_id', affLink.affiliate_user_id).single()).data?.total_sales_cents + (orderForAffiliate.total_cents || 0),
                    total_commission_cents: (await supabaseAdmin.from('affiliate_profiles').select('total_commission_cents').eq('user_id', affLink.affiliate_user_id).single()).data?.total_commission_cents + commissionCents,
                  }).eq('user_id', affLink.affiliate_user_id);

                  console.log(`[Stripe Webhook] Affiliate commission ${commissionCents}c for order ${orderId}`);
                }
              }
            } catch (affErr) {
              console.error('[Stripe Webhook] Affiliate commission failed (non-fatal):', affErr);
            }

            // 6. Send order confirmation email
            const emailTo = customerEmail || session.metadata?.customer_email;
            if (emailTo) {
              try {
                // Fetch the full order with items for the email
                const { data: fullOrder } = await supabaseAdmin
                  .from('orders')
                  .select('*, order_items(*)')
                  .eq('id', orderId)
                  .single();

                if (fullOrder) {
                  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || 'https://spacebaddie.com';
                  const emailData = orderConfirmationEmail({
                    orderId,
                    customerName: session.customer_details?.name || shippingAddress?.name || undefined,
                    email: emailTo,
                    items: (fullOrder.order_items || []).map((item: any) => ({
                      name: item.product_name,
                      quantity: item.quantity,
                      price: (item.unit_price_cents || 0) / 100,
                      image_url: item.metadata?.image_url || null,
                    })),
                    subtotal: (fullOrder.subtotal_cents || 0) / 100,
                    shipping: (fullOrder.shipping_cents || 0) / 100,
                    tax: (fullOrder.tax_cents || 0) / 100,
                    total: (fullOrder.total_cents || 0) / 100,
                    shippingAddress,
                    storeUrl,
                  });

                  await sendEmail({
                    to: emailTo,
                    subject: emailData.subject,
                    html: emailData.html,
                  });

                  console.log(`[Stripe Webhook] Confirmation email sent to ${emailTo}`);
                }
              } catch (emailErr) {
                // Don't fail the webhook if email fails
                console.error('[Stripe Webhook] Email send failed (non-fatal):', emailErr);
              }
            }

            console.log(`[Stripe Webhook] Commerce order ${orderId} marked as paid`);
          }
          break;
        }

        // ── Subscription fulfillment (existing logic) ──
        const subUserId = session.metadata?.supabase_user_id;
        
        if (subUserId) {
          await supabaseAdmin
            .from('user_profiles')
            .update({
              stripe_customer_id: session.customer as string,
              subscription_tier: session.metadata?.plan || 'pro',
              subscription_status: 'active',
            })
            .eq('id', subUserId);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        
        let tier = 'free';
        if (priceId === SUBSCRIPTION_TIERS.pro.priceId) tier = 'pro';
        else if (priceId === SUBSCRIPTION_TIERS.enterprise.priceId) tier = 'enterprise';
        
        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_tier: tier,
            subscription_status: subscription.status,
          })
          .eq('stripe_customer_id', subscription.customer);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('user_profiles')
          .update({
            subscription_tier: 'free',
            subscription_status: 'cancelled',
          })
          .eq('stripe_customer_id', subscription.customer);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 400 }
    );
  }
}