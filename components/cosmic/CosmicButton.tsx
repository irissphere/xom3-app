'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CosmicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function CosmicButton({
  variant = 'primary',
  size = 'md',
  glow = true,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: CosmicButtonProps) {
  const baseStyles = `
    relative overflow-hidden font-semibold rounded-xl transition-all duration-300
    backdrop-blur-sm border
    disabled:opacity-50 disabled:cursor-not-allowed
    active:scale-95
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500
      border-violet-400/30 text-white
      hover:shadow-[0_0_30px_rgba(167,139,250,0.5)]
      hover:border-violet-300/50
    `,
    secondary: `
      bg-slate-800/80 border-cyan-400/30 text-cyan-100
      hover:bg-slate-700/80 hover:border-cyan-300/50
      hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]
    `,
    ghost: `
      bg-transparent border-white/10 text-white/80
      hover:bg-white/5 hover:text-white hover:border-white/20
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-rose-500
      border-red-400/30 text-white
      hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {glow && (
        <span className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-500/20 to-pink-500/20 blur-xl" />
      )}
      <span className="relative flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </span>
    </button>
  );
}
