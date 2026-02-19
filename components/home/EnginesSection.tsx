'use client';

import { useState } from 'react';
import Link from 'next/link';

type Engine = {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
  details: {
    headline: string;
    points: string[];
  };
};

const engines: Engine[] = [
  {
    id: 'lead-engine',
    icon: '⚡',
    title: 'Lead Engine',
    description: 'Qualified leads delivered daily',
    gradient: 'linear-gradient(135deg, #0a84ff, #5ac8fa)',
    details: {
      headline: 'Your Pipeline, Always Full',
      points: [
        'AI-powered prospecting finds your ideal customers',
        'Leads scored and qualified before they hit your CRM',
        'Daily delivery — no manual searching required',
        'Industry-specific targeting for higher conversion',
        'Multi-source lead capture from social, web, and email',
      ],
    },
  },
  {
    id: 'auto-followups',
    icon: '📱',
    title: 'Auto Follow-ups',
    description: 'Instant SMS sequences that close',
    gradient: 'linear-gradient(135deg, #22d3ee, #0ea5e9)',
    details: {
      headline: 'Never Miss a Lead Again',
      points: [
        'Instant SMS response within seconds of inquiry',
        'Multi-touch sequences nurture cold to warm',
        'Smart timing optimized for response rates',
        'Appointment booking built into every flow',
        'Automated follow-up scheduling and reminders',
      ],
    },
  },
  {
    id: 'social-broadcast',
    icon: '📡',
    title: 'Social Broadcast',
    description: 'Content posted while you sleep',
    gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    details: {
      headline: 'Your Brand, Everywhere',
      points: [
        'Auto-post across all major platforms daily',
        'Content calendar managed for you',
        'Trend-aware posting for maximum reach',
        'Consistent presence without the time drain',
        'Engagement tracking and lead detection built-in',
      ],
    },
  },
  {
    id: 'spacebaddie-studio',
    icon: '🎭',
    title: 'SpaceBaddie Studio',
    description: 'Interactive avatar & video production',
    gradient: 'linear-gradient(135deg, #f472b6, #db2777)',
    details: {
      headline: 'Create Like a Pro',
      points: [
        'Drag-joystick camera control for perfect shots',
        'Photo-to-Video AI pipeline',
        'Real-time avatar customization',
        'Direct integration with Social Broadcast',
        'Monetize your content instantly',
      ],
    },
  },
];

export function EnginesSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="xom3-section xom3-sectionAlt">
      <div className="xom3-container">
        <div className="xom3-center xom3-mbXl">
          <h2 className="xom3-h2">What XOM3 Does For You</h2>
          <p className="xom3-subtle xom3-mtSm">Four powerful engines working together.</p>
        </div>

        <div 
          className="xom3-grid" 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px' 
          }}
        >
          {engines.map((engine) => {
            const isExpanded = expanded === engine.id;

            return (
              <div
                key={engine.id}
                className="xom3-glass xom3-glassEdge xom3-card"
                style={{
                  cursor: 'pointer',
                  transition: 'all 280ms cubic-bezier(0.4, 0, 0.2, 1)',
                  border: isExpanded ? '1px solid rgba(90, 200, 250, 0.35)' : undefined,
                  boxShadow: isExpanded
                    ? '0 24px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(10, 132, 255, 0.08)'
                    : undefined,
                }}
                onClick={() => setExpanded(isExpanded ? null : engine.id)}
                onMouseOver={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div className="xom3-engine">
                  {/* Gradient accent line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: engine.gradient,
                      opacity: isExpanded ? 1 : 0.6,
                      transition: 'opacity 280ms ease',
                      borderRadius: '20px 20px 0 0',
                    }}
                  />

                  <div className="xom3-engineIcon" style={{ marginTop: '8px' }}>
                    {engine.icon}
                  </div>
                  <h3 className="xom3-h3 xom3-engineTitle">{engine.title}</h3>
                  <p className="xom3-body xom3-engineDesc">{engine.description}</p>

                  {/* Learn more button */}
                  <Link
                    href={engine.id === 'lead-engine' ? '/learn/lead-engine' : engine.id === 'auto-followups' ? '/learn/auto-followups' : engine.id === 'social-broadcast' ? '/learn/social-broadcast' : '/spacebaddie'}
                    className="xom3-btn xom3-btnSecondary xom3-engineCta"
                    style={{
                      marginTop: 'auto',
                      opacity: isExpanded ? 0 : 1,
                      transition: 'opacity 200ms ease',
                      pointerEvents: isExpanded ? 'none' : 'auto',
                      textDecoration: 'none',
                      display: 'block',
                      textAlign: 'center',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    Learn more →
                  </Link>

                  {/* Expanded Content */}
                  <div
                    style={{
                      maxHeight: isExpanded ? '600px' : '0',
                      opacity: isExpanded ? 1 : 0,
                      overflow: 'hidden',
                      transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div
                      style={{
                        paddingTop: '24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        marginTop: '20px',
                      }}
                    >
                      <h4
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: '#5ac8fa',
                          marginBottom: '20px',
                          textAlign: 'center',
                        }}
                      >
                        {engine.details.headline}
                      </h4>

                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          textAlign: 'left',
                        }}
                      >
                        {engine.details.points.map((point, i) => (
                          <li
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                              fontSize: '14px',
                              color: 'rgba(247, 248, 255, 0.8)',
                              lineHeight: 1.6,
                            }}
                          >
                            <span
                              style={{
                                color: '#5ac8fa',
                                fontSize: '12px',
                                marginTop: '4px',
                                flexShrink: 0,
                              }}
                            >
                              ✓
                            </span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        className="xom3-btn xom3-btnSecondary"
                        style={{
                          marginTop: '24px',
                          width: '100%',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpanded(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 900px) {
          .xom3-grid.xom3-grid3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
