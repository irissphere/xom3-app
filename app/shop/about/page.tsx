'use client';

import Link from 'next/link';

/** Canonical login/signup URL so links work from shop.spacebaddie.com and other domains */
const LOGIN_SIGNUP_URL = '/login';

export default function BrandStoryPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #0d1117)',
      color: '#e2e8f0',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* Header */}
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
            <a href={LOGIN_SIGNUP_URL} style={{
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
            <Link href="/shop" style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              borderRadius: '8px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              Shop Now
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        padding: '100px 24px 80px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at center top, rgba(255,0,110,0.12), transparent 60%), radial-gradient(ellipse at center bottom, rgba(138,43,226,0.08), transparent 60%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '64px', display: 'block', marginBottom: '24px' }}>{'\u{1F680}'}</span>
          <h1 style={{
            fontSize: '56px',
            fontWeight: 900,
            marginBottom: '20px',
            lineHeight: 1.1,
            letterSpacing: '-2px',
            background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 50%, #00D4D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            We Don&apos;t Follow Trends.
            <br />We Set Them.
          </h1>
          <p style={{
            fontSize: '20px',
            color: '#94a3b8',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 40px',
          }}>
            SpaceBaddie isn&apos;t just a store. It&apos;s a culture. A community of creators, 
            hustlers, and visionaries who refuse to be average.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/shop" style={{
              padding: '16px 36px',
              background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              borderRadius: '14px',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: '0 4px 20px rgba(255,0,110,0.3)',
            }}>
              {'\u26A1'} Join The Movement
            </Link>
            <a href={LOGIN_SIGNUP_URL} style={{
              padding: '16px 36px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              color: '#cbd5e1',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 600,
            }}>
              Start Selling
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section style={{
        maxWidth: '1000px',
        margin: '-40px auto 0',
        padding: '0 24px',
        position: 'relative',
        zIndex: 2,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
        }}>
          {[
            { num: '10K+', label: 'Active Creators' },
            { num: '50K+', label: 'Products Sold' },
            { num: '4.9', label: 'Avg Rating' },
            { num: '150+', label: 'Countries' },
          ].map((stat, i) => (
            <div key={i} style={{
              textAlign: 'center',
              padding: '28px 16px',
              background: 'rgba(7,11,20,0.95)',
              backdropFilter: 'blur(20px)',
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px',
              }}>
                {stat.num}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The Manifesto */}
      <section style={{
        maxWidth: '800px',
        margin: '80px auto 0',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 800,
          marginBottom: '32px',
          textAlign: 'center',
          color: '#fff',
          letterSpacing: '-1px',
        }}>
          The SpaceBaddie Manifesto
        </h2>
        <div style={{
          padding: '40px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          fontSize: '16px',
          lineHeight: 2,
          color: '#94a3b8',
        }}>
          <p style={{ marginBottom: '20px' }}>
            We believe the old way of doing business is <span style={{ color: '#FF006E', fontWeight: 700 }}>dead</span>.
          </p>
          <p style={{ marginBottom: '20px' }}>
            You don&apos;t need a million followers. You don&apos;t need investors. You don&apos;t need permission. 
            You need <span style={{ color: '#8A2BE2', fontWeight: 700 }}>vision</span>, <span style={{ color: '#FF006E', fontWeight: 700 }}>execution</span>, 
            and the right platform.
          </p>
          <p style={{ marginBottom: '20px' }}>
            SpaceBaddie was built for the creator who is <span style={{ color: '#fff', fontWeight: 600 }}>tired of being slept on</span>. 
            For the entrepreneur who knows their product is fire but hasn&apos;t found their audience yet.
          </p>
          <p style={{ marginBottom: '20px' }}>
            We combined <span style={{ color: '#00D4D4', fontWeight: 700 }}>AI-powered technology</span> with 
            real e-commerce expertise to give you an unfair advantage. Product optimization, 
            smart recommendations, automated marketing &mdash; all built in.
          </p>
          <p style={{ marginBottom: '0' }}>
            This isn&apos;t just a marketplace. This is where 
            <span style={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}> empires are built</span>.
          </p>
        </div>
      </section>

      {/* The Pillars */}
      <section style={{
        maxWidth: '1000px',
        margin: '80px auto 0',
        padding: '0 24px',
      }}>
        <h2 style={{
          fontSize: '32px',
          fontWeight: 800,
          marginBottom: '48px',
          textAlign: 'center',
          color: '#fff',
          letterSpacing: '-1px',
        }}>
          What Makes Us Different
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {[
            {
              icon: '\u{1F9E0}',
              title: 'AI That Actually Works',
              desc: 'Our AI doesn\'t just generate text. It analyzes market trends, optimizes your listings for conversions, suggests pricing strategies, and writes copy that sells. This is enterprise-level intelligence, free for every seller.',
              gradient: 'rgba(139,92,246,0.1)',
              border: 'rgba(139,92,246,0.2)',
            },
            {
              icon: '\u{1F525}',
              title: 'Culture-First Commerce',
              desc: 'We don\'t sell commodities. Every product on SpaceBaddie has a story, a creator behind it, and a community around it. We build brands, not just stores.',
              gradient: 'rgba(255,0,110,0.1)',
              border: 'rgba(255,0,110,0.2)',
            },
            {
              icon: '\u{1F6E1}\uFE0F',
              title: 'Zero Risk for Buyers',
              desc: 'Every single purchase is backed by our 30-day guarantee. Secure payments through Stripe. Instant delivery. Real-time order tracking. We built trust into every pixel.',
              gradient: 'rgba(34,197,94,0.1)',
              border: 'rgba(34,197,94,0.2)',
            },
            {
              icon: '\u{1F4E1}',
              title: 'Multi-Channel Ready',
              desc: 'Sell on SpaceBaddie, promote on TikTok, scale to Amazon. Our platform is built to grow with you from your first dollar to your first million.',
              gradient: 'rgba(59,130,246,0.1)',
              border: 'rgba(59,130,246,0.2)',
            },
            {
              icon: '\u26A1',
              title: 'Speed is Everything',
              desc: 'Instant store setup. Instant product listing. Instant delivery to buyers. Instant payouts. We stripped away every bottleneck so you can move fast.',
              gradient: 'rgba(245,158,11,0.1)',
              border: 'rgba(245,158,11,0.2)',
            },
            {
              icon: '\u{1F91D}',
              title: 'Creator Community',
              desc: 'You\'re not alone. Join thousands of creators sharing strategies, supporting each other, and building together. The network is the net worth.',
              gradient: 'rgba(236,72,153,0.1)',
              border: 'rgba(236,72,153,0.2)',
            },
          ].map((pillar, i) => (
            <div key={i} style={{
              padding: '28px',
              background: pillar.gradient,
              border: `1px solid ${pillar.border}`,
              borderRadius: '20px',
              transition: 'transform 0.2s',
            }}>
              <span style={{ fontSize: '36px', display: 'block', marginBottom: '16px' }}>{pillar.icon}</span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>
                {pillar.title}
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#94a3b8', margin: 0 }}>
                {pillar.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        maxWidth: '800px',
        margin: '80px auto',
        padding: '60px 40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(255,0,110,0.08), rgba(138,43,226,0.08))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
      }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 800,
          marginBottom: '16px',
          color: '#fff',
          letterSpacing: '-1px',
        }}>
          Ready to Level Up?
        </h2>
        <p style={{
          fontSize: '17px',
          color: '#94a3b8',
          marginBottom: '36px',
          lineHeight: 1.6,
        }}>
          Whether you&apos;re a buyer looking for the best digital products
          or a creator ready to build your empire &mdash; this is where it starts.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/shop" style={{
            padding: '18px 40px',
            background: 'linear-gradient(135deg, #FF006E, #8A2BE2)',
            borderRadius: '14px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '17px',
            fontWeight: 700,
            boxShadow: '0 4px 20px rgba(255,0,110,0.3)',
          }}>
            {'\u{1F6CD}\uFE0F'} Browse Products
          </Link>
          <a href={LOGIN_SIGNUP_URL} style={{
            padding: '18px 40px',
            background: 'rgba(255,255,255,0.04)',
            border: '2px solid rgba(255,255,255,0.15)',
            borderRadius: '14px',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '17px',
            fontWeight: 700,
          }}>
            {'\u{1F680}'} Start Selling Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Link href="/shop" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Shop</Link>
          <Link href="/shop/about" style={{ color: '#FF006E', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Our Story</Link>
          <Link href="/cart" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Cart</Link>
          <Link href="/track" style={{ color: '#475569', textDecoration: 'none', fontSize: '13px' }}>Track Order</Link>
        </div>
        <p style={{ color: '#334155', fontSize: '13px', margin: 0 }}>
          Powered by <a href="https://spacebaddie.com" style={{ color: '#8b5cf6', textDecoration: 'none' }}>SpaceBaddie</a>
        </p>
      </footer>
    </div>
  );
}
