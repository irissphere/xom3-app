// STRIKE 5: Enable Cross-Domain Load Balancing
// Sovereigns negotiate load distribution

import { LoadBalanceNegotiation, SovereignDomain } from "./types";
import { createNegotiation, addProposal, resolveNegotiation } from "./isp";
import { resolveViaCouncil } from "./council";

/**
 * Negotiate load balance across domains
 */
export function negotiateLoadBalance(
  currentLoad: Record<SovereignDomain, number>,
  targets: Record<SovereignDomain, number>
): LoadBalanceNegotiation {
  const participants = Object.keys(currentLoad) as SovereignDomain[];
  const negotiation = createNegotiation(participants, "load_balancing");

  // Each domain proposes adjustments
  participants.forEach(domain => {
    const current = currentLoad[domain];
    const target = targets[domain] || 0.7;
    const adjustment = target - current;
    const priority = Math.abs(adjustment); // Higher priority for larger imbalances

    addProposal(negotiation, domain, {
      adjustment,
      reason: `Current load ${(current * 100).toFixed(1)}%, target ${(target * 100).toFixed(1)}%`
    }, priority);
  });

  // Resolve via council
  const resolved = resolveViaCouncil(negotiation);

  // Build adjustments from resolution
  const adjustments: Record<SovereignDomain, number> = {} as any;
  if (resolved.resolution) {
    participants.forEach(domain => {
      const proposal = negotiation.proposals.find(p => p.domain === domain);
      if (proposal) {
        adjustments[domain] = (proposal.proposal as any).adjustment || 0;
      }
    });
  }

  return {
    id: negotiation.id,
    participants,
    currentLoad,
    proposedAdjustments: adjustments,
    resolution: {
      adjustments,
      reason: resolved.resolution?.decision ? "Load balanced via council" : "No adjustment needed",
      confidence: resolved.resolution?.confidence || 0.5
    },
    timestamp: new Date().toISOString()
  };
}
