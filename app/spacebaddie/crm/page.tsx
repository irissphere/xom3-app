'use client';

import Link from 'next/link';
import DashboardShell from '../components/DashboardShell';

// SpaceBaddie CRM Page - Upgrade prompt to full xom3.io CRM
export default function SpaceBaddieCRMPage() {
  return (
    <DashboardShell>
      <div style={{ padding: '32px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            Creator CRM
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            Manage your audience, track engagement, and grow your creator business.
          </p>
          
          <div style={{
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              Unlock Full CRM
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
              Get access to the complete XOM3 CRM suite with lead management, 
              automation workflows, and advanced analytics.
            </p>
            <Link 
              href="https://xom3.io/pricing?from=spacebaddie&unlock=crm"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Upgrade to XOM3 Pro
            </Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
