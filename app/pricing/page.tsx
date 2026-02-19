'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { 
  AI_TIERS, 
  MESSAGING_PRICING, 
  SOCIAL_PRICING, 
  AUTOMATION_PRICING,
  AITier 
} from '@/lib/obols/pricing';

function PricingRow({ label, price, unit }: { label: string; price: number; unit: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ color: '#e2e8f0', fontSize: '15px' }}>{label}</span>
      <span style={{ 
        color: '#22d3ee', 
        fontFamily: 'var(--font-mono)', 
        fontWeight: 600,
        fontSize: '15px',
      }}>
        ${(price / 100).toFixed(2)}<span style={{ color: '#64748b', fontWeight: 400 }}>/{unit}</span>
      </span>
    </div>
  );
}

function SubscriptionTierCard({ 
  name, 
  price, 
  credits, 
  features, 
  popular, 
  onSelect,
  loading,
}: { 
  name: string; 
  price: string; 
  credits: string; 
  features: string[]; 
  popular?: boolean;
  onSelect: () => void;
  loading?: boolean;
}) {
  return (
    <div style={{
      padding: '32px',
      borderRadius: '20px',
      background: popular ? 'rgba(10, 132, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
      border: popular ? '2px solid #0a84ff' : '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {popular && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 12px',
          borderRadius: '12px',
          background: '#0a84ff',
          fontSize: '10px',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.08em',
        }}>
          MOST POPULAR
        </div>
      )}
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>{name}</div>
      <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>{price}</div>
      <div style={{ fontSize: '14px', color: '#22d3ee', fontWeight: 600, marginBottom: '24px' }}>Includes {credits} Obol credits</div>
      
      <div style={{ flex: 1, marginBottom: '24px' }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', color: '#94a3b8' }}>
            <span style={{ color: '#22c55e' }}>✓</span> {f}
          </div>
        ))}
      </div>

      <button
        onClick={onSelect}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          background: loading ? 'rgba(255,255,255,0.1)' : popular ? '#0a84ff' : 'rgba(255,255,255,0.05)',
          border: 'none',
          color: '#ffffff',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {loading ? 'Redirecting to checkout...' : `Choose ${name}`}
      </button>
    </div>
  );
}

