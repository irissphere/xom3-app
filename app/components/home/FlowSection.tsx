'use client';

export function FlowSection() {
  const steps = [
    {
      step: '01',
      title: 'Connect Your Business',
      desc: 'Link your existing systems or start fresh. We configure everything for your industry and goals.',
    },
    {
      step: '02',
      title: 'Activate Automation',
      desc: 'Turn on lead capture, follow-up sequences, and social posting. Watch your pipeline fill.',
    },
    {
      step: '03',
      title: 'Close More Deals',
      desc: 'Your engine runs 24/7. You focus on what matters: talking to qualified leads and closing.',
    },
  ];

  return (
    <section style={{
      position: 'relative',
      padding: '120px 32px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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
            Simple Process
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            How It Works
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {steps.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'flex-start',
                position: 'relative',
                paddingBottom: i < steps.length - 1 ? '48px' : '0',
              }}
            >
              {/* Step Number */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(99, 102, 241, 0.15))',
                  border: '1px solid rgba(90, 200, 250, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#5ac8fa',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {item.step}
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: '2px',
                    height: '48px',
                    background: 'linear-gradient(180deg, rgba(90, 200, 250, 0.3), transparent)',
                    marginTop: '8px',
                  }} />
                )}
              </div>

              {/* Content */}
              <div style={{ paddingTop: '8px' }}>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#ffffff',
                  marginBottom: '10px',
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '16px',
                  color: 'rgba(247, 248, 255, 0.65)',
                  lineHeight: 1.7,
                  margin: 0,
                  maxWidth: '500px',
                }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
