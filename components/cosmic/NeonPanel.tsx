'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NeonPanelProps {
  children: React.ReactNode;
  color?: 'violet' | 'cyan' | 'pink' | 'emerald' | 'amber';
  glow?: boolean;
  hover?: boolean;
  className?: string;
}

const colorMap = {
  violet: {
    border: 'border-violet-500/30',
    glow: 'shadow-[0_0_30px_rgba(139,92,246,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.3)]',
    hoverBorder: 'hover:border-violet-400/50',
  },
  cyan: {
    border: 'border-cyan-500/30',
    glow: 'shadow-[0_0_30px_rgba(6,182,212,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(6,182,212,0.3)]',
    hoverBorder: 'hover:border-cyan-400/50',
  },
  pink: {
    border: 'border-pink-500/30',
    glow: 'shadow-[0_0_30px_rgba(236,72,153,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(236,72,153,0.3)]',
    hoverBorder: 'hover:border-pink-400/50',
  },
  emerald: {
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]',
    hoverBorder: 'hover:border-emerald-400/50',
  },
  amber: {
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    hoverGlow: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.3)]',
    hoverBorder: 'hover:border-amber-400/50',
  },
};

export function NeonPanel({
  children,
  color = 'violet',
  glow = true,
  hover = true,
  className,
}: NeonPanelProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-slate-900/80 backdrop-blur-xl p-6',
        'transition-all duration-300',
        colors.border,
        glow && colors.glow,
        hover && colors.hoverGlow,
        hover && colors.hoverBorder,
        className
      )}
    >
      {children}
    </div>
  );
}
