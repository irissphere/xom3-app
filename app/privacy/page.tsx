export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <div style={{ fontSize: '16px', lineHeight: '1.8', color: '#94a3b8' }}>
        <p style={{ marginBottom: '24px' }}>
          Last updated: January 1, 2026
        </p>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Data Collection
          </h2>
          <p>
            We collect information you provide directly to us, including name, email, phone number, 
            and business information when you use our services.
          </p>
        </section>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Data Usage
          </h2>
          <p>
            We use your information to provide, maintain, and improve our services, process transactions, 
            and communicate with you about your account.
          </p>
        </section>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Data Protection
          </h2>
          <p>
            We implement appropriate security measures to protect your personal information. 
            However, no method of transmission over the Internet is 100% secure.
          </p>
        </section>
        <section>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
            Contact
          </h2>
          <p>
            For questions about this privacy policy, contact us at support@xom3.io
          </p>
        </section>
      </div>
    </div>
  );
}