function AITierCard({ tier, isSelected, onSelect }: { 
  tier: typeof AI_TIERS.fast; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isPopular = tier.id === 'balanced';
  
  return (
    <div
      onClick={onSelect}
      style={{
        position: 'relative',
        padding: '20px',
        borderRadius: '14px',
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(99, 102, 241, 0.1))'
          : 'rgba(255, 255, 255, 0.02)',
        border: isSelected
          ? '2px solid rgba(10, 132, 255, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.08)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        textAlign: 'center',
      }}
    >
      {isPopular && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 12px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
          fontSize: '10px',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.08em',
        }}>
          BEST VALUE
        </div>
      )}
      
      <div style={{
        fontSize: '16px',
        fontWeight: 700,
        color: isSelected ? '#ffffff' : '#e2e8f0',
        marginBottom: '4px',
        marginTop: isPopular ? '8px' : 0,
      }}>
        {tier.name}
      </div>
      
      <div style={{
        fontSize: '28px',
        fontWeight: 800,
        color: isSelected ? '#22d3ee' : '#94a3b8',
        fontFamily: 'var(--font-mono)',
        marginBottom: '4px',
      }}>
        {tier.priceLabel}
      </div>
      
      <div style={{
        fontSize: '12px',
        color: '#64748b',
        marginBottom: '12px',
      }}>
        per AI generation
      </div>
      
      <div style={{
        fontSize: '13px',
        color: '#94a3b8',
        lineHeight: 1.4,
      }}>
        {tier.description}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [selectedAITier, setSelectedAITier] = useState<AITier>('balanced');
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    setSubscribing(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      alert('Unable to start checkout. Please try again.');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '80px 24px 120px',
      color: '#e2e8f0',
    }}>
      {/* Top Nav */}
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
        <Link 
          href="/"
          style={{
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
          }}
        >
          ← xom3.io Home
        </Link>
        <Link 
          href="/credits"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.9), rgba(22, 163, 74, 0.85))',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Add Funds & Start
        </Link>
      </nav>

      <div style={{ 
        maxWidth: '900px', 
        margin: '0 auto',
        padding: '0 16px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '20px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#22c55e',
            letterSpacing: '0.08em',
            marginBottom: '20px',
          }}>
            PAY AS YOU GO • xom3.io
          </div>
          
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '16px',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}>
            Only Pay For What You Use
          </h1>
          
          <p style={{
            fontSize: '18px',
            color: '#94a3b8',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            No monthly fees. No surprises. No commitments.
            <br />
            <strong style={{ color: '#22c55e' }}>Transparent per-action pricing</strong> so you stay in control.
            <br />
            <span style={{ color: '#7dd3fc' }}>Obols credits: 1 Obol = $0.01 USD.</span>
          </p>
        </div>

        {/* Value Prop Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(10, 132, 255, 0.08))',
          border: '1px solid rgba(34, 197, 94, 0.25)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '64px',
          textAlign: 'center',
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: '12px',
          }}>
            Pay-As-You-Go with Obols
          </h2>
          
          <p style={{
            fontSize: '16px',
            color: '#94a3b8',
            marginBottom: '24px',
            maxWidth: '500px',
            margin: '0 auto 24px',
          }}>
            Add Obol credits whenever you need them. No monthly commitment required.
            <br />
            <strong style={{ color: '#22c55e' }}>1 Obol = $0.01 USD</strong>
          </p>

          <button
            onClick={() => router.push('/credits')}
            style={{
              padding: '16px 40px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              color: '#ffffff',
              fontSize: '17px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
            }}
          >
            Add Obols & Start →
          </button>
        </div>

        {/* Subscription Tiers */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
              Scale with a Monthly Plan
            </h2>
            <p style={{ color: '#94a3b8' }}>
              Unlock more features and get bonus Obol credits every month.
            </p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
          }}>
            <SubscriptionTierCard
              name="Starter"
              price="$49/mo"
              credits="$50"
              features={[
                '500 leads/mo',
                '20 social posts/mo',
                '5 active workflows',
                'CRM access',
                'Email support'
              ]}
              onSelect={() => handleSubscribe('starter')}
              loading={subscribing === 'starter'}
            />
            <SubscriptionTierCard
              name="Growth"
              price="$99/mo"
              credits="$100"
              popular
              features={[
                '1,000 leads/mo',
                '100 social posts/mo',
                '20 active workflows',
                'Appointment scheduling',
                'Basic ecommerce'
              ]}
              onSelect={() => handleSubscribe('growth')}
              loading={subscribing === 'growth'}
            />
            <SubscriptionTierCard
              name="Pro"
              price="$149/mo"
              credits="$200"
              features={[
                'Unlimited leads',
                'Unlimited social posts',
                'Unlimited workflows',
                'Voice call automation',
                'Priority support'
              ]}
              onSelect={() => handleSubscribe('pro')}
              loading={subscribing === 'pro'}
            />
          </div>
        </div>

        {/* Upgrade Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <div style={{
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            background: 'rgba(34, 197, 94, 0.08)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', marginBottom: '8px' }}>
              PAY-AS-YOU-GO (OBOLS)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              Flexible spend, no contracts
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
              Ideal for variable usage. Credits deduct per action across SMS, AI, automation, and social.
            </div>
          </div>
          <div style={{
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            background: 'rgba(99, 102, 241, 0.08)',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#a5b4fc', marginBottom: '8px' }}>
              SUBSCRIPTION PLANS
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              Predictable monthly, higher limits
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '12px' }}>
              Best for teams and heavy usage. Unlock higher caps, advanced workflows, and priority support.
            </div>
            <button
              onClick={() => router.push('/checkout')}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(10, 132, 255, 0.85))',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Upgrade to Subscription →
            </button>
          </div>
        </div>

        {/* AI Tier Selection */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '8px',
            }}>
              AI Quality Tiers
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
            }}>
              Choose your AI quality level. You can switch anytime — pick what fits your needs.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
          }}>
            {Object.values(AI_TIERS).map((tier) => (
              <AITierCard
                key={tier.id}
                tier={tier}
                isSelected={selectedAITier === tier.id}
                onSelect={() => setSelectedAITier(tier.id)}
              />
            ))}
          </div>
        </div>

        {/* Messaging & Social Pricing */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
        }}>
          {/* Messaging */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h4 style={{ 
              color: '#94a3b8', 
              fontSize: '12px', 
              fontWeight: 600, 
              letterSpacing: '0.1em', 
              marginBottom: '16px' 
            }}>
              MESSAGING
            </h4>
            <PricingRow label="SMS message" price={MESSAGING_PRICING.sms} unit="msg" />
            <PricingRow label="Email" price={MESSAGING_PRICING.email} unit="email" />
            <PricingRow label="Voice call" price={MESSAGING_PRICING.voice_minute} unit="min" />
          </div>

          {/* Social */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <h4 style={{ 
              color: '#94a3b8', 
              fontSize: '12px', 
              fontWeight: 600, 
              letterSpacing: '0.1em', 
              marginBottom: '16px' 
            }}>
              SOCIAL MEDIA
            </h4>
            <PricingRow label="Text post" price={SOCIAL_PRICING.post_text} unit="post" />
            <PricingRow label="Image post" price={SOCIAL_PRICING.post_image} unit="post" />
            <PricingRow label="Video post (yours)" price={SOCIAL_PRICING.post_video} unit="post" />
            <PricingRow label="AI-generated video" price={SOCIAL_PRICING.post_ai_video} unit="post" />
          </div>
        </div>

        {/* Automation Pricing */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <h4 style={{ 
            color: '#94a3b8', 
            fontSize: '12px', 
            fontWeight: 600, 
            letterSpacing: '0.1em', 
            marginBottom: '16px' 
          }}>
            AUTOMATION
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '0 32px' 
          }}>
            <PricingRow label="Workflow run" price={AUTOMATION_PRICING.workflow_run} unit="run" />
            <PricingRow label="Lead processing" price={AUTOMATION_PRICING.lead_process} unit="lead" />
            <PricingRow label="Web scrape" price={AUTOMATION_PRICING.scrape_request} unit="request" />
            <PricingRow label="Bandwidth" price={AUTOMATION_PRICING.scrape_per_gb} unit="GB" />
          </div>
        </div>

        {/* AI Pricing - Show selected tier */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
        }}>
          <h4 style={{ 
            color: '#94a3b8', 
            fontSize: '12px', 
            fontWeight: 600, 
            letterSpacing: '0.1em', 
            marginBottom: '16px' 
          }}>
            AI GENERATION ({AI_TIERS[selectedAITier].name.toUpperCase()})
          </h4>
          <PricingRow 
            label={`AI generation (${AI_TIERS[selectedAITier].name})`} 
            price={AI_TIERS[selectedAITier].pricePerGeneration} 
            unit="generation" 
          />
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(10, 132, 255, 0.08)',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#94a3b8',
          }}>
            Selected: {AI_TIERS[selectedAITier].description}
          </div>
        </div>

        {/* Example Cost Calculator */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '8px',
          }}>
            Example Monthly Costs
          </h3>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            marginBottom: '24px',
          }}>
            Estimated costs for common usage patterns (using {AI_TIERS[selectedAITier].name} AI tier)
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            {[
              {
                scenario: 'Light Usage',
                ai: 50,
                sms: 100,
                posts: 30,
                workflows: 20,
              },
              {
                scenario: 'Medium Usage',
                ai: 200,
                sms: 500,
                posts: 100,
                workflows: 100,
              },
              {
                scenario: 'Heavy Usage',
                ai: 500,
                sms: 1000,
                posts: 200,
                workflows: 300,
              },
            ].map((example) => {
              const aiCost = example.ai * AI_TIERS[selectedAITier].pricePerGeneration;
              const smsCost = example.sms * MESSAGING_PRICING.sms;
              const postCost = example.posts * SOCIAL_PRICING.post_text;
              const workflowCost = example.workflows * AUTOMATION_PRICING.workflow_run;
              const totalCost = aiCost + smsCost + postCost + workflowCost;

              return (
                <div
                  key={example.scenario}
                  style={{
                    padding: '20px',
                    background: 'rgba(10, 132, 255, 0.05)',
                    border: '1px solid rgba(10, 132, 255, 0.15)',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#ffffff',
                    marginBottom: '16px',
                  }}>
                    {example.scenario}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>{example.ai} AI calls</span>
                      <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                        ${(aiCost / 100).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>{example.sms} SMS</span>
                      <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                        ${(smsCost / 100).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>{example.posts} Posts</span>
                      <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                        ${(postCost / 100).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                      <span>{example.workflows} Workflows</span>
                      <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)' }}>
                        ${(workflowCost / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div style={{
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Total</span>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#22d3ee',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      ${(totalCost / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Always Free */}
        <div style={{
          padding: '20px 24px',
          background: 'rgba(10, 132, 255, 0.08)',
          borderRadius: '12px',
          border: '1px solid rgba(10, 132, 255, 0.2)',
          marginBottom: '48px',
        }}>
          <div style={{ color: '#5ac8fa', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>
            ✓ Always Included Free
          </div>
          <div style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
            Dashboard access • CRM • Appointment scheduling • Analytics • Reporting • Support
          </div>
        </div>

        {/* How It Works */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '48px',
        }}>
          {[
            { num: '1', title: 'Add Funds', desc: 'Start with any amount. $5 minimum to get going.' },
            { num: '2', title: 'Use Features', desc: 'Credits deduct as you use SMS, posts, AI, etc.' },
            { num: '3', title: 'Top Up Anytime', desc: 'Add more when needed. Set auto-reload to never run out.' },
          ].map((step) => (
            <div key={step.num} style={{
              textAlign: 'center',
              padding: '24px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '20px',
                fontWeight: 700,
                color: '#ffffff',
              }}>
                {step.num}
              </div>
              <h4 style={{ color: '#ffffff', marginBottom: '8px', fontWeight: 600 }}>{step.title}</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '16px',
          background: 'linear-gradient(180deg, rgba(167, 139, 250, 0.08), rgba(99, 102, 241, 0.05))',
          border: '1px solid rgba(167, 139, 250, 0.2)',
        }}>
          <h3 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#ffffff',
            marginBottom: '12px',
          }}>
            Need a Custom Build or Managed Services?
          </h3>
          <p style={{
            fontSize: '15px',
            color: '#94a3b8',
            marginBottom: '24px',
            maxWidth: '500px',
            margin: '0 auto 24px',
          }}>
            For high-volume users, custom integrations, or enterprise features — 
            let&apos;s build something tailored to your business.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/services')}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
                border: 'none',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(10, 132, 255, 0.2)',
              }}
            >
              View Managed Services →
            </button>
            <button
              onClick={() => router.push('/proposal')}
              style={{
                padding: '14px 32px',
                borderRadius: '12px',
                background: 'rgba(167, 139, 250, 0.15)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                color: '#a78bfa',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Request Custom Proposal
            </button>
          </div>
        </div>

        {/* Trust signals */}
        <div style={{
          marginTop: '48px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          flexWrap: 'wrap',
          fontSize: '14px',
          color: '#64748b',
        }}>
          <span>✓ No monthly fees</span>
          <span>✓ No contracts</span>
          <span>✓ Transparent pricing</span>
          <span>✓ Auto-reload option</span>
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          nav {
            flex-direction: column;
            gap: 12px;
            padding: 12px 16px !important;
          }
          
          nav > a {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }
        
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns: 'repeat(auto-fit"] {
            grid-template-columns: 1fr !important;
          }
          
          div[style*="gridTemplateColumns: 'repeat(2"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
