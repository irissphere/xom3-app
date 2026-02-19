'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface ShippingAddress {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface Order {
  id: string;
  user_id: string;
  status: string;
  total: number;
  currency: string;
  email: string | null;
  source: string | null;
  shipping_address: ShippingAddress | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  paid: '#60a5fa',
  processing: '#a78bfa',
  shipped: '#818cf8',
  delivered: '#4ade80',
  cancelled: '#f87171',
};

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to view this order.');
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (fetchErr || !data) {
        setError('Order not found.');
        return;
      }

      setOrder(data);
    } catch (err: any) {
      console.error('Failed to load order:', err);
      setError('Unable to load order details.');
    } finally {
      setLoading(false);
    }
  };

  const color = order ? (STATUS_COLORS[order.status] || '#94a3b8') : '#94a3b8';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '80px 24px 120px',
      color: '#e2e8f0',
    }}>
      {/* Nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        background: 'linear-gradient(180deg, rgba(5,8,16,0.95), rgba(5,8,16,0.8))',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link href="/orders" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: '10px',
          background: 'rgba(10,132,255,0.1)',
          border: '1px solid rgba(10,132,255,0.2)',
          color: '#5ac8fa',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Orders
        </Link>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>
          Order Details
        </span>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '64px 0', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
            Loading order...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.15)',
          }}>
            <p style={{ fontSize: '15px', color: '#f87171', marginBottom: '16px' }}>{error}</p>
            <Link href="/orders" style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}>
              Back to Orders
            </Link>
          </div>
        )}

        {/* Order detail */}
        {!loading && !error && order && (
          <>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h1 style={{
                  fontSize: 'clamp(22px, 4vw, 32px)',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.03em',
                  margin: 0,
                }}>
                  Order {order.id.slice(0, 8)}...
                </h1>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: color,
                  background: `${color}18`,
                  padding: '5px 14px',
                  borderRadius: '999px',
                }}>
                  {statusLabel(order.status)}
                </span>
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            {/* Info cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {/* Dates card */}
              <div style={{
                padding: '20px',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Created</div>
                    <div style={{ fontSize: '14px', color: '#cbd5e1' }}>{formatDate(order.created_at)}</div>
                  </div>
                  {order.paid_at && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Paid</div>
                      <div style={{ fontSize: '14px', color: '#4ade80' }}>{formatDate(order.paid_at)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment card */}
              <div style={{
                padding: '20px',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Payment
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Total</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#22d3ee' }}>
                      ${order.total.toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>{order.currency?.toUpperCase()}</span>
                    </div>
                  </div>
                  {order.stripe_payment_intent && (
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Payment ID</div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a3b8' }}>
                        {order.stripe_payment_intent.slice(0, 20)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping address */}
            {order.shipping_address && (
              <div style={{
                padding: '20px',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '24px',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Shipping Address
                </div>
                <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>
                  {order.shipping_address.name && <div style={{ fontWeight: 600 }}>{order.shipping_address.name}</div>}
                  {order.shipping_address.line1 && <div>{order.shipping_address.line1}</div>}
                  {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                  <div>
                    {[order.shipping_address.city, order.shipping_address.state, order.shipping_address.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {order.shipping_address.country && <div>{order.shipping_address.country}</div>}
                </div>
              </div>
            )}

            {/* Items */}
            <div style={{
              borderRadius: '16px',
              background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              marginBottom: '24px',
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Items ({order.order_items?.length ?? 0})
                </span>
              </div>

              {order.order_items && order.order_items.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '10px',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <path d="M16 10a4 4 0 01-8 0"/>
                        </svg>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>{item.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Qty: {item.quantity} &times; ${item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div style={{
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#22d3ee' }}>
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Contact info */}
            {order.email && (
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                marginBottom: '24px',
                fontSize: '14px',
                color: '#94a3b8',
              }}>
                Confirmation sent to <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{order.email}</span>
              </div>
            )}

            {/* Back button */}
            <div style={{ textAlign: 'center' }}>
              <Link href="/orders" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back to Orders
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
