'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureGate } from '@/lib/hooks/useFeatureGate';
import { FeatureKey, SubscriptionTier } from '@/lib/tiers/types';
import { getTierConfig } from '@/lib/tiers/features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  tier?: SubscriptionTier; // Override tier for testing
}

interface UpgradePromptProps {
  feature: FeatureKey;
  requiredTier: SubscriptionTier;
  onUpgrade?: () => void;
}

function UpgradePrompt({ feature, requiredTier, onUpgrade }: UpgradePromptProps) {
  const router = useRouter();
  const tierConfig = getTierConfig(requiredTier);

  const featureNames: Record<FeatureKey, string> = {
    dashboard: 'Dashboard',
    leads: 'Lead Generation',
    sms: 'SMS Follow-ups',
    voice: 'Voice Calls',
    social: 'Social Posting',
    appointments: 'Appointment Scheduling',
    workflows: 'Automation Workflows',
    ecommerce: 'Ecommerce',
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/pricing');
    }
  };

  return (
    <div style={{
      padding: '32px',
      borderRadius: '16px',
      background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.08), rgba(10, 132, 255, 0.05))',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      textAlign: 'center',
      maxWidth: '400px',
      margin: '0 auto',
    }}>
      {/* Lock icon */}
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: 'rgba(99, 102, 241, 0.15)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '24px',
      }}>
        🔒
      </div>

      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: '8px',
      }}>
        {featureNames[feature]} Requires Upgrade
      </h3>

      <p style={{
        fontSize: '14px',
        color: '#94a3b8',
        marginBottom: '20px',
        lineHeight: 1.5,
      }}>
        This feature is available on the <strong style={{ color: '#a5b4fc' }}>{tierConfig.name}</strong> plan 
        and above. Upgrade to unlock {featureNames[feature].toLowerCase()} and more.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={handleUpgrade}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0a84ff, #6366f1)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'transform 150ms ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Upgrade on xom3.io — {tierConfig.priceLabel}
        </button>

        <button
          onClick={() => router.push('/pricing')}
          style={{
            width: '100%',
            padding: '12px 24px',
            borderRadius: '10px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94a3b8',
            fontWeight: 500,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Compare All Plans
        </button>
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
        Pay-as-you-go Obols credits are also available on xom3.io.
      </div>
    </div>
  );
}

interface UsageLimitPromptProps {
  feature: FeatureKey;
  used: number;
  limit: number | 'unlimited';
}

function UsageLimitPrompt({ feature, used, limit }: UsageLimitPromptProps) {
  const router = useRouter();

  const featureNames: Record<FeatureKey, string> = {
    dashboard: 'Dashboard',
    leads: 'leads',
    sms: 'SMS messages',
    voice: 'voice calls',
    social: 'social posts',
    appointments: 'appointments',
    workflows: 'workflows',
    ecommerce: 'ecommerce features',
  };

  return (
    <div style={{
      padding: '24px',
      borderRadius: '12px',
      background: 'rgba(234, 179, 8, 0.1)',
      border: '1px solid rgba(234, 179, 8, 0.3)',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '14px',
        color: '#eab308',
        fontWeight: 600,
        marginBottom: '8px',
      }}>
        Monthly Limit Reached
      </div>
      <p style={{
        fontSize: '13px',
        color: '#94a3b8',
        marginBottom: '16px',
      }}>
        You&apos;ve used {used} of {limit} {featureNames[feature]} this month.
        Upgrade your plan for higher limits.
      </p>
      <button
        onClick={() => router.push('/pricing')}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          background: 'rgba(234, 179, 8, 0.2)',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          color: '#eab308',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Upgrade on xom3.io
      </button>
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
        Need flexible spend? Obols credits are pay-as-you-go.
      </div>
    </div>
  );
}

/**
 * FeatureGate Component
 * Wraps content that requires a specific subscription tier
 * Shows upgrade prompt when user doesn't have access
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
  tier,
}: FeatureGateProps) {
  const { checkFeature, loading } = useFeatureGate({ tier });

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const access = checkFeature(feature);

  // If allowed and not over limit, show children
  if (access.allowed) {
    return <>{children}</>;
  }

  // If not allowed due to tier
  if (access.upgradeRequired && showUpgrade) {
    return <UpgradePrompt feature={feature} requiredTier={access.upgradeRequired} />;
  }

  // If not allowed due to usage limit (only show if limit > 0, not when limit is 0)
  if (typeof access.limit === 'number' && access.limit > 0 && access.used >= access.limit) {
    return <UsageLimitPrompt feature={feature} used={access.used} limit={access.limit} />;
  }

  // Return fallback or null
  return fallback ? <>{fallback}</> : null;
}

/**
 * Inline feature check component
 * Shows a small badge/label when feature is locked
 */
export function FeatureBadge({ feature, tier }: { feature: FeatureKey; tier?: SubscriptionTier }) {
  const { checkFeature, loading } = useFeatureGate({ tier });

  if (loading) return null;

  const access = checkFeature(feature);

  if (access.allowed) return null;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '4px',
      background: 'rgba(99, 102, 241, 0.15)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      fontSize: '10px',
      fontWeight: 600,
      color: '#a5b4fc',
      marginLeft: '8px',
    }}>
      🔒 {access.upgradeRequired?.toUpperCase()}
    </span>
  );
}

export default FeatureGate;
