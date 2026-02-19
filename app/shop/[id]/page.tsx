'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { getShopImageSrc } from '@/lib/commerce/cj-image';
import { stripHtml, sanitizeDescriptionHtml, rewriteDescriptionImageUrls } from '@/lib/commerce/html-utils';
import { GuestCheckoutModal } from '../components/GuestCheckoutModal';
import EmailCapturePopup from '../components/EmailCapturePopup';

/** Main domain for cross-domain links (login, cart, etc.) so they work from shop.spacebaddie.com */
const MAIN_DOMAIN = 'https://xom3.io';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  seller_name: string;
  user_id: string;
  created_at: string;
  inventory_count?: number; // -1 = unlimited
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  description: string | null;
  seller_name: string;
}


export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestModalAction, setGuestModalAction] = useState<(() => void) | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);


  useEffect(() => {
    if (params.id) {
      loadProduct(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const loadProduct = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/shop/products/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Product not found');
        } else {
          throw new Error('Failed to load product');
        }
        return;
      }
      
      const data = await response.json();
      setProduct(data.product);

      if (data.product) {
        try {
          const recRes = await fetch(`/api/shop/recommendations?product_id=${id}&category=${encodeURIComponent(data.product.category)}&limit=4`);
          const recData = await recRes.json();
          if (recData.products) setRecommendations(recData.products);
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      console.error('Failed to load product:', err);
      setError('Unable to load product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product || addingToCart) return;
    setAddingToCart(true);
    try {
      const cartKey = 'xom3_guest_cart';
      const raw = typeof window !== 'undefined' ? localStorage.getItem(cartKey) : null;
      const items = raw ? JSON.parse(raw) : [];
      
      const existing = items.find((i: any) => i.product_id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image_url: product.image_url,
          category: product.category,
        });
      }
      
      localStorage.setItem(cartKey, JSON.stringify(items));
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 3000);
    } catch (err) {
      console.error('Add to cart error:', err);
    } finally {
      setAddingToCart(false);
    }
  };

  const onBuyNowClick = () => {
    if (isLoggedIn === false) {
      setGuestModalAction(() => handleBuyNow);
      setShowGuestModal(true);
    } else {
      handleBuyNow();
    }
  };

  const onAddToCartClick = () => {
    if (isLoggedIn === false) {
      setGuestModalAction(() => handleAddToCart);
      setShowGuestModal(true);
    } else {
      handleAddToCart();
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    setPurchasing(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity,
            image_url: product.image_url,
          }],
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error) alert(data.error);
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Unable to process checkout. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Digital': return '\u{1F4C0}';
      case 'Templates': return '\u{1F4C4}';
      case 'Courses': return '\u{1F4DA}';
      case 'Services': return '\u{1F527}';
      default: return '\u{1F4E6}';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #0d1117)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid rgba(139,92,246,0.3)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #070b14, #0d1117)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        padding: '24px',
      }}>
        <span style={{ fontSize: '64px', marginBottom: '24px' }}>{'\u{1F614}'}</span>
        <h1 style={{ fontSize: '32px', marginBottom: '12px' }}>{error || 'Product not found'}</h1>
        <p style={{ color: '#888', marginBottom: '32px' }}>This product may have been removed</p>
        <Link href="/shop" style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
          borderRadius: '8px',
          color: '#fff',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          Back to Shop
        </Link>
      </div>
    );
  }

  // Inventory: -1 means unlimited stock
  const isUnlimited = !product.inventory_count || product.inventory_count < 0;
  const stockLeft = isUnlimited ? 999 : product.inventory_count;
  const discountedPrice = product.price;

  // JSON-LD Structured Data for Google rich results
  const jsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    image: product.image_url || undefined,
    brand: { '@type': 'Brand', name: 'SpaceBaddie' },
    offers: {
      '@type': 'Offer',
      price: product.price.toFixed(2),
      priceCurrency: 'USD',
      availability: isUnlimited || stockLeft > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: typeof window !== 'undefined' ? window.location.href : `https://shop.spacebaddie.com/${product.id}`,
      seller: { '@type': 'Organization', name: product.seller_name },
    },
    category: product.category,
  } : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #0d1117)',
      color: '#e2e8f0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Sticky Header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7,11,20,0.96)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/shop" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>{'\u{1F6CD}\uFE0F'}</span>
            <span style={{
              fontSize: '20px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              SpaceBaddie Shop
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLoggedIn === false && (
              <a href={`${MAIN_DOMAIN}/login`} style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                Log in
              </a>
            )}
            {isLoggedIn === true && (
              <a href={`${MAIN_DOMAIN}/commerce`} style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
              }}>
                Seller Dashboard
              </a>
            )}
            <Link href="/shop" style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {'\u2190'} Shop
            </Link>
            <Link href="/shop/about" style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              Our Story
            </Link>
            <a href={`${MAIN_DOMAIN}/cart`} style={{
              padding: '8px 16px',
              background: 'rgba(255,0,110,0.1)',
              border: '1px solid rgba(255,0,110,0.2)',
              borderRadius: '8px',
              color: '#FF006E',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              {'\u{1F6D2}'} Cart
            </a>
          </div>
        </div>
      </header>

      {/* (Purchase notifications removed - will be powered by real order data in the future) */}

      {/* Cart Added Toast */}
      {cartAdded && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          borderRadius: '12px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 600,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
          animation: 'slideIn 0.3s ease',
        }}>
          {'\u2713'} Added to cart!
          <a href={`${MAIN_DOMAIN}/cart`} style={{ color: '#fff', textDecoration: 'underline', marginLeft: '8px', fontSize: '13px' }}>
            View Cart
          </a>
        </div>
      )}

      {/* Main Product Section */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '48px',
        }}>
          {/* Product Image */}
          <div>
            <div style={{
              aspectRatio: '1',
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(255,0,110,0.15), rgba(138,43,226,0.15))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'relative',
            }}>
              {product.image_url ? (
                <img
                  src={getShopImageSrc(product.image_url)}
                  alt={stripHtml(product.name)}
                  data-direct-url={product.image_url}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    const direct = el.getAttribute('data-direct-url');
                    if (direct && el.src !== direct) {
                      el.src = direct;
                      return;
                    }
                    el.style.display = 'none';
                  }}
                />
              ) : (
                <span style={{ fontSize: '100px', opacity: 0.25 }}>
                  {getCategoryIcon(product.category)}
                </span>
              )}
              {/* Category Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                {getCategoryIcon(product.category)} {product.category}
              </div>
              {/* Stock indicator */}
              {!isUnlimited && stockLeft <= 10 && (
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  padding: '6px 14px',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#f59e0b',
                }}>
                  Only {stockLeft} left
                </div>
              )}
            </div>

            {/* Stock indicator for limited items */}
            {!isUnlimited && stockLeft <= 20 && (
              <div style={{
                marginTop: '16px',
                padding: '10px 16px',
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.12)',
                borderRadius: '12px',
                fontSize: '13px',
                color: '#f59e0b',
                fontWeight: 500,
              }}>
                {stockLeft} in stock
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Category */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#8b5cf6' }}>
                {getCategoryIcon(product.category)} {product.category}
              </span>
            </div>

            <h1 style={{
              fontSize: '36px',
              fontWeight: 800,
              marginBottom: '12px',
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
              color: '#fff',
            }}>
              {stripHtml(product.name)}
            </h1>

            <p style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '20px',
            }}>
              by <span style={{ color: '#8b5cf6', fontWeight: 500 }}>{product.seller_name}</span> {'\u2022'} {'\u2713'} Verified Creator
            </p>

            {/* Price & Purchase - FIRST so Buy Now / Add to Cart are immediately visible */}
            <div style={{
              padding: '28px',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,0,110,0.05))',
              border: '2px solid rgba(255,0,110,0.2)',
              borderRadius: '20px',
              marginBottom: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff' }}>
                  ${discountedPrice.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Quantity:</span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      width: '38px', height: '38px',
                      background: 'rgba(255,255,255,0.04)', border: 'none',
                      color: '#fff', fontSize: '16px', cursor: 'pointer',
                    }}
                  >{'\u2212'}</button>
                  <span style={{ width: '48px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#fff' }}>
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(isUnlimited ? quantity + 1 : Math.min(stockLeft, quantity + 1))}
                    style={{
                      width: '38px', height: '38px',
                      background: 'rgba(255,255,255,0.04)', border: 'none',
                      color: '#fff', fontSize: '16px', cursor: 'pointer',
                    }}
                  >+</button>
                </div>
                {!isUnlimited && (
                  <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                    (max {stockLeft})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={onBuyNowClick}
                  disabled={purchasing}
                  style={{
                    width: '100%',
                    padding: '18px',
                    background: purchasing ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                    border: 'none',
                    borderRadius: '14px',
                    color: '#fff',
                    fontSize: '17px',
                    fontWeight: 800,
                    cursor: purchasing ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    boxShadow: purchasing ? 'none' : '0 4px 20px rgba(255,0,110,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {purchasing ? 'Processing...' : `\u26A1 Buy Now \u2022 $${(discountedPrice * quantity).toFixed(2)}`}
                </button>
                <button
                  onClick={onAddToCartClick}
                  disabled={addingToCart}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '2px solid rgba(255,255,255,0.12)',
                    borderRadius: '14px',
                    color: '#cbd5e1',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: addingToCart ? 'not-allowed' : 'pointer',
                  }}
                >
                  {addingToCart ? 'Adding...' : `\u{1F6D2} Add to Cart`}
                </button>
              </div>
            </div>

            {/* Pain Point → Solution Description */}
            {product.description && (
              <div style={{
                marginBottom: '28px',
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '14px',
              }}>
                <h3 style={{ fontSize: '14px', color: '#FF006E', marginBottom: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {'\u{1F3AF}'} Why You Need This
                </h3>
                <div
                  style={{ fontSize: '15px', lineHeight: 1.7, color: '#94a3b8', margin: 0 }}
                  dangerouslySetInnerHTML={{ __html: rewriteDescriptionImageUrls(sanitizeDescriptionHtml(product.description)) }}
                />
              </div>
            )}

            {/* What You Get */}
            <div style={{
              marginBottom: '24px',
              padding: '18px',
              background: 'rgba(34,197,94,0.04)',
              border: '1px solid rgba(34,197,94,0.1)',
              borderRadius: '14px',
            }}>
              <h3 style={{ fontSize: '13px', color: '#22c55e', marginBottom: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {'\u2713'} What You Get
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  'Instant digital delivery after purchase',
                  'Lifetime access - download anytime',
                  '30-day money-back guarantee',
                  'Priority customer support',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#94a3b8' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{'\u2713'}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Signals Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { icon: '\u{1F512}', label: 'Secure Checkout', sub: '256-bit SSL encrypted' },
                { icon: '\u26A1', label: 'Instant Delivery', sub: 'Download in seconds' },
                { icon: '\u{1F4B3}', label: 'Safe Payment', sub: 'Stripe protected' },
                { icon: '\u{1F504}', label: '30-Day Guarantee', sub: 'Full refund, no questions' },
              ].map((trust, i) => (
                <div key={i} style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <span style={{ fontSize: '18px' }}>{trust.icon}</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{trust.label}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>{trust.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews section - will be powered by real reviews once customers purchase */}

        {/* Behind The Product - GaryVee "Document Don't Create" */}
        {product && (
          <section style={{
            marginTop: '48px',
            padding: '32px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>{'\u{1F3AC}'}</span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                Behind The Product
              </h3>
              <span style={{
                padding: '2px 8px',
                background: 'rgba(139,92,246,0.12)',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#c4b5fd',
              }}>
                THE STORY
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '16px' }}>
                  Every product on SpaceBaddie has a story. From the initial spark of an idea to the final product you hold in your hands,
                  real creators pour their passion into what they build. This isn&apos;t mass-produced corporate stuff &mdash; it&apos;s authentic,
                  it&apos;s raw, and it&apos;s made by people who actually care.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {[
                    { step: '01', label: 'Idea Born', detail: 'Creator spots a real need' },
                    { step: '02', label: 'Built Raw', detail: 'Crafted with real experience' },
                    { step: '03', label: 'AI Optimized', detail: 'Enhanced by SpaceBaddie AI' },
                    { step: '04', label: 'You Benefit', detail: 'Ready to transform your work' },
                  ].map((item) => (
                    <div key={item.step} style={{ flex: '1 1 120px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', opacity: 0.6, marginBottom: '4px' }}>{item.step}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{item.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{
                background: 'rgba(139,92,246,0.06)',
                border: '1px solid rgba(139,92,246,0.15)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '40px', marginBottom: '12px' }}>{'\u{1F3AC}'}</span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#c4b5fd', marginBottom: '6px' }}>Are you a creator?</div>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px', lineHeight: 1.4 }}>
                  Tell your story with video. Authenticity sells better than any ad.
                </p>
                <a href={`${MAIN_DOMAIN}/spacebaddie/studio?ref=behind-the-product&product=${product?.id || ''}`} style={{
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                  borderRadius: '8px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  {'\u{1F3AC}'} Create Your Video
                </a>
                <a href={`${MAIN_DOMAIN}/commerce/products`} style={{
                  display: 'block',
                  marginTop: '8px',
                  color: '#64748b',
                  textDecoration: 'none',
                  fontSize: '11px',
                }}>
                  or list a product &rarr;
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Social Share Section - GaryVee "Day Trading Attention" */}
        {product && (
          <section style={{
            marginTop: '48px',
            padding: '28px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(59,130,246,0.06) 100%)',
            border: '1px solid rgba(139,92,246,0.15)',
            borderRadius: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  Share This Product
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Help a friend out - share and earn credit toward your next purchase
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* TikTok */}
                <a
                  href={`https://www.tiktok.com/upload?caption=${encodeURIComponent(`Found this gem on SpaceBaddie! ${product.name} - check it out`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{'\u{1F3B5}'}</span>
                  TikTok
                </a>
                {/* Instagram */}
                <a
                  href={`https://www.instagram.com/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{'\u{1F4F7}'}</span>
                  Instagram
                </a>
                {/* Twitter / X */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just copped "${product.name}" from @SpaceBaddie - the future of creator commerce`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{'X'}</span>
                  Post
                </a>
                {/* Copy Link */}
                <button
                  onClick={() => {
                    if (typeof navigator !== 'undefined') {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Link copied!');
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{'\u{1F517}'}</span>
                  Copy Link
                </button>
              </div>
            </div>

            {/* Create Video CTA -- funnels to SpaceBaddie Studio */}
            <a
              href={`${MAIN_DOMAIN}/spacebaddie/studio?product=${product.id}&name=${encodeURIComponent(product.name)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginTop: '20px',
                padding: '20px 24px',
                background: 'linear-gradient(135deg, rgba(255,0,110,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                border: '1px solid rgba(255,0,110,0.2)',
                borderRadius: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '36px' }}>{'\u{1F3AC}'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  Create a Video About This Product
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  Use SpaceBaddie Studio to generate a viral video for TikTok, Reels, or Shorts in seconds. No editing skills needed.
                </div>
              </div>
              <span style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                Open Studio
              </span>
            </a>

            {/* Platform-Optimized Captions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  TIKTOK CAPTION
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  {`POV: You just found "${product.name}" and your life changed. Link in bio! #SpaceBaddie #CreatorEconomy #MustHave`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  INSTAGRAM STORY
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  {`Swipe up for "${product.name}" - trust me, you need this. @SpaceBaddie #LinkInBio`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  X / TWITTER
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                  {`Just copped "${product.name}" from @SpaceBaddie. If you're a creator, you need this in your toolkit.`}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upsell / Cross-Sell Recommendations */}
        {recommendations.length > 0 && (
          <section style={{ marginTop: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 }}>
                {'\u{1F525}'} Frequently Bought Together
              </h2>
              <span style={{
                padding: '4px 10px',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#22c55e',
              }}>
                BUNDLE & SAVE
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              Other customers also grabbed these — add them to your cart for a complete setup
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '20px',
            }}>
              {recommendations.map(rec => (
                <div key={rec.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, transform 0.2s',
                  position: 'relative',
                }}>
                  <Link href={`/shop/${rec.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      height: '160px',
                      background: 'linear-gradient(135deg, rgba(255,0,110,0.12), rgba(138,43,226,0.12))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {rec.image_url ? (
                        <img
                          src={getShopImageSrc(rec.image_url)}
                          alt={stripHtml(rec.name)}
                          data-direct-url={rec.image_url}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            const direct = el.getAttribute('data-direct-url');
                            if (direct && el.src !== direct) {
                              el.src = direct;
                              return;
                            }
                            el.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '48px', opacity: 0.25 }}>
                          {getCategoryIcon(rec.category)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div style={{ padding: '16px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#64748b',
                      marginBottom: '8px',
                    }}>
                      {rec.category}
                    </span>
                    <Link href={`/shop/${rec.id}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px', lineHeight: 1.3 }}>
                        {stripHtml(rec.name)}
                      </h3>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '18px', fontWeight: 700,
                        background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                        ${rec.price.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#475569' }}>by {rec.seller_name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const cartKey = 'xom3_guest_cart';
                        const raw = typeof window !== 'undefined' ? localStorage.getItem(cartKey) : null;
                        const items = raw ? JSON.parse(raw) : [];
                        const existing = items.find((i: any) => i.product_id === rec.id);
                        if (existing) {
                          existing.quantity += 1;
                        } else {
                          items.push({
                            id: crypto.randomUUID(),
                            product_id: rec.id,
                            name: rec.name,
                            price: rec.price,
                            quantity: 1,
                            image_url: rec.image_url,
                            category: rec.category,
                          });
                        }
                        localStorage.setItem(cartKey, JSON.stringify(items));
                        setCartAdded(true);
                        setTimeout(() => setCartAdded(false), 3000);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        background: 'rgba(255,0,110,0.08)',
                        border: '1px solid rgba(255,0,110,0.2)',
                        borderRadius: '10px',
                        color: '#FF006E',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                    >
                      {'\u{1F6D2}'} Quick Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Why SpaceBaddie Section */}
        <section style={{
          marginTop: '48px',
          padding: '36px',
          background: 'linear-gradient(135deg, rgba(255,0,110,0.04), rgba(138,43,226,0.04))',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#fff', textAlign: 'center' }}>
            Why 10,000+ Creators Trust SpaceBaddie
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '28px' }}>
            We&apos;re not just a store. We&apos;re a movement.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}>
            {[
              { icon: '\u{1F680}', title: 'Built by Creators', desc: 'We understand the hustle because we live it every day' },
              { icon: '\u{1F6E1}\uFE0F', title: '100% Buyer Protection', desc: 'Every purchase is backed by our 30-day guarantee' },
              { icon: '\u{1F4A1}', title: 'AI-Powered', desc: 'Smart recommendations and optimization built in' },
              { icon: '\u{1F310}', title: 'Global Community', desc: 'Join thousands of creators building their empire' },
            ].map((feat, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>{feat.icon}</span>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>{feat.title}</h3>
                <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '48px 24px',
        textAlign: 'center',
        marginTop: '48px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Link href="/shop" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Shop</Link>
          <Link href="/shop/about" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Our Story</Link>
          <a href={`${MAIN_DOMAIN}/cart`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Cart</a>
          <a href={`${MAIN_DOMAIN}/track`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Track Order</a>
          <a href={`${MAIN_DOMAIN}/returns`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Returns</a>
          <a href={`${MAIN_DOMAIN}/refund`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Refund Policy</a>
          <a href={`${MAIN_DOMAIN}/shipping`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Shipping</a>
          <a href={`${MAIN_DOMAIN}/privacy`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Privacy</a>
          <a href={`${MAIN_DOMAIN}/terms`} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Terms</a>
        </div>
        <p style={{ color: '#334155', fontSize: '13px', margin: 0 }}>
          Powered by <a href="https://spacebaddie.com" style={{ color: '#8b5cf6', textDecoration: 'none' }}>SpaceBaddie</a>
        </p>
      </footer>

      <GuestCheckoutModal
        open={showGuestModal}
        onClose={() => { setShowGuestModal(false); setGuestModalAction(null); }}
        onContinueAsGuest={() => { guestModalAction?.(); setShowGuestModal(false); setGuestModalAction(null); }}
      />

      <EmailCapturePopup />

      {/* Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes shimmer { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 8px rgba(255,0,110,0.4); } 50% { box-shadow: 0 0 20px rgba(255,0,110,0.7); } }
        @keyframes progressPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        @media (max-width: 768px) {
          main > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
