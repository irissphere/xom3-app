'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  order_items?: OrderItem[];
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please sign in to view your orders.');
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setOrders(data ?? []);
    } catch (err: any) {
      console.error('Failed to load orders:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <Link href="/shop" style={{
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
          Shop
        </Link>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff' }}>My Orders</span>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{
          fontSize: 'clamp(24px, 4vw, 36px)',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '8px',
          letterSpacing: '-0.03em',
        }}>
          Order History
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '36px' }}>
          Track and review all your past purchases.
        </p>

        {/* Loading state */}
        {loading && (
          <div style={{
            padding: '48px 0',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '15px',
          }}>
            Loading orders...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{
            padding: '48px 32px',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'rgba(248,113,113,0.06)',
            border: '1px solid rgba(248,113,113,0.15)',
          }}>
            <p style={{ fontSize: '15px', color: '#f87171', marginBottom: '16px' }}>{error}</p>
            <Link href="/auth" style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div style={{
            padding: '64px 32px',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '32px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
              No orders yet
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
              Your purchase history will appear here after your first order.
            </p>
            <Link href="/shop" style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}>
              Browse Shop
            </Link>
          </div>
        )}

        {/* Order list */}
        {!loading && !error && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {orders.map((order) => {
              const color = STATUS_COLORS[order.status] || '#94a3b8';
              const isExpanded = expandedId === order.id;

              return (
                <div key={order.id} style={{
                  borderRadius: '16px',
                  background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(12,18,34,0.72))',
                  border: `1px solid ${isExpanded ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'border-color 200ms ease',
                  overflow: 'hidden',
                }}>
                  {/* Order header – clickable */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      color: '#e2e8f0',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                      {/* Order ID */}
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#94a3b8',
                        background: 'rgba(255,255,255,0.04)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                      }}>
                        {order.id.slice(0, 8)}
                      </span>

                      {/* Date */}
                      <span style={{ fontSize: '14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(order.created_at)}
                      </span>

                      {/* Status badge */}
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: color,
                        background: `${color}18`,
                        padding: '4px 12px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}>
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Total */}
                      <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>
                        ${order.total.toFixed(2)}
                      </span>

                      {/* Chevron */}
                      <svg
                        width="16" height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{
                          transition: 'transform 200ms ease',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          flexShrink: 0,
                        }}
                      >
                        <path d="M4 6L8 10L12 6" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && order.order_items && order.order_items.length > 0 && (
                    <div style={{
                      padding: '0 24px 20px',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {order.order_items.map((item) => (
                        <div key={item.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>
                                {item.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Qty: {item.quantity} &times; ${item.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      ))}

                      {/* View detail link */}
                      <div style={{ marginTop: '14px', textAlign: 'right' }}>
                        <Link href={`/orders/${order.id}`} style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#6366f1',
                          textDecoration: 'none',
                        }}>
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
