'use client';

import React from 'react';

interface CosmicLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizes = {
  sm: { container: 40, ring: 3 },
  md: { container: 60, ring: 4 },
  lg: { container: 80, ring: 5 },
};

export function CosmicLoader({ size = 'md', text }: CosmicLoaderProps) {
  const { container, ring } = sizes[size];

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{ width: container, height: container }}
      >
        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-t-violet-500 border-r-fuchsia-500 border-b-pink-500 border-l-cyan-500 animate-spin"
          style={{ borderWidth: ring }}
        />
        
        {/* Middle ring */}
        <div
          className="absolute rounded-full border-t-cyan-400 border-r-violet-400 border-b-fuchsia-400 border-l-pink-400 animate-spin"
          style={{
            inset: ring * 2,
            borderWidth: ring - 1,
            animationDirection: 'reverse',
            animationDuration: '1.5s',
          }}
        />
        
        {/* Inner glow */}
        <div
          className="absolute rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 animate-pulse"
          style={{ inset: ring * 3.5 }}
        />
      </div>
      
      {text && (
        <p className="text-sm text-slate-400 animate-pulse">{text}</p>
      )}
    </div>
  );
}
