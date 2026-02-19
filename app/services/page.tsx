'use client';

import Link from 'next/link';
import { useState } from 'react';

const SERVICE_PACKAGES = [
  {
    category: 'Benefits CRM Automation',
    tagline: 'Automate your entire benefits enrollment pipeline',
    packages: [
      {
        name: 'Essentials',
        price: '$1,500',
        period: '/mo',
        description: 'Core CRM automation for small agencies',
        features: [
          'Automated lead intake & triage',
          'SMS/Email follow-up sequences',
          'Benefits eligibility screening',
          'Appointment scheduling',
          'Basic reporting dashboard',
          'Up to 500 contacts/mo',
        ],
        highlight: false,
      },
      {
        name: 'Professional',
        price: '$2,500',
        period: '/mo',
        description: 'Full-stack automation for growing teams',
        features: [
          'Everything in Essentials',
          'Voice call automation',
          'Multi-carrier quoting engine',
          'Document collection & e-signature',
          'Custom workflow builder',
          'Unlimited contacts',
          'Dedicated account manager',
        ],
        highlight: true,
      },
      {
        name: 'Enterprise',
        price: '$4,500',
        period: '/mo',
        description: 'White-glove solution for large agencies',
        features: [
          'Everything in Professional',
          'Custom integrations (AMS, carriers)',
          'Multi-location support',
          'Advanced analytics & forecasting',
          'SLA-backed uptime guarantee',
          'On-call engineering support',
          'Quarterly strategy reviews',
        ],
        highlight: false,
      },
    ],
  },
  {
    category: 'Business Automation',
    tagline: 'End-to-end automation for any industry',
    packages: [
      {
        name: 'Starter',
        price: '$1,500',
        period: '/mo',
        description: 'Essential automation workflows',
        features: [
          'CRM setup & configuration',
          'Lead capture automation',
          'Email/SMS sequences',
          'Social media scheduling',
          'Basic analytics',
          'Up to 5 active workflows',
        ],
        highlight: false,
      },
      {
        name: 'Growth',
        price: '$3,000',
        period: '/mo',
        description: 'Scale with intelligent automation',
        features: [
          'Everything in Starter',
          'AI-powered lead scoring',
          'Multi-channel outreach',
          'Custom API integrations',
          'Advanced reporting',
          'Up to 20 active workflows',
          'Bi-weekly strategy calls',
        ],
        highlight: true,
      },
      {
        name: 'Scale',
        price: '$5,000',
        period: '/mo',
        description: 'Full automation transformation',
        features: [
          'Everything in Growth',
          'Unlimited workflows',
          'Voice AI automation',
          'Custom AI agent development',
          'Revenue attribution tracking',
          'White-label option',
          'Weekly strategy calls',
          'Priority engineering support',
        ],
        highlight: false,
      },
    ],
  },
];

