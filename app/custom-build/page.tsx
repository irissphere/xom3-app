'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy redirect from /custom-build to /proposal
 * Keeps old links working while consolidating to the new proposal form
 */
export default function CustomBuildRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/proposal');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #070b14, #050810)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#94a3b8',
      fontSize: '16px',
    }}>
      Redirecting to proposal form...
    </div>
  );
}
