import React, { useState, useEffect } from 'react';
import { Xom3MasterData } from '../../useXom3MasterData';

interface ImpactData {
  currentSpend: number;
  nextMilestone: number;
  milestones: {
    id: string;
    label: string;
    threshold: number;
    reward: string;
    icon: string;
    achieved: boolean;
  }[];
  totalImpact: {
    bagsDonated: number;
    carePackages: number;
  };
}

export default function ImpactPanel({ data }: { data?: Xom3MasterData }) {
  const [impactState, setImpactState] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const res = await fetch('/api/commerce/impact');
        const json = await res.json();
        if (json.success) {
          setImpactState(json.data);
        } else {
          setError(json.error);
        }
      } catch (err) {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();
    const interval = setInterval(fetchImpact, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !impactState) {
    return (
      <div className="xom3-panel h-full flex items-center justify-center">
        <div className="text-[var(--text-2)] animate-pulse uppercase tracking-widest text-xs font-semibold">Syncing Impact Data...</div>
      </div>
    );
  }

  if (error && !impactState) {
    return (
      <div className="xom3-panel h-full flex items-center justify-center">
        <div className="text-red-400/80 text-xs uppercase font-semibold">Impact System Degraded</div>
      </div>
    );
  }

  const state = impactState!;
  const progressPercent = Math.min(100, (state.currentSpend / state.nextMilestone) * 100);
  const nextMilestoneName = state.milestones.find(m => !m.achieved)?.label || 'Diamond';

  return (
    <div className="xom3-panel h-full flex flex-col relative overflow-hidden">
       {/* Background Ambient Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="xom3-panel-header relative z-10">
        <div>
          <div className="xom3-panel-title flex items-center gap-2">
            <span>Social Impact Rewards</span>
            <span className="xom3-badge xom3-badge-info">LIVE</span>
          </div>
          <div className="xom3-panel-subtitle">Your growth feeds those in need.</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 relative z-10 overflow-y-auto pr-1">
        {/* Main Progress Card */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-1">Total Contributions</div>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                ${state.currentSpend.toLocaleString()}
                <span className="text-sm font-normal text-[var(--text-2)]">/ ${state.nextMilestone.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[var(--text-1)] text-sm font-medium">Next: {nextMilestoneName} Tier</div>
              <div className="text-[var(--xom3-primary)] text-xs">{state.milestones.find(m => !m.achieved)?.reward || 'Max Impact'}</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
          <div className="mt-2 text-xs text-[var(--text-2)] text-right">
            {state.currentSpend < state.nextMilestone 
              ? `$${(state.nextMilestone - state.currentSpend).toLocaleString()} more to unlock next reward`
              : 'Maximum tier achieved!'}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-center">
            <div className="text-[20px] mb-1">🍱</div>
            <div className="text-xl font-bold text-white">{state.totalImpact.bagsDonated}</div>
            <div className="text-[10px] uppercase text-[var(--text-2)] font-bold">Bags Donated</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-center">
            <div className="text-[20px] mb-1">📦</div>
            <div className="text-xl font-bold text-white">{state.totalImpact.carePackages}</div>
            <div className="text-[10px] uppercase text-[var(--text-2)] font-bold">Care Packages</div>
          </div>
        </div>

        {/* Milestones List */}
        <div className="space-y-3 pb-4">
          <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Impact Roadmap</div>
          <div className="grid gap-3">
            {state.milestones.map((milestone) => {
              const isUnlocked = milestone.achieved;
              const isNext = !isUnlocked && state.currentSpend < milestone.threshold && state.currentSpend >= (state.milestones.find(m => m.threshold < milestone.threshold)?.threshold || 0);

              return (
                <div 
                  key={milestone.id}
                  className={`relative p-3 rounded-lg border flex items-center gap-3 transition-all ${
                    isUnlocked 
                      ? 'bg-cyan-900/10 border-cyan-500/30' 
                      : isNext
                        ? 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.1)]'
                        : 'bg-transparent border-transparent opacity-50 grayscale'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                    isUnlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-[rgba(255,255,255,0.05)]'
                  }`}>
                    {milestone.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className={`font-medium ${isUnlocked ? 'text-white' : 'text-[var(--text-1)]'}`}>
                        {milestone.label}
                      </div>
                      <div className="text-xs font-mono text-[var(--text-2)]">${milestone.threshold.toLocaleString()}</div>
                    </div>
                    <div className="text-xs text-[var(--text-2)]">{milestone.reward}</div>
                  </div>
                  {isUnlocked && (
                     <div className="text-cyan-400">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                       </svg>
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


