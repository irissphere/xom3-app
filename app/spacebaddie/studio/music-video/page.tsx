'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Music video is now a style within the main Studio.
 * Redirect to Studio with music-video style pre-selected.
 * For advanced stitch flow (song upload + multi-scene), use a dedicated route later if needed.
 */
export default function MusicVideoRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/spacebaddie/studio?style=music-video');
  }, [router]);
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#888',
    }}>
      <p>Redirecting to Studio with Music video style…</p>
    </div>
  );
}
