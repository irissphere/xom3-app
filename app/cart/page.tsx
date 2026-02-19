'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getGuestCart,
  removeFromGuestCart,
  updateGuestCartQuantity,
  clearGuestCart,
  calculateCartTotals,
  type CartItem,
  type Cart,
} from '@/lib/commerce/cart';
import { supabase } from '@/lib/supabase/client';
import { GuestCheckoutModal } from '@/app/shop/components/GuestCheckoutModal';

const SHIPPING_THRESHOLD = 50; // Free shipping above this
const FLAT_SHIPPING = 4.99;

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>({ items: [], itemCount: 0, subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const loadCart = useCallback(async (token: string | null) => {
    try {
      setLoading(true);

      if (token) {
        // Authenticated: fetch from API
        const res = await fetch('/api/cart', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCart(calculateCartTotals(data.items || []));
      } else {
        // Guest: load from localStorage
        const items = getGuestCart();
        setCart(calculateCartTotals(items));
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
      // Fallback to guest cart
      const items = getGuestCart();
      setCart(calculateCartTotals(items));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const loggedIn = !!session;
        setIsLoggedIn(loggedIn);
        const token = session?.access_token || null;
        setAccessToken(token);
        await loadCart(token);
      } catch {
        setIsLoggedIn(false);
        setAccessToken(null);
        await loadCart(null);
      }
    };
    init();
  }, [loadCart]);

  const handleUpdateQuantity = async (item: CartItem, delta: number) => {
    const newQty = item.quantity + delta;
    if (newQty < 0) return;

    setUpdatingItem(item.product_id);

    try {
      if (accessToken) {
        if (newQty === 0) {
          await fetch(`/api/cart?product_id=${item.product_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        } else {
          await fetch('/api/cart', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ product_id: item.product_id, quantity: newQty }),
          });
        }
        await loadCart(accessToken);
      } else {
        if (newQty === 0) {
          const items = removeFromGuestCart(item.product_id);
          setCart(calculateCartTotals(items));
        } else {
          const items = updateGuestCartQuantity(item.product_id, newQty);
          setCart(calculateCartTotals(items));
        }
      }
    } catch (err) {
      console.error('Failed to update quantity:', err);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    setUpdatingItem(productId);
    try {
      if (accessToken) {
        await fetch(`/api/cart?product_id=${productId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        await loadCart(accessToken);
      } else {
        const items = removeFromGuestCart(productId);
        setCart(calculateCartTotals(items));
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleClearCart = async () => {
    try {
      if (accessToken) {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        await loadCart(accessToken);
      } else {
        clearGuestCart();
        setCart(calculateCartTotals([]));
      }
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  };

  const onCheckoutClick = () => {
    if (!isLoggedIn) {
      setShowGuestModal(true);
    } else {
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      // Build items payload from cart
      const items = cart.items.map((item) => ({
        product_id: item.product_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image_url: item.image_url || null,
      }));

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ items }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return;
      }

      if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const shippingCost = cart.subtotal >= SHIPPING_THRESHOLD ? 0 : (cart.items.length > 0 ? FLAT_SHIPPING : 0);
  const total = cart.subtotal + shippingCost;

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Digital': return '\u{1F4C0}';
      case 'Templates': return '\u{1F4C4}';
      case 'Courses': return '\u{1F4DA}';
      case 'Services': return '\u{1F527}';
      default: return '\u{1F4E6}';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)',
      color: '#fff',
    }}>
      {/* Sticky Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(10,10,26,0.95)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/shop" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>{'\u{1F6D2}'}</span>
              <span style={{
                fontSize: '24px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                SpaceBaddie Shop
              </span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link href="/shop" style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span>{'\u2190'}</span> Continue Shopping
            </Link>

            {/* Cart badge */}
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: '24px' }}>{'\u{1F6D2}'}</span>
              {cart.itemCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-10px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {cart.itemCount > 99 ? '99+' : cart.itemCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '48px 24px 96px',
      }}>
        {/* Page Title */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 50%, #00D4D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Your Cart
          </h1>
          <p style={{ color: '#888', fontSize: '16px' }}>
            {cart.itemCount === 0
              ? 'Your cart is empty'
              : `${cart.itemCount} item${cart.itemCount !== 1 ? 's' : ''} in your cart`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '100px 0',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(255,0,110,0.3)',
              borderTopColor: '#FF006E',
              borderRadius: '50%',
              animation: 'cartSpin 1s linear infinite',
            }} />
            <style>{`@keyframes cartSpin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty Cart State */}
        {!loading && cart.items.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
          }}>
            <span style={{ fontSize: '72px', display: 'block', marginBottom: '24px' }}>
              {'\u{1F6D2}'}
            </span>
            <h2 style={{
              fontSize: '28px',
              fontWeight: 600,
              marginBottom: '12px',
            }}>
              Your cart is empty
            </h2>
            <p style={{
              color: '#888',
              fontSize: '16px',
              marginBottom: '32px',
              maxWidth: '400px',
              margin: '0 auto 32px',
            }}>
              Looks like you haven{"'"}t added any products yet. Browse the shop to find something you{"'"}ll love.
            </p>
            <Link href="/shop" style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none',
            }}>
              Browse Products
            </Link>
          </div>
        )}

        {/* Cart Content */}
        {!loading && cart.items.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: '32px',
            alignItems: 'start',
          }}>
            {/* Cart Items */}
            <div>
              {/* Clear Cart */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '16px',
              }}>
                <button
                  onClick={handleClearCart}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#666',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Clear Cart
                </button>
              </div>

              {/* Items List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}>
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '20px',
                      padding: '20px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px',
                      opacity: updatingItem === item.product_id ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    {/* Product Image */}
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: item.image_url
                        ? `url(${item.image_url}) center/cover`
                        : 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {!item.image_url && (
                        <span style={{ fontSize: '36px', opacity: 0.5 }}>
                          {getCategoryIcon(item.category)}
                        </span>
                      )}
                    </div>

                    {/* Product Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}>
                        <div>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            marginBottom: '4px',
                            color: '#fff',
                          }}>
                            {item.name}
                          </h3>
                          {item.category && (
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              background: 'rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#888',
                            }}>
                              {item.category}
                            </span>
                          )}
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item.product_id)}
                          disabled={updatingItem === item.product_id}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#555',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            flexShrink: 0,
                            lineHeight: 1,
                          }}
                          title="Remove item"
                        >
                          {'\u2715'}
                        </button>
                      </div>

                      {/* Price and Quantity Controls */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '16px',
                      }}>
                        {/* Quantity Controls */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                        }}>
                          <button
                            onClick={() => handleUpdateQuantity(item, -1)}
                            disabled={updatingItem === item.product_id}
                            style={{
                              width: '36px',
                              height: '36px',
                              background: 'rgba(255,255,255,0.05)',
                              border: 'none',
                              color: item.quantity <= 1 ? '#444' : '#fff',
                              fontSize: '16px',
                              cursor: item.quantity <= 1 ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {'\u2212'}
                          </button>
                          <span style={{
                            width: '44px',
                            textAlign: 'center',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#fff',
                            background: 'rgba(255,255,255,0.03)',
                          }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item, 1)}
                            disabled={updatingItem === item.product_id}
                            style={{
                              width: '36px',
                              height: '36px',
                              background: 'rgba(255,255,255,0.05)',
                              border: 'none',
                              color: '#fff',
                              fontSize: '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            +
                          </button>
                        </div>

                        {/* Item Price */}
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}>
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div style={{
              position: 'sticky',
              top: '88px',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '28px',
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  marginBottom: '24px',
                  color: '#fff',
                }}>
                  Order Summary
                </h2>

                {/* Line Items */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                  }}>
                    <span style={{ color: '#888' }}>
                      Subtotal ({cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''})
                    </span>
                    <span style={{ color: '#fff', fontWeight: 500 }}>
                      ${cart.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                  }}>
                    <span style={{ color: '#888' }}>Shipping</span>
                    <span style={{
                      color: shippingCost === 0 ? '#22c55e' : '#fff',
                      fontWeight: 500,
                    }}>
                      {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
                    </span>
                  </div>

                  {shippingCost > 0 && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(34,197,94,0.08)',
                      border: '1px solid rgba(34,197,94,0.2)',
                      borderRadius: '10px',
                      fontSize: '13px',
                      color: '#22c55e',
                    }}>
                      Add ${(SHIPPING_THRESHOLD - cart.subtotal).toFixed(2)} more for free shipping
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{
                  height: '1px',
                  background: 'rgba(255,255,255,0.1)',
                  margin: '0 0 20px',
                }} />

                {/* Total */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                }}>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#fff',
                  }}>
                    Total
                  </span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    ${total.toFixed(2)}
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={onCheckoutClick}
                  disabled={checkingOut || cart.items.length === 0}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: checkingOut
                      ? 'rgba(255,255,255,0.1)'
                      : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: checkingOut ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
                </button>

                {/* Continue Shopping */}
                <Link href="/shop" style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  color: '#888',
                  fontSize: '14px',
                  fontWeight: 500,
                  textAlign: 'center',
                  textDecoration: 'none',
                  boxSizing: 'border-box',
                }}>
                  Continue Shopping
                </Link>

                {/* Security Note */}
                <div style={{
                  marginTop: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#555',
                }}>
                  <span>{'\u{1F512}'}</span>
                  <span>Secure checkout powered by Stripe</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Powered by{' '}
          <a href="https://spacebaddie.com" style={{ color: '#FF006E', textDecoration: 'none' }}>
            SpaceBaddie
          </a>
        </p>
      </footer>

      <GuestCheckoutModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onContinueAsGuest={() => { setShowGuestModal(false); handleCheckout(); }}
      />

      {/* Responsive styles for mobile */}
      <style>{`
        @media (max-width: 768px) {
          main > div > div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
