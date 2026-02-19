'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CosmicInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function CosmicInput({
  label,
  error,
  icon,
  className,
  ...props
}: CosmicInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}
        <input
          className={cn(
            'w-full rounded-xl border bg-slate-800/50 backdrop-blur-sm',
            'px-4 py-3 text-white placeholder-slate-400',
            'border-slate-600/50 focus:border-violet-500/50',
            'focus:outline-none focus:ring-2 focus:ring-violet-500/20',
            'transition-all duration-200',
            icon && 'pl-12',
            error && 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
