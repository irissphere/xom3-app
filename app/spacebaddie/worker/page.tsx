'use client';

export default function SpaceBaddieWorkerPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 800 }}>Video Worker Status</h1>
        <p style={{ color: '#94a3b8' }}>GPU Worker Ready - RunPod InfiniteTalk Active</p>
      </div>
    </div>
  );
}
