"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentMonitoringRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the operator dashboard
    router.replace("/operator/dashboard");
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #0f172a, #1e293b)',
      color: 'white',
      fontFamily: 'monospace'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
        <div>Redirecting to Agent Monitoring Dashboard...</div>
      </div>
    </div>
  );
}


