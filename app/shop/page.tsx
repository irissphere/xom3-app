'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  seller_name: string;
  inventory_count?: number;
  created_at: string;
}

import { SHOP_FILTER_CATEGORIES } from '@/lib/commerce/categories';
import { getShopImageSrc } from '@/lib/commerce/cj-image';
import { stripHtml, sanitizeDescriptionHtml, rewriteDescriptionImageUrls } from '@/lib/commerce/html-utils';
import EmailCapturePopup from './components/EmailCapturePopup';
const CATEGORIES = SHOP_FILTER_CATEGORIES;

/** Main domain for cross-domain links (login, cart, etc.) so they work from shop.spacebaddie.com */
const MAIN_DOMAIN = 'https://xom3.io';
const LOGIN_SIGNUP_URL = `${MAIN_DOMAIN}/login`;

// Social proof is populated from real orders (loaded dynamically)
interface RecentBuyer {
  name: string;
  mins: number;
}

export default function PublicShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [recentBuyers, setRecentBuyers] = useState<RecentBuyer[]>([]);

  useEffect(() => {
    loadProducts();
    checkAuth();
    loadRecentBuyers();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    } catch {
      setIsLoggedIn(false);
    }
  };

  const loadRecentBuyers = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_name, created_at')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && data?.length) {
        const now = Date.now();
        setRecentBuyers(data.map((o: any) => {
          const first = (o.customer_name || 'Customer').split(' ')[0];
          const initial = (o.customer_name || 'C').split(' ').pop()?.[0] || '';
          const mins = Math.max(1, Math.round((now - new Date(o.created_at).getTime()) / 60000));
          return { name: `${first} ${initial}.`, mins };
        }));
      }
    } catch {
      // No social proof if no orders yet — that's fine
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/shop/products');
      
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError('Unable to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'AI Tools': return '\u{1F4A1}';
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
      {/* Header */}
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
              <span style={{ fontSize: '28px' }}>{'\u{1F6CD}\uFE0F'}</span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!isLoggedIn && (
              <a
                href={LOGIN_SIGNUP_URL}
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Log in
              </a>
            )}
            <Link href="/shop/about" style={{
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              Our Story
            </Link>
            <a href={`${MAIN_DOMAIN}/cart`} style={{
              padding: '10px 18px',
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
            {isLoggedIn && (
              <a
                href={`${MAIN_DOMAIN}/commerce`}
                style={{
                  padding: '10px 18px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#888',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Manage Store
              </a>
            )}
            <a
              href={isLoggedIn ? `${MAIN_DOMAIN}/commerce/products` : LOGIN_SIGNUP_URL}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {isLoggedIn ? 'Add Products' : 'Start Selling'}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        padding: '72px 24px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at center, rgba(255,0,110,0.1) 0%, transparent 60%)',
        position: 'relative',
      }}>
        <h1 style={{
          fontSize: '52px',
          fontWeight: 900,
          marginBottom: '16px',
          lineHeight: 1.1,
          letterSpacing: '-2px',
          background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 50%, #00D4D4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Products That Hit Different
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          maxWidth: '560px',
          margin: '0 auto 36px',
          lineHeight: 1.6,
        }}>
          Curated digital products from verified creators. 
          AI-powered recommendations. Instant delivery. No fluff.
        </p>

        {/* Search Bar */}
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          position: 'relative',
        }}>
          <input
            type="text"
            placeholder="Search trending products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '18px 24px 18px 56px',
              background: 'rgba(255,255,255,0.06)',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
            }}
          />
          <span style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '20px',
            opacity: 0.5,
          }}>
            {'\u{1F50D}'}
          </span>
        </div>

        {/* Recent Buyers Ticker (real orders only) */}
        {recentBuyers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '28px',
            fontSize: '12px',
            color: '#64748b',
            flexWrap: 'wrap',
          }}>
            {recentBuyers.slice(0, 4).map((buyer, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, color: '#fff',
                }}>
                  {buyer.name[0]}
                </span>
                {buyer.name} purchased {'\u2022'} {buyer.mins}m ago
              </span>
            ))}
          </div>
        )}
      </section>

      {/* FREE VALUE SECTION - GaryVee "Jab Jab Jab" */}
      <section style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginTop: '-24px',
        }}>
          {[
            {
              icon: '\u{1F4DA}',
              title: 'Free: How to Price Digital Products',
              desc: 'The psychology behind pricing that converts. Learn the anchoring technique top sellers use.',
              tag: 'FREE GUIDE',
              tagColor: '#22c55e',
            },
            {
              icon: '\u{1F3AF}',
              title: 'Free: 5 Product Ideas That Print Money',
              desc: 'AI-curated list of trending niches with high margins and low competition. Updated weekly.',
              tag: 'FREE REPORT',
              tagColor: '#3b82f6',
            },
            {
              icon: '\u{1F680}',
              title: 'Free: Launch Your Store in 10 Minutes',
              desc: 'Step-by-step guide from zero to your first sale. No experience needed. AI does the heavy lifting.',
              tag: 'FREE TUTORIAL',
              tagColor: '#8b5cf6',
            },
          ].map((resource, i) => (
            <a
              key={i}
              href="/shop/about"
              style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'block',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{resource.icon}</span>
                <span style={{
                  padding: '3px 8px',
                  background: `${resource.tagColor}15`,
                  border: `1px solid ${resource.tagColor}30`,
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: resource.tagColor,
                  letterSpacing: '0.05em',
                }}>
                  {resource.tag}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px', lineHeight: 1.3 }}>
                {resource.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                {resource.desc}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '48px 24px',
      }}>
        {/* Category Filter */}
        <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '10px 20px',
                  background: selectedCategory === category
                    ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                    : 'rgba(255,255,255,0.05)',
                  border: selectedCategory === category
                    ? 'none'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '24px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: selectedCategory === category ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {category}
              </button>
            ))}
            <span style={{
              marginLeft: 'auto',
              fontSize: '13px',
              color: '#64748b',
            }}>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
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
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '64px',
            background: 'rgba(255,0,0,0.1)',
            border: '1px solid rgba(255,0,0,0.3)',
            borderRadius: '16px',
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>{'\u26A0\uFE0F'}</span>
            <p style={{ color: '#ff6b6b', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={loadProducts}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '100px 24px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
          }}>
            <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>{'\u{1F3EA}'}</span>
            <h2 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '12px' }}>
              {searchQuery || selectedCategory !== 'All'
                ? 'No products found'
                : 'Shop is getting ready'}
            </h2>
            <p style={{ color: '#888', fontSize: '16px', marginBottom: '32px' }}>
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filter'
                : 'Check back soon for amazing digital products'}
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && filteredProducts.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${product.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  {/* Category Badge */}
                  {product.category && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      zIndex: 2,
                      padding: '4px 10px',
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#94a3b8',
                      letterSpacing: '0.5px',
                    }}>
                      {getCategoryIcon(product.category)} {product.category}
                    </div>
                  )}

                  {/* Product Image */}
                  <div style={{
                    height: '200px',
                    background: 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {product.image_url ? (
                      <img
                        src={getShopImageSrc(product.image_url)}
                        alt={stripHtml(product.name)}
                        data-direct-url={product.image_url}
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
                      <span style={{ fontSize: '64px', opacity: 0.5 }}>
                        {getCategoryIcon(product.category)}
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '20px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}>
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#888',
                      }}>
                        {product.category}
                      </span>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {'\u2605'}{'\u2605'}{'\u2605'}{'\u2605'}{'\u2605'}
                        <span style={{ color: '#f59e0b', marginLeft: '4px' }}>{(4.5 + ((parseInt(String(product.id), 10) || product.name.length) % 5) / 10).toFixed(1)}</span>
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#fff',
                    }}>
                      {stripHtml(product.name)}
                    </h3>

                    {product.description && (
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#888',
                          marginBottom: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {stripHtml(product.description).slice(0, 120)}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}>
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        by {product.seller_name}
                      </span>
                    </div>

                    {/* Urgency Indicator */}
                    <div style={{
                      marginTop: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#ef4444',
                      fontWeight: 600,
                    }}>
                      {(product.inventory_count ?? -1) > 0 ? (
                        <>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#ef4444', display: 'inline-block',
                            animation: 'pulse 1.5s ease infinite',
                          }} />
                          Only {product.inventory_count} left in stock
                        </>
                      ) : (
                        <>
                          <span style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#4ade80', display: 'inline-block',
                          }} />
                          In Stock
                        </>
                      )}
                    </div>

                    {/* Create Content CTA - only for logged-in sellers */}
                    {isLoggedIn && (
                      <a
                        href={`${MAIN_DOMAIN}/spacebaddie/studio?product=${product.id}&name=${encodeURIComponent(product.name)}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '10px',
                          padding: '6px 12px',
                          background: 'rgba(139,92,246,0.08)',
                          border: '1px solid rgba(139,92,246,0.15)',
                          borderRadius: '8px',
                          color: '#c4b5fd',
                          textDecoration: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                          width: 'fit-content',
                        }}
                      >
                        <span>{'\u{1F3AC}'}</span>
                        Create Content
                      </a>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </main>

      {/* Trust & Guarantee Section */}
      <section style={{
        maxWidth: '1400px',
        margin: '48px auto 0',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '32px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
        }}>
          {[
            { icon: '\u{1F512}', title: 'Secure Payments', desc: '256-bit SSL, Stripe protected' },
            { icon: '\u26A1', title: 'Instant Delivery', desc: 'Download in seconds' },
            { icon: '\u{1F6E1}\uFE0F', title: '30-Day Guarantee', desc: 'Full refund, no questions' },
            { icon: '\u{1F4AC}', title: 'AI-Powered Help', desc: 'Smart recommendations built in' },
          ].map((trust, i) => (
            <div key={i} style={{
              textAlign: 'center',
              padding: '12px',
            }}>
              <span style={{ fontSize: '28px', display: 'block', marginBottom: '10px' }}>{trust.icon}</span>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{trust.title}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{trust.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter Signup CTA */}
      <NewsletterSection />

      {/* Join The Movement CTA */}
      <section style={{
        maxWidth: '800px',
        margin: '48px auto 0',
        padding: '48px 32px',
        background: 'linear-gradient(135deg, rgba(255,0,110,0.06), rgba(138,43,226,0.06))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 800,
          marginBottom: '12px',
          color: '#fff',
          letterSpacing: '-0.5px',
        }}>
          Got Products? Start Selling Today.
        </h2>
        <p style={{
          fontSize: '15px',
          color: '#94a3b8',
          marginBottom: '28px',
          lineHeight: 1.6,
        }}>
          Start building your store on SpaceBaddie.
          AI-powered optimization. Instant setup. Zero upfront cost.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={LOGIN_SIGNUP_URL} style={{
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
            borderRadius: '12px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(255,0,110,0.3)',
          }}>
            {'\u{1F680}'} Start Selling Free
          </a>
          <Link href="/shop/about" style={{
            padding: '14px 32px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            color: '#cbd5e1',
            textDecoration: 'none',
            fontSize: '15px',
            fontWeight: 600,
          }}>
            Learn Our Story
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px',
        textAlign: 'center',
        marginTop: '64px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Link href="/shop" style={{ color: '#FF006E', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Shop</Link>
          <Link href="/shop/about" style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Our Story</Link>
          <a href={LOGIN_SIGNUP_URL} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Log in</a>
          <a href={`${MAIN_DOMAIN}/cart`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Cart</a>
          <a href={`${MAIN_DOMAIN}/track`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Track Order</a>
          <a href={`${MAIN_DOMAIN}/returns`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Returns</a>
          <a href={`${MAIN_DOMAIN}/refund`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Refund Policy</a>
          <a href={`${MAIN_DOMAIN}/shipping`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Shipping</a>
          <a href={`${MAIN_DOMAIN}/privacy`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Privacy</a>
          <a href={`${MAIN_DOMAIN}/terms`} style={{ color: '#64748b', textDecoration: 'none', fontSize: '13px' }}>Terms</a>
        </div>
        <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
          Powered by <a href="https://spacebaddie.com" style={{ color: '#FF006E', textDecoration: 'none' }}>SpaceBaddie</a>
        </p>
      </footer>

      {/* Email Capture Popup */}
      <EmailCapturePopup />

      {/* Animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

/** Inline newsletter signup section */
function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/shop/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'shop_footer', tags: ['footer_subscriber'] }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        if (typeof window !== 'undefined') localStorage.setItem('sb_popup_subscribed', 'true');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section style={{
      maxWidth: '800px',
      margin: '64px auto 0',
      padding: '40px 32px',
      background: 'linear-gradient(135deg, rgba(34,211,238,0.04), rgba(139,92,246,0.04))',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '24px',
      textAlign: 'center',
    }}>
      {status === 'success' ? (
        <>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>{'\u{1F389}'}</span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            You're on the list!
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>
            Check your inbox for a welcome surprise.
          </p>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.3px' }}>
            {'\u{1F4E7}'} Stay in the Loop
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
            New product drops, exclusive deals, and creator insights. No spam, ever.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '460px', margin: '0 auto' }}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                flex: 1,
                padding: '14px 18px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              style={{
                padding: '14px 24px',
                background: status === 'loading' ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {status === 'loading' ? '...' : 'Subscribe'}
            </button>
          </form>
          {status === 'error' && (
            <p style={{ fontSize: '12px', color: '#ef4444', marginTop: '8px' }}>Something went wrong. Try again.</p>
          )}
        </>
      )}
    </section>
  );
}
