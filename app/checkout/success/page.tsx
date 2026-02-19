'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface OrderData {
  id: string;
  status: string;
  total: number;
  created_at: string;
  items: OrderItem[];
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    // Trigger the checkmark animation after mount
    const timer = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/commerce/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order ?? data);
        }
      } catch {
        // Order fetch failed – we still show the success page with the orderId
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#e2e8f0',
    }}>
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>

        {/* Animated checkmark */}
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '50%',
          background: showCheck
            ? 'linear-gradient(135deg, rgba(34,197,94,0.20), rgba(34,197,94,0.08))'
            : 'rgba(34,197,94,0.05)',
          border: `2px solid ${showCheck ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.1)'}`,
          margin: '0 auto 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: showCheck ? 'scale(1)' : 'scale(0.6)',
          opacity: showCheck ? 1 : 0,
        }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{
            transition: 'all 0.4s ease 0.3s',
            opacity: showCheck ? 1 : 0,
          }}>
            <path
              d="M12 25L20 33L36 15"
              stroke="#22c55e"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '12px',
          letterSpacing: '-0.03em',
        }}>
          Order Confirmed!
        </h1>

        <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '12px', lineHeight: 1.6 }}>
          Thank you for your purchase! A confirmation email is on its way.
        </p>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '32px', lineHeight: 1.5 }}>
          Check your inbox for your order receipt and tracking details.
        </p>

        {/* Order summary card */}
        <div style={{
          padding: '28px',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(14px)',
          textAlign: 'left',
          marginBottom: '28px',
        }}>
          <h2 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>
            Order Summary
          </h2>

          {/* Order ID */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
          }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Order ID</span>
            <span style={{
              fontSize: '13px',
              fontFamily: 'monospace',
              color: '#cbd5e1',
              background: 'rgba(255,255,255,0.05)',
              padding: '4px 10px',
              borderRadius: '6px',
            }}>
              {orderId ? orderId.slice(0, 8) + '...' : '—'}
            </span>
          </div>

          {/* Status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
          }}>
            <span style={{ color: '#64748b', fontSize: '14px' }}>Status</span>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#22c55e',
              background: 'rgba(34,197,94,0.12)',
              padding: '4px 12px',
              borderRadius: '999px',
            }}>
              {order?.status === 'paid' ? 'Paid' : 'Processing'}
            </span>
          </div>

          {/* Line items */}
          {loading ? (
            <div style={{ padding: '16px 0', color: '#64748b', fontSize: '14px' }}>
              Loading order details...
            </div>
          ) : order?.items && order.items.length > 0 ? (
            <>
              <div style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                margin: '16px 0',
              }} />
              {order.items.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: 500 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Qty: {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#cbd5e1', fontWeight: 600 }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </>
          ) : null}

          {/* Total */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: '12px',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff' }}>Total</span>
            <span style={{ fontSize: '22px', fontWeight: 700, color: '#22d3ee' }}>
              ${order?.total != null ? order.total.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 28px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '15px',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(10,132,255,0.25)',
            transition: 'transform 150ms ease',
          }}>
            Continue Shopping
          </Link>

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
            transition: 'border-color 150ms ease',
          }}>
            View Orders
          </Link>

          <Link href="/track" style={{
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
            transition: 'border-color 150ms ease',
          }}>
            Track Order
          </Link>
        </div>

        {/* Trust signals */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          flexWrap: 'wrap',
          fontSize: '12px',
          color: '#475569',
        }}>
          <span>{'\u{1F512}'} Secure Payment</span>
          <span>{'\u{1F4E7}'} Email Confirmation Sent</span>
          <span>{'\u{1F4E6}'} Track Anytime</span>
        </div>

        {/* Session reference */}
        {sessionId && (
          <p style={{
            marginTop: '32px',
            fontSize: '12px',
            color: '#475569',
            fontFamily: 'monospace',
          }}>
            Session: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #070b14, #050810)',
        color: '#94a3b8',
        fontSize: '16px',
      }}>
        Loading...
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
