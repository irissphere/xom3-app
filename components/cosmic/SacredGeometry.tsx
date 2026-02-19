'use client';

import React from 'react';

interface SacredGeometryProps {
  className?: string;
  color?: string;
  size?: number;
  animate?: boolean;
}

export function SacredGeometry({
  className = '',
  color = 'rgba(139, 92, 246, 0.3)',
  size = 400,
  animate = true,
}: SacredGeometryProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`${className} ${animate ? 'animate-spin-slow' : ''}`}
      style={{ animationDuration: '60s' }}
    >
      {/* Flower of Life pattern */}
      <g stroke={color} strokeWidth="0.3" fill="none">
        {/* Central circle */}
        <circle cx="50" cy="50" r="15" />
        
        {/* Inner ring of circles */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const x = 50 + 15 * Math.cos((angle * Math.PI) / 180);
          const y = 50 + 15 * Math.sin((angle * Math.PI) / 180);
          return <circle key={i} cx={x} cy={y} r="15" />;
        })}
        
        {/* Outer ring */}
        {[30, 90, 150, 210, 270, 330].map((angle, i) => {
          const x = 50 + 26 * Math.cos((angle * Math.PI) / 180);
          const y = 50 + 26 * Math.sin((angle * Math.PI) / 180);
          return <circle key={`outer-${i}`} cx={x} cy={y} r="15" />;
        })}
        
        {/* Hexagon */}
        <polygon
          points="50,20 76,35 76,65 50,80 24,65 24,35"
          strokeWidth="0.5"
        />
        
        {/* Inner hexagon */}
        <polygon
          points="50,32 66,42 66,58 50,68 34,58 34,42"
          strokeWidth="0.5"
        />
      </g>
      
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </svg>
  );
}
