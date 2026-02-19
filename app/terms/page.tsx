export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      padding: '80px 32px',
      color: '#ffffff',
      maxWidth: '800px',
      margin: '0 auto',
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
        Terms of Service
      </h1>
      <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#94a3b8' }}>
        <p style={{ marginBottom: '24px' }}>
          Last updated: January 1, 2026
        </p>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Acceptance of Terms
          </h2>
          <p>
            By accessing and using XOM3 services, you accept and agree to be bound by these Terms of Service.
          </p>
        </section>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Service Description
          </h2>
          <p>
            XOM3 provides automated lead generation, CRM, and business automation services. 
            Services are provided &quot;as is&quot; and subject to availability.
          </p>
        </section>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            User Responsibilities
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activities 
            that occur under your account.
          </p>
        </section>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Payment and Billing
          </h2>
          <p>
            Subscription fees are billed in advance. You may cancel your subscription at any time. 
            Refunds are subject to our refund policy.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Contact
          </h2>
          <p>
            For questions about these terms, contact us at support@xom3.io
          </p>
        </section>
      </div>
    </div>
  );
}















