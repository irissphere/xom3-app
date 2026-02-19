import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'SpaceBaddie - AI Video Creation';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui',
        }}
      >
        {/* Logo placeholder - astronaut helmet shape */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6b7280, #374151)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            border: '4px solid #1f2937',
          }}
        >
          <div
            style={{
              fontSize: 100,
              background: 'linear-gradient(135deg, #ec4899, #be185d)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            â™¥
          </div>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6, #06b6d4)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          SpaceBaddie
        </div>
        <div style={{ fontSize: 36, color: '#94a3b8', marginTop: 16 }}>
          AI Video Creation Platform
        </div>
        <div style={{ fontSize: 28, color: '#ec4899', marginTop: 24 }}>
          Unlimited Videos â€¢ $29.99/month
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}