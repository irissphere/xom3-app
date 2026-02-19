'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}

export function HolographicCard({
  children,
  className,
  interactive = true,
}: HolographicCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90',
        'border border-white/10 backdrop-blur-xl',
        interactive && 'group cursor-pointer',
        className
      )}
    >
      {/* Holographic shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-cyan-500/10" />
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          style={{
            animation: 'shimmer 2s infinite',
            transform: 'skewX(-20deg)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">{children}</div>

      {/* Border glow on hover */}
      <div className="absolute inset-0 rounded-2xl border border-violet-500/0 group-hover:border-violet-500/30 transition-colors duration-300" />

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}
