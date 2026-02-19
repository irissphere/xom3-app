'use client';

import { useState } from 'react';

type Pillar = {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  gradient: string;
  details: {
    headline: string;
    points: string[];
    cta: string;
  };
};

const pillars: Pillar[] = [
  {
    id: 'leads',
    icon: '⚡',
    title: 'Lead Engine',
    tagline: 'Qualified leads delivered daily',
    gradient: 'linear-gradient(135deg, #0a84ff, #5ac8fa)',
    details: {
      headline: 'Your Pipeline, Always Full',
      points: [
        'AI-powered prospecting finds your ideal customers',
        'Leads scored and qualified before they hit your CRM',
        'Daily delivery — no manual searching required',
        'Industry-specific targeting for higher conversion',
      ],
      cta: 'Activate Lead Engine',
    },
  },
  {
    id: 'followups',
    icon: '📱',
    title: 'Auto Follow-ups',
    tagline: 'Instant SMS sequences that close',
    gradient: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
    details: {
      headline: 'Never Miss a Lead Again',
      points: [
        'Instant SMS response within seconds of inquiry',
        'Multi-touch sequences nurture cold to warm',
        'Smart timing optimized for response rates',
        'Appointment booking built into every flow',
      ],
      cta: 'Activate Follow-ups',
    },
  },
  {
    id: 'social',
    icon: '📡',
    title: 'Social Broadcast',
    tagline: 'Content posted while you sleep',
    gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    details: {
      headline: 'Your Brand, Everywhere',
      points: [
        'Auto-post across all major platforms daily',
        'Content calendar managed for you',
        'Trend-aware posting for maximum reach',
        'Consistent presence without the time drain',
      ],
      cta: 'Activate Broadcasting',
    },
  },
];

export function ValueSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section style={{
      position: 'relative',
      padding: '120px 32px',
      background: 'linear-gradient(180deg, rgba(5, 8, 16, 0.95), rgba(7, 11, 20, 0.98))',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'rgba(90, 200, 250, 0.8)',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}>
            The Core
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            Three Engines. One System.
          </h2>
        </div>

        {/* Pillars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}>
          {pillars.map((pillar) => {
            const isExpanded = expanded === pillar.id;
            
            return (
              <div
                key={pillar.id}
                onClick={() => setExpanded(isExpanded ? null : pillar.id)}
                style={{
                  position: 'relative',
                  padding: '36px 28px',
                  borderRadius: '20px',
                  background: isExpanded 
                    ? 'rgba(10, 14, 26, 0.95)'
                    : 'rgba(10, 14, 26, 0.65)',
                  border: `1px solid ${isExpanded ? 'rgba(90, 200, 250, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                  cursor: 'pointer',
                  transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'hidden',
                  boxShadow: isExpanded 
                    ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(10, 132, 255, 0.08)'
                    : '0 4px 20px rgba(0, 0, 0, 0.2)',
                }}
                onMouseOver={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.borderColor = 'rgba(90, 200, 250, 0.25)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }
                }}
              >
                {/* Gradient accent line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: pillar.gradient,
                  opacity: isExpanded ? 1 : 0.6,
                  transition: 'opacity 280ms ease',
                }} />

                {/* Icon */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: pillar.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  marginBottom: '20px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                }}>
                  {pillar.icon}
                </div>

                {/* Title */}
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '8px',
                }}>
                  {pillar.title}
                </h3>

                {/* Tagline */}
                <p style={{
                  fontSize: '15px',
                  color: 'rgba(247, 248, 255, 0.6)',
                  lineHeight: 1.5,
                  marginBottom: isExpanded ? '24px' : '16px',
                }}>
                  {pillar.tagline}
                </p>

                {/* Expand indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#5ac8fa',
                  opacity: isExpanded ? 0 : 1,
                  transition: 'opacity 200ms ease',
                }}>
                  <span>Learn more</span>
                  <span style={{ fontSize: '16px' }}>→</span>
                </div>

                {/* Expanded Content */}
                <div style={{
                  maxHeight: isExpanded ? '400px' : '0',
                  opacity: isExpanded ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  <div style={{
                    paddingTop: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  }}>
                    <h4 style={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: '#5ac8fa',
                      marginBottom: '16px',
                    }}>
                      {pillar.details.headline}
                    </h4>

                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {pillar.details.points.map((point, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '14px',
                            color: 'rgba(247, 248, 255, 0.8)',
                            lineHeight: 1.5,
                          }}
                        >
                          <span style={{
                            color: '#5ac8fa',
                            fontSize: '12px',
                            marginTop: '3px',
                          }}>✓</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile hint */}
        <p style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'rgba(247, 248, 255, 0.4)',
          marginTop: '32px',
        }}>
          Click any pillar to learn more
        </p>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          section > div > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
