/**
 * XOM3 Design System Components
 * Reusable UI components following orbital design language
 * AKV: Sovereign components, zero drift
 */

import React from 'react';
import { colors, spacing, radius, typography, effects } from './tokens';

// ============================================================
// GLASS PANEL - Base container component
// ============================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  padding?: keyof typeof spacing | number;
  edge?: boolean;
}

export function GlassPanel({ children, className = '', style = {}, padding = 'lg', edge = true }: GlassPanelProps) {
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];
  
  return (
    <div
      className={`glass-panel ${edge ? 'glass-edge' : ''} ${className}`}
      style={{
        padding: paddingValue,
        borderRadius: radius.lg,
        background: colors.surface2,
        border: edge ? `1px solid ${colors.border2}` : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================
// METRIC CARD - Display KPIs
// ============================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  icon?: string;
  live?: boolean;
}

export function MetricCard({ label, value, tone = 'neutral', icon, live = false }: MetricCardProps) {
  const toneColors = {
    neutral: { bg: 'rgba(148, 163, 184, 0.12)', fg: colors.text0, border: 'rgba(148, 163, 184, 0.22)' },
    success: { bg: 'rgba(34, 197, 94, 0.12)', fg: colors.success, border: 'rgba(34, 197, 94, 0.22)' },
    warning: { bg: 'rgba(245, 158, 11, 0.12)', fg: colors.warning, border: 'rgba(245, 158, 11, 0.22)' },
    danger: { bg: 'rgba(239, 68, 68, 0.12)', fg: colors.danger, border: 'rgba(239, 68, 68, 0.22)' },
    info: { bg: 'rgba(59, 130, 246, 0.12)', fg: colors.info, border: 'rgba(59, 130, 246, 0.22)' },
  };

  const { bg, fg, border } = toneColors[tone];

  return (
    <GlassPanel padding="lg" style={{ minWidth: 180 }}>
      <div style={{ fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.xs, color: colors.text2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {label}
      </div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: typography.fontSize['4xl'], fontWeight: typography.fontWeight.extrabold, color: fg }}>
          {value}
        </div>
        {live && (
          <div style={{ 
            padding: '6px 10px', 
            borderRadius: radius.full, 
            background: bg, 
            border: `1px solid ${border}`, 
            color: fg, 
            fontFamily: typography.fontFamily.mono, 
            fontSize: typography.fontSize.xs 
          }}>
            LIVE
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// STATUS BADGE - For postures and statuses
// ============================================================

interface StatusBadgeProps {
  label: string;
  status: 'active' | 'dormant' | 'error' | 'nominal' | 'degraded' | 'critical';
  pulse?: boolean;
}

export function StatusBadge({ label, status, pulse = false }: StatusBadgeProps) {
  const statusColors = {
    active: { bg: 'rgba(34, 197, 94, 0.15)', fg: colors.success, border: 'rgba(34, 197, 94, 0.25)' },
    nominal: { bg: 'rgba(34, 197, 94, 0.15)', fg: colors.success, border: 'rgba(34, 197, 94, 0.25)' },
    dormant: { bg: 'rgba(148, 163, 184, 0.12)', fg: colors.text2, border: 'rgba(148, 163, 184, 0.22)' },
    degraded: { bg: 'rgba(245, 158, 11, 0.15)', fg: colors.warning, border: 'rgba(245, 158, 11, 0.25)' },
    error: { bg: 'rgba(239, 68, 68, 0.15)', fg: colors.danger, border: 'rgba(239, 68, 68, 0.25)' },
    critical: { bg: 'rgba(239, 68, 68, 0.15)', fg: colors.danger, border: 'rgba(239, 68, 68, 0.25)' },
  };

  const { bg, fg, border } = statusColors[status];

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: radius.full,
      background: bg,
      border: `1px solid ${border}`,
      fontFamily: typography.fontFamily.mono,
      fontSize: typography.fontSize.xs,
      color: fg,
    }}>
      {pulse && (
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: fg,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }} />
      )}
      <span>{label.toUpperCase()}</span>
    </div>
  );
}

// ============================================================
// ORBITAL BACKGROUND - Consistent background layer
// ============================================================

interface OrbitalBackgroundProps {
  variant?: 'primary' | 'secondary' | 'mixed';
}

export function OrbitalBackground({ variant = 'mixed' }: OrbitalBackgroundProps) {
  return (
    <>
      <div className="orbital-bg-layer" style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}>
        {(variant === 'primary' || variant === 'mixed') && (
          <div className="orbital-orb orbital-orb-primary animate-orb-drift" 
               style={{ width: 700, height: 700, top: '-15%', left: '-10%', position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)' }} />
        )}
        {(variant === 'secondary' || variant === 'mixed') && (
          <div className="orbital-orb orbital-orb-secondary animate-orb-drift-alt" 
               style={{ width: 500, height: 500, bottom: '5%', right: '-12%', position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)' }} />
        )}
        {variant === 'mixed' && (
          <div className="orbital-orb orbital-orb-accent animate-orb-drift" 
               style={{ width: 350, height: 350, top: '60%', left: '15%', position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)' }} />
        )}
        <div className="orbital-grid animate-grid-rotate" style={{
          position: 'absolute',
          inset: '-50%',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
          transformOrigin: 'center center',
        }} />
      </div>
      
      {/* Add animation styles */}
      <style jsx>{`
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 30px); }
        }
        @keyframes orb-drift-alt {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(-30px, 20px); }
          66% { transform: translate(20px, -30px); }
        }
        @keyframes grid-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-orb-drift { animation: orb-drift 20s ease-in-out infinite; }
        .animate-orb-drift-alt { animation: orb-drift-alt 25s ease-in-out infinite; }
        .animate-grid-rotate { animation: grid-rotate 120s linear infinite; }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

// ============================================================
// OMNI BAR - Sticky header with navigation
// ============================================================

interface OmniBarProps {
  title: string;
  subtitle?: string;
  logo?: React.ReactNode;
  navigation?: React.ReactNode;
  actions?: React.ReactNode;
  posture?: {
    label: string;
    status: 'active' | 'dormant' | 'error' | 'nominal' | 'degraded' | 'critical';
  };
}

export function OmniBar({ title, subtitle, logo, navigation, actions, posture }: OmniBarProps) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: `1px solid ${colors.border2}`,
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {logo}
        <div>
          <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text0 }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: typography.fontSize.sm, color: colors.text2, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      
      {navigation && <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>{navigation}</div>}
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {posture && <StatusBadge label={posture.label} status={posture.status} pulse />}
        {actions}
      </div>
    </div>
  );
}

// ============================================================
// LOADING STATE - Consistent loading indicator
// ============================================================

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: `3px solid ${colors.border0}`,
        borderTopColor: colors.primary,
        animation: 'spin 1s linear infinite',
      }} />
      <div style={{ color: colors.text2, fontSize: typography.fontSize.base }}>
        {message}
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// EMPTY STATE - Consistent empty placeholder
// ============================================================

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 240,
      padding: spacing['2xl'],
      textAlign: 'center',
    }}>
      {icon && (
        <div style={{ fontSize: 48, marginBottom: spacing.lg }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: colors.text0, marginBottom: spacing.sm }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: typography.fontSize.base, color: colors.text2, marginBottom: spacing.xl, maxWidth: 420 }}>
          {description}
        </div>
      )}
      {action}
    </div>
  );
}

// ============================================================
// DATA TABLE - Consistent table styling
// ============================================================

interface DataTableProps<T> {
  columns: Array<{
    key: keyof T | string;
    label: string;
    render?: (row: T) => React.ReactNode;
    width?: string;
  }>;
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({ columns, data, emptyMessage = 'No data available' }: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState icon="📊" title={emptyMessage} />;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${colors.border0}` }}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                style={{
                  textAlign: 'left',
                  padding: '12px 8px',
                  fontFamily: typography.fontFamily.mono,
                  fontSize: typography.fontSize.xs,
                  color: colors.text2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: typography.fontWeight.semibold,
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: `1px solid ${colors.border2}` }}>
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  style={{
                    padding: '14px 8px',
                    fontSize: typography.fontSize.base,
                    color: colors.text0,
                  }}
                >
                  {col.render ? col.render(row) : row[col.key as keyof T]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}































