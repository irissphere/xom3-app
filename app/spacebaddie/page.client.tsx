'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/client';

export default function SpaceBaddieLanding() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          router.push('/spacebaddie/dashboard');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a20 50%, #0a0a0f 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid rgba(255,107,157,0.3)',
          borderTopColor: '#FF6B9D',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a20 50%, #0a0a0f 100%)',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Effects */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-200px',
          left: '20%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(138,43,226,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-200px',
          right: '20%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(255,0,110,0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(100px)',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 48px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>🎬</span>
          <span style={{
            fontSize: '24px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            SpaceBaddie
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/spacebaddie/studio" style={{
            color: '#888',
            textDecoration: 'none',
            fontSize: '14px',
            transition: 'color 0.2s',
          }}>
            Try Free
          </Link>
          <a 
            href="https://shop.spacebaddie.com" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#C77DFF',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Shop
            <span style={{
              fontSize: '10px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              padding: '2px 6px',
              borderRadius: '4px',
              color: '#fff',
            }}>NEW</span>
          </a>
          <Link href="/spacebaddie/login" style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
            borderRadius: '12px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'opacity 0.2s',
          }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 48px 120px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 800,
            marginBottom: '24px',
            lineHeight: 1.1,
          }}>
            Create Viral Videos
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 50%, #00D4D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              In 60 Seconds
            </span>
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#888',
            maxWidth: '600px',
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Turn any photo into a talking AI avatar. Upload once, post everywhere.
            Join 10,000+ creators making professional content daily.
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/spacebaddie/studio" style={{
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                borderRadius: '16px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '18px',
                boxShadow: '0 8px 32px rgba(255,0,110,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}>
                Try Free - No Sign Up
              </Link>
              <Link href="/spacebaddie/login?trial=true" style={{
                padding: '16px 32px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '16px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '18px',
                transition: 'background 0.2s',
              }}>
                Start 7-Day Trial
              </Link>
            </div>
            <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
              ✓ No credit card required • ✓ 5 free videos/month • ✓ Cancel anytime
            </p>
          </div>
        </div>

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '80px',
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            transition: 'border-color 0.2s, transform 0.2s',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
            <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>AI Avatar Videos</h3>
            <p style={{ color: '#888', lineHeight: 1.6 }}>
              Upload any photo and watch it come to life with realistic lip-sync and expressions.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            transition: 'border-color 0.2s, transform 0.2s',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
            <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>Natural Voices</h3>
            <p style={{ color: '#888', lineHeight: 1.6 }}>
              Choose from multiple voice styles - energetic, calm, professional, or friendly.
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            transition: 'border-color 0.2s, transform 0.2s',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
            <h3 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '12px' }}>Auto Social Posting</h3>
            <p style={{ color: '#888', lineHeight: 1.6 }}>
              Schedule and auto-post to TikTok, Instagram, YouTube, Twitter, and more.
            </p>
          </div>
        </div>

        {/* Shop Promo Banner */}
        <a 
          href="https://shop.spacebaddie.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginBottom: '80px',
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(199,125,255,0.15) 0%, rgba(255,107,157,0.15) 100%)',
            border: '1px solid rgba(199,125,255,0.3)',
            borderRadius: '20px',
            textDecoration: 'none',
            textAlign: 'center',
            transition: 'transform 0.2s, border-color 0.2s',
          }}
        >
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '32px' }}>🛍️</span>
            <span style={{
              fontSize: '12px',
              background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              padding: '4px 12px',
              borderRadius: '20px',
              color: '#fff',
              fontWeight: 700,
            }}>NEW</span>
          </div>
          <h3 style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            color: '#fff',
            marginBottom: '8px',
          }}>
            Visit the SpaceBaddie Shop
          </h3>
          <p style={{ color: '#888', fontSize: '16px', marginBottom: '16px' }}>
            Exclusive merch, digital products, and creator tools
          </p>
          <span style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: 600,
          }}>
            Shop Now →
          </span>
        </a>

        {/* Pricing */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '12px' }}>Simple Pricing</h2>
          <p style={{ color: '#888', marginBottom: '40px' }}>Start free, upgrade when you need more</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '32px',
            }}>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Free</h3>
              <p style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px' }}>
                $0<span style={{ fontSize: '18px', color: '#888', fontWeight: 400 }}>/mo</span>
              </p>
              <ul style={{ textAlign: 'left', color: '#888', listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                <li style={{ marginBottom: '12px' }}>✓ 5 videos/month</li>
                <li style={{ marginBottom: '12px' }}>✓ 720p quality</li>
                <li style={{ marginBottom: '12px' }}>✓ Basic avatars</li>
              </ul>
              <Link href="/spacebaddie/studio" style={{
                display: 'block',
                padding: '14px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                Get Started
              </Link>
            </div>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,0,110,0.15) 0%, rgba(138,43,226,0.15) 100%)',
              border: '2px solid rgba(255,0,110,0.5)',
              borderRadius: '20px',
              padding: '32px',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 16px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                MOST POPULAR
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Pro</h3>
              <p style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px' }}>
                $29<span style={{ fontSize: '18px', color: '#888', fontWeight: 400 }}>/mo</span>
              </p>
              <ul style={{ textAlign: 'left', color: '#ccc', listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                <li style={{ marginBottom: '12px' }}>✓ Unlimited videos</li>
                <li style={{ marginBottom: '12px' }}>✓ 1080p HD quality</li>
                <li style={{ marginBottom: '12px' }}>✓ No watermarks</li>
                <li style={{ marginBottom: '12px' }}>✓ Social automation</li>
              </ul>
              <Link href="/spacebaddie/login?plan=pro&trial=true" style={{
                display: 'block',
                padding: '14px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                borderRadius: '12px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                textAlign: 'center',
              }}>
                Start 7-Day Trial
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(255,0,110,0.15) 0%, rgba(138,43,226,0.15) 100%)',
          border: '1px solid rgba(255,0,110,0.3)',
          borderRadius: '24px',
          padding: '64px 32px',
        }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>Ready to Go Viral?</h2>
          <p style={{ color: '#888', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Join thousands of creators making professional AI videos every day.
          </p>
          <Link href="/spacebaddie/studio" style={{
            display: 'inline-block',
            padding: '16px 40px',
            background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
            borderRadius: '16px',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '18px',
            boxShadow: '0 8px 32px rgba(255,0,110,0.3)',
          }}>
            Create Your First Video Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '32px 48px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎬</span>
            <span style={{
              fontWeight: 600,
              background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              SpaceBaddie
            </span>
          </div>
          <div style={{ display: 'flex', gap: '24px', color: '#666', fontSize: '14px' }}>
            <Link href="/spacebaddie/pricing" style={{ color: '#666', textDecoration: 'none' }}>Pricing</Link>
            <Link href="/spacebaddie/studio" style={{ color: '#666', textDecoration: 'none' }}>Studio</Link>
            <Link href="/privacy" style={{ color: '#666', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#666', textDecoration: 'none' }}>Terms</Link>
          </div>
          <p style={{ color: '#444', fontSize: '14px' }}>© 2026 SpaceBaddie. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
