import React, { useState, useEffect } from 'react';
import { Xom3MasterData, ConsentAnalytics, ConsentProfile } from '../../../../lib/xom3/types';

interface ConsentManagementPanelProps {
  data?: Xom3MasterData;
}

export default function ConsentManagementPanel({ data }: ConsentManagementPanelProps) {
  const [analytics, setAnalytics] = useState<ConsentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  useEffect(() => {
    fetchConsentAnalytics();
    const interval = setInterval(fetchConsentAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchConsentAnalytics = async () => {
    try {
      const res = await fetch('/api/xom3/consent/analytics');
      const json = await res.json();
      if (json.success) {
        setAnalytics(json.data);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="xom3-panel h-full flex items-center justify-center">
        <div className="text-[var(--text-2)] animate-pulse uppercase tracking-widest text-xs font-semibold">
          Loading Consent Data...
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="xom3-panel h-full flex items-center justify-center">
        <div className="text-red-400/80 text-xs uppercase font-semibold">
          Consent System Degraded
        </div>
      </div>
    );
  }

  const state = analytics!;

  return (
    <div className="xom3-panel h-full flex flex-col relative overflow-hidden">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="xom3-panel-header relative z-10">
        <div>
          <div className="xom3-panel-title flex items-center gap-2">
            <span>Consent Management</span>
            <span className="xom3-badge xom3-badge-success">ACTIVE</span>
          </div>
          <div className="xom3-panel-subtitle">Privacy-compliant data collection</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 relative z-10 overflow-y-auto pr-1">
        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-2">Total Visitors</div>
            <div className="text-2xl font-bold text-white">{state.totalVisitors.toLocaleString()}</div>
          </div>
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-2">Consent Rate</div>
            <div className="text-2xl font-bold text-green-400">{(state.consentRate * 100).toFixed(1)}%</div>
          </div>
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-4">
            <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-2">Active Profiles</div>
            <div className="text-2xl font-bold text-cyan-400">
              {state.jurisdictionStats.reduce((sum, j) => sum + j.visitorCount, 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Domain Filter */}
        <div className="flex gap-2">
          {['all', 'benefitscrm', 'healthcrm', 'commerce', 'broadcast'].map(domain => (
            <button
              key={domain}
              onClick={() => setSelectedDomain(domain)}
              className={`px-3 py-1 rounded-lg text-xs uppercase font-semibold transition-all ${
                selectedDomain === domain
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-2)] border border-transparent hover:bg-[rgba(255,255,255,0.08)]'
              }`}
            >
              {domain === 'all' ? 'All Domains' : domain}
            </button>
          ))}
        </div>

        {/* Category Breakdown */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-4">
            Consent Categories
          </div>
          <div className="space-y-3">
            {state.categoryBreakdown.map(category => {
              const total = category.granted + category.denied;
              const grantRate = total > 0 ? (category.granted / total) * 100 : 0;

              return (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1 capitalize">
                      {category.category}
                    </div>
                    <div className="h-2 w-full bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                        style={{ width: `${grantRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-sm font-bold text-green-400">{grantRate.toFixed(1)}%</div>
                    <div className="text-xs text-[var(--text-2)]">
                      {category.granted}/{total}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jurisdiction Compliance */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-4">
            Jurisdiction Compliance
          </div>
          <div className="space-y-3">
            {state.jurisdictionStats.map(jurisdiction => (
              <div key={jurisdiction.jurisdiction} className="flex items-center justify-between p-3 rounded-lg bg-[rgba(255,255,255,0.02)]">
                <div>
                  <div className="text-sm font-medium text-white">{jurisdiction.jurisdiction}</div>
                  <div className="text-xs text-[var(--text-2)]">
                    {jurisdiction.visitorCount.toLocaleString()} visitors
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${
                    jurisdiction.consentRate > 0.8 ? 'text-green-400' :
                    jurisdiction.consentRate > 0.6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {(jurisdiction.consentRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-[var(--text-2)]">consent rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-5">
          <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-4">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-500/20 transition-all">
              Export Consent Report
            </button>
            <button className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-lg text-sm font-medium hover:bg-cyan-500/20 transition-all">
              Cleanup Expired Profiles
            </button>
            <button className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-all">
              Update Privacy Policy
            </button>
            <button className="bg-orange-500/10 border border-orange-500/30 text-orange-400 px-4 py-3 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-all">
              Audit Compliance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
