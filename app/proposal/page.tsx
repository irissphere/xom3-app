'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

interface Business {
  id: string;
  companyName: string;
  industry: string;
  integrations: string;
}

const INDUSTRIES = [
  'Healthcare / Medical',
  'Insurance / Benefits',
  'Real Estate',
  'Marketing / Advertising',
  'E-commerce / Retail',
  'Finance / Accounting',
  'Legal Services',
  'Construction / Trades',
  'Technology / SaaS',
  'Hospitality / Food Service',
  'Education',
  'Non-profit',
  'Other',
];

const TEAM_SIZES = ['1 (Solo)', '2-5', '6-10', '11-25', '26-50', '51-100', '100+'];

const TIMELINES = ['ASAP', 'Within 1 month', 'Within 3 months', 'Within 6 months', 'Just exploring'];

export default function ProposalPage() {
  const router = useRouter();
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const [contact, setContact] = useState({ name: '', email: '', phone: '', website: '', websiteUrl: '' });
  const [company, setCompany] = useState({ industry: '', teamSize: '' });
  const [businesses, setBusinesses] = useState<Business[]>([
    { id: '1', companyName: '', industry: '', integrations: '' },
  ]);
  const [requirements, setRequirements] = useState({
    timeline: 'ASAP',
    currentTools: '',
    painPoints: '',
    customNeeds: '',
  });

  const addBusiness = () => {
    setBusinesses([...businesses, { id: Date.now().toString(), companyName: '', industry: '', integrations: '' }]);
  };

  const removeBusiness = (id: string) => {
    if (businesses.length > 1) setBusinesses(businesses.filter((b) => b.id !== id));
  };

  const updateBusiness = (id: string, field: keyof Business, value: string) => {
    setBusinesses(businesses.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, company, businesses, requirements, submittedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Something went wrong');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#ffffff',
    fontSize: '16px',
    outline: 'none',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '20px',
    paddingRight: '44px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  };

  if (status === 'success') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #050810, #0a0f1a)', padding: '80px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '48px 40px', background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '20px', maxWidth: '500px' }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>✓</div>
          <h2 style={{ fontSize: '28px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>Thank you!</h2>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px' }}>
            Your proposal request has been submitted. We will be in contact with you within 24 hours.
          </p>
          <button onClick={() => router.push('/')} style={{ padding: '16px 40px', borderRadius: '999px', background: 'linear-gradient(135deg, #22d3ee, #6366f1)', color: '#000', fontWeight: 600, fontSize: '16px', border: 'none', cursor: 'pointer' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #050810, #0a0f1a)', padding: '60px 24px 80px' }}>
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px', padding: '32px 24px', background: 'rgba(34, 211, 238, 0.1)', borderRadius: '20px', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>XOM3 Custom Proposal Request</h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', maxWidth: '500px', margin: '0 auto' }}>
            Tell us about your businesses and we will prepare a custom proposal with pricing, timeline, and recommendations.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '40px', background: 'rgba(10, 14, 26, 0.9)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '20px' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#22d3ee', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(34, 211, 238, 0.2)' }}>Your Contact Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" placeholder="John Doe" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Work Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="email" placeholder="john@company.com" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" placeholder="(555) 123-4567" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company Website</label>
                <select value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} style={selectStyle}>
                  <option value="">Select...</option>
                  <option value="has_website">I have a website</option>
                  <option value="no_website">No website</option>
                  <option value="need_website">Need website built</option>
                </select>
                {contact.website === 'has_website' && (
                  <input 
                    type="url" 
                    placeholder="https://company.com" 
                    onChange={(e) => setContact({ ...contact, websiteUrl: e.target.value })} 
                    style={{ ...inputStyle, marginTop: '8px' }} 
                  />
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Primary Industry <span style={{ color: '#ef4444' }}>*</span></label>
                <select required value={company.industry} onChange={(e) => setCompany({ ...company, industry: e.target.value })} style={selectStyle}>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Team Size</label>
                <select value={company.teamSize} onChange={(e) => setCompany({ ...company, teamSize: e.target.value })} style={selectStyle}>
                  <option value="">Select team size...</option>
                  {TEAM_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#22d3ee', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(34, 211, 238, 0.2)' }}>Your Businesses</h2>
            {businesses.map((biz, idx) => (
              <div key={biz.id} style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#22d3ee' }}>BUSINESS #{idx + 1}</span>
                  {businesses.length > 1 && (
                    <button type="button" onClick={() => removeBusiness(biz.id)} style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '12px', cursor: 'pointer' }}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                    <input required type="text" placeholder="Acme Corp" value={biz.companyName} onChange={(e) => updateBusiness(biz.id, 'companyName', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Industry <span style={{ color: '#ef4444' }}>*</span></label>
                    <select required value={biz.industry} onChange={(e) => updateBusiness(biz.id, 'industry', e.target.value)} style={selectStyle}>
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <label style={labelStyle}>Key Integrations Needed</label>
                  <input type="text" placeholder="e.g., Salesforce, QuickBooks, Slack, Twilio..." value={biz.integrations} onChange={(e) => updateBusiness(biz.id, 'integrations', e.target.value)} style={inputStyle} />
                </div>
              </div>
            ))}
            <button type="button" onClick={addBusiness} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', background: 'rgba(34, 211, 238, 0.15)', border: '1px solid rgba(34, 211, 238, 0.3)', color: '#22d3ee', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              <span style={{ fontSize: '18px' }}>+</span> Add Another Business
            </button>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#22d3ee', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(34, 211, 238, 0.2)' }}>Additional Requirements</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Implementation Timeline</label>
              <select value={requirements.timeline} onChange={(e) => setRequirements({ ...requirements, timeline: e.target.value })} style={selectStyle}>
                {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Current Tools / Systems</label>
              <input type="text" placeholder="e.g., HubSpot CRM, Google Workspace, Slack..." value={requirements.currentTools} onChange={(e) => setRequirements({ ...requirements, currentTools: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Pain Points / Challenges</label>
              <textarea placeholder="What problems are you trying to solve?" value={requirements.painPoints} onChange={(e) => setRequirements({ ...requirements, painPoints: e.target.value })} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Specific Automation Needs</label>
              <textarea placeholder="e.g., Need to integrate with Salesforce, automate social media posting..." value={requirements.customNeeds} onChange={(e) => setRequirements({ ...requirements, customNeeds: e.target.value })} style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} />
            </div>
          </div>

          {status === 'error' && (
            <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '14px', marginBottom: '24px' }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" disabled={status === 'submitting'} style={{ width: '100%', padding: '18px', borderRadius: '14px', background: status === 'submitting' ? 'rgba(34, 211, 238, 0.4)' : 'linear-gradient(135deg, #22d3ee, #6366f1)', color: '#000', fontWeight: 700, fontSize: '16px', border: 'none', cursor: status === 'submitting' ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {status === 'submitting' ? 'Submitting...' : 'Submit Proposal Request'}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
          <span style={{ color: '#94a3b8' }}>XOM3</span> - Your Business, Extended
          <br />
          <a href="/" style={{ color: '#22d3ee', textDecoration: 'none' }}>xom3.io</a>{' | '}<a href="/pricing" style={{ color: '#22d3ee', textDecoration: 'none' }}>Pricing</a>
        </div>
      </div>
    </div>
  );
}
