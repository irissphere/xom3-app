'use client';

import DashboardShell from '../components/DashboardShell';

// SpaceBaddie Insights Page
export default function SpaceBaddieInsightsPage() {
  return (
    <DashboardShell>
      <div style={{ padding: '32px' }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            Creator Insights
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
            Analytics and insights to help you grow your content business.
          </p>
          
          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '16px',
            padding: '32px',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>
              Coming Soon
            </h2>
            <p style={{ color: '#94a3b8' }}>
              Insights features are in development. Subscribe to get notified when they launch.
            </p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
