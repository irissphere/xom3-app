'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NebulaBannerProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'error';
  className?: string;
  icon?: React.ReactNode;
}

const variants = {
  info: {
    bg: 'from-violet-600/20 via-fuchsia-600/20 to-violet-600/20',
    border: 'border-violet-500/30',
    text: 'text-violet-200',
  },
  success: {
    bg: 'from-emerald-600/20 via-teal-600/20 to-emerald-600/20',
    border: 'border-emerald-500/30',
    text: 'text-emerald-200',
  },
  warning: {
    bg: 'from-amber-600/20 via-orange-600/20 to-amber-600/20',
    border: 'border-amber-500/30',
    text: 'text-amber-200',
  },
  error: {
    bg: 'from-red-600/20 via-rose-600/20 to-red-600/20',
    border: 'border-red-500/30',
    text: 'text-red-200',
  },
};

export function NebulaBanner({
  children,
  variant = 'info',
  className,
  icon,
}: NebulaBannerProps) {
  const styles = variants[variant];

  return (
    <div
      className={cn(
        'relative rounded-xl border p-4',
        'bg-gradient-to-r backdrop-blur-sm',
        styles.bg,
        styles.border,
        styles.text,
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
