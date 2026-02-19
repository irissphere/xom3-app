'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTrial, formatTrialDays, getTrialUrgency } from '@/lib/hooks/useTrial';

interface TrialBannerProps {
  dismissible?: boolean;
}

const URGENCY_COLORS = {
  low: {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.3)',
    text: '#22c55e',
    accent: '#4ade80',
  },
  medium: {
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.3)',
    text: '#eab308',
    accent: '#facc15',
  },
  high: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    text: '#ef4444',
    accent: '#f87171',
  },
  expired: {
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    text: '#ef4444',
    accent: '#f87171',
  },
};

export function TrialBanner({ dismissible = true }: TrialBannerProps) {
  const router = useRouter();
  const { trial, effectiveTier, loading } = useTrial();
  const [dismissed, setDismissed] = useState(false);

  // Check if user dismissed the banner in this session
  useEffect(() => {
    const isDismissed = sessionStorage.getItem('trial_banner_dismissed');
    if (isDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('trial_banner_dismissed', 'true');
  };

  // Don't show if loading, dismissed, not on trial, or trial not active
  if (loading || dismissed || effectiveTier !== 'trial') {
    return null;
  }

  const urgency = getTrialUrgency(trial.daysRemaining);
  const colors = URGENCY_COLORS[urgency];
  const isExpired = urgency === 'expired';

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: colors.bg,
      borderBottom: `1px solid ${colors.border}`,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Icon */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: colors.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
          }}>
            {isExpired ? '⚠️' : '⏱️'}
          </div>

          {/* Message */}
          <div>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: colors.text,
            }}>
              {isExpired ? (
                'Your trial has ended'
              ) : (
                <>
                  <span style={{ color: colors.accent }}>{formatTrialDays(trial.daysRemaining)}</span>
                  {' '}in your free trial
                </>
              )}
            </span>
            <span style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.7)',
              marginLeft: '8px',
            }}>
              {isExpired 
                ? 'Upgrade now to continue using all features'
                : 'Upgrade anytime to keep your automation running'
              }
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* CTA Button */}
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: isExpired 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #0a84ff, #6366f1)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'transform 150ms ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isExpired ? 'Choose a Plan' : 'Upgrade Now'}
          </button>

          {/* Dismiss Button */}
          {dismissible && !isExpired && (
            <button
              onClick={handleDismiss}
              style={{
                padding: '6px',
                borderRadius: '6px',
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Dismiss for this session"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M12 4L4 12M4 4L12 12" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for visual urgency */}
      {!isExpired && (
        <div style={{
          height: '3px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{
            height: '100%',
            width: `${(trial.daysRemaining / 14) * 100}%`,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.text})`,
            transition: 'width 500ms ease',
          }} />
        </div>
      )}
    </div>
  );
}

export default TrialBanner;
