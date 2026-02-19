'use client';

import React from 'react';

interface RenderControlProps {
  isDraft: boolean;
  onChange: (isDraft: boolean) => void;
  tier: string; // SubscriptionTier
  estimatedCost?: string;
}

export const RenderControl: React.FC<RenderControlProps> = ({
  isDraft,
  onChange,
  tier,
  estimatedCost,
}) => {
  return (
    <div className="p-4 bg-slate-900/50 border border-white/10 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Render Quality</h3>
          <p className="text-xs text-gray-400">Choose between speed and resolution.</p>
        </div>
        {estimatedCost && (
          <div className="text-right">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Est. Cost</span>
            <span className="text-green-400 font-mono text-sm">{estimatedCost}</span>
          </div>
        )}
      </div>

      <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
        <button
          onClick={() => onChange(true)}
          className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
            isDraft
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="text-sm font-bold">Draft</span>
          <span className="text-[10px] opacity-70">512p • ~20s • Low Cost</span>
        </button>
        
        <button
          onClick={() => tier === 'pro' ? onChange(false) : null}
          className={`flex-1 flex flex-col items-center py-2 px-3 rounded-lg transition-all relative ${
            !isDraft
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          } ${tier === 'free' ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <span className="text-sm font-bold flex items-center gap-1">
            Final Render
            {tier === 'free' && <span className="text-[9px] bg-purple-500 px-1 rounded">PRO</span>}
          </span>
          <span className="text-[10px] opacity-70">4K • ~3m • Full Quality</span>
          
          {tier === 'free' && (
            <div className="absolute inset-0 z-10" title="Upgrade to Pro for 4K Rendering" />
          )}
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
        <p className="text-[11px] text-blue-300 leading-normal">
          <span className="font-bold">💡 Tip:</span> Use <span className="text-white">Draft mode</span> to test your script and camera angles. Edits made within 30 minutes of a render are 80% cheaper!
        </p>
      </div>
    </div>
  );
};