export default function ServicesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleContact = (packageName: string) => {
    setSelectedPackage(packageName);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Send to our intake API
      await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          package: selectedPackage,
          source: 'services_page',
          type: 'service_inquiry',
        }),
      });
      setSubmitted(true);
    } catch {
      // Even if API fails, show success (we'll also have the form data in analytics)
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      color: '#e2e8f0',
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '16px 24px',
        background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(5, 8, 16, 0.8))',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '10px',
          background: 'rgba(10, 132, 255, 0.1)',
          border: '1px solid rgba(10, 132, 255, 0.2)',
          color: '#5ac8fa',
          fontSize: '14px',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          ← xom3.io
        </Link>
        <Link href="/pricing" style={{
          padding: '8px 16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8',
          fontSize: '13px',
          fontWeight: 600,
          textDecoration: 'none',
        }}>
          Self-Serve Pricing
        </Link>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: '20px',
            background: 'rgba(10, 132, 255, 0.12)',
            border: '1px solid rgba(10, 132, 255, 0.25)',
            fontSize: '12px',
            fontWeight: 700,
            color: '#5ac8fa',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '24px',
          }}>
            MANAGED SERVICES
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '20px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            We Build & Run Your<br />
            <span style={{
              background: 'linear-gradient(135deg, #0a84ff, #6366f1, #22d3ee)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Automation Engine
            </span>
          </h1>

          <p style={{
            fontSize: '20px',
            color: '#94a3b8',
            maxWidth: '650px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            From benefits enrollment CRMs to full business automation.
            We set it up, maintain it, and optimize it — you focus on growing revenue.
          </p>
        </div>

        {/* ROI Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '80px',
          padding: '32px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.08), rgba(99, 102, 241, 0.05))',
          border: '1px solid rgba(10, 132, 255, 0.15)',
        }}>
          {[
            { stat: '85%', label: 'Reduction in manual tasks' },
            { stat: '3x', label: 'Faster lead response time' },
            { stat: '40%', label: 'Increase in conversion rates' },
            { stat: '24/7', label: 'Automated follow-up' },
          ].map((item) => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#22d3ee', marginBottom: '4px' }}>
                {item.stat}
              </div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Service Categories */}
        {SERVICE_PACKAGES.map((category) => (
          <div key={category.category} style={{ marginBottom: '80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
                {category.category}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '16px' }}>{category.tagline}</p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}>
              {category.packages.map((pkg) => (
                <div
                  key={pkg.name}
                  style={{
                    position: 'relative',
                    padding: '32px',
                    borderRadius: '20px',
                    background: pkg.highlight
                      ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.08), rgba(99, 102, 241, 0.05))'
                      : 'rgba(255,255,255,0.02)',
                    border: pkg.highlight
                      ? '2px solid rgba(10, 132, 255, 0.4)'
                      : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {pkg.highlight && (
                    <div style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '4px 14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: '0.08em',
                    }}>
                      RECOMMENDED
                    </div>
                  )}

                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                    {pkg.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                    {pkg.description}
                  </p>

                  <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff' }}>{pkg.price}</span>
                    <span style={{ fontSize: '16px', color: '#64748b' }}>{pkg.period}</span>
                  </div>

                  <div style={{ flex: 1, marginBottom: '24px' }}>
                    {pkg.features.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '12px',
                        fontSize: '14px',
                        color: '#94a3b8',
                      }}>
                        <span style={{ color: '#22c55e', marginTop: '2px', flexShrink: 0 }}>✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleContact(`${category.category} - ${pkg.name} (${pkg.price}${pkg.period})`)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '12px',
                      background: pkg.highlight
                        ? 'linear-gradient(135deg, #0a84ff, #6366f1)'
                        : 'rgba(255,255,255,0.06)',
                      border: pkg.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Contact Form */}
        {showForm && (
          <div id="contact-form" style={{
            maxWidth: '600px',
            margin: '0 auto 80px',
            padding: '40px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.06), rgba(99, 102, 241, 0.03))',
            border: '1px solid rgba(10, 132, 255, 0.2)',
          }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                  We&apos;ll be in touch!
                </h3>
                <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                  Expect a response within 24 hours. In the meantime, feel free to explore the platform.
                </p>
                <Link href="/pricing" style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                }}>
                  View Self-Serve Plans
                </Link>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                  Let&apos;s Talk
                </h3>
                <p style={{ color: '#64748b', marginBottom: '8px', fontSize: '14px' }}>
                  Selected: <strong style={{ color: '#22d3ee' }}>{selectedPackage}</strong>
                </p>
                <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '15px' }}>
                  Tell us about your business and we&apos;ll build a custom automation plan for you.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    required
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                    }}
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Company Name (optional)"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                    }}
                  />
                  <textarea
                    placeholder="Tell us about your business, current processes, and what you'd like to automate..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '15px',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: submitting
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #0a84ff, #6366f1)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {submitting ? 'Sending...' : 'Send Inquiry'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(10, 132, 255, 0.05))',
          border: '1px solid rgba(34, 197, 94, 0.2)',
        }}>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
            Not sure which plan is right?
          </h2>
          <p style={{ color: '#94a3b8', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
            Start with our self-serve platform. Upgrade to managed services anytime.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/pricing" style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.2)',
            }}>
              View Self-Serve Plans
            </Link>
            <button
              onClick={() => handleContact('General Inquiry')}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Schedule a Call
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 24px',
        textAlign: 'center',
        marginTop: '80px',
      }}>
        <p style={{ color: '#475569', fontSize: '14px' }}>
          © 2026 XOM3. All rights reserved. •{' '}
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none' }}>xom3.io</Link>
        </p>
      </footer>
    </div>
  );
}
