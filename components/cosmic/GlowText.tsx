'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlowTextProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  gradient?: 'cosmic' | 'neon' | 'fire' | 'ocean' | 'aurora';
  glow?: boolean;
  className?: string;
}

const gradients = {
  cosmic: 'from-violet-400 via-fuchsia-400 to-pink-400',
  neon: 'from-cyan-400 via-violet-400 to-fuchsia-400',
  fire: 'from-orange-400 via-red-400 to-rose-400',
  ocean: 'from-cyan-400 via-blue-400 to-indigo-400',
  aurora: 'from-emerald-400 via-cyan-400 to-violet-400',
};

const glowColors = {
  cosmic: 'drop-shadow-[0_0_25px_rgba(167,139,250,0.5)]',
  neon: 'drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]',
  fire: 'drop-shadow-[0_0_25px_rgba(249,115,22,0.5)]',
  ocean: 'drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]',
  aurora: 'drop-shadow-[0_0_25px_rgba(16,185,129,0.5)]',
};

export function GlowText({
  children,
  as: Component = 'span',
  gradient = 'cosmic',
  glow = true,
  className,
}: GlowTextProps) {
  return (
    <Component
      className={cn(
        'bg-gradient-to-r bg-clip-text text-transparent',
        gradients[gradient],
        glow && glowColors[gradient],
        className
      )}
    >
      {children}
    </Component>
  );
}
