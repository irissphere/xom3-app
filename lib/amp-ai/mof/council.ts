// STRIKE 3: Establish the Council Layer
// Neutral arbitration for conflicts between sovereigns

import { CouncilDecision, Negotiation, SovereignDomain } from "./types";
import { resolveNegotiation } from "./isp";

/**
 * Arbitrate conflict via Council
 */
export function arbitrateConflict(
  conflict: {
    type: string;
    participants: SovereignDomain[];
    issue: string;
    proposals: Array<{
      domain: SovereignDomain;
      proposal: any;
      priority: number;
    }>;
  }
): CouncilDecision {
  // Council decision logic (simplified - would use more sophisticated arbitration)
  let decision = "";
  let reasoning = "";
  let confidence = 0.7;

  // Weight proposals by priority and domain importance
  const domainWeights: Record<SovereignDomain, number> = {
    healthcare: 1.0,
    healthcrm: 1.0,
    benefitscrm: 1.0,
    compliance: 1.0,
    workflow: 0.9,
    notification: 0.7,
    migration: 0.9,
    analytics: 0.8,
    commerce: 0.85,
    crm: 0.8,
    content: 0.75
  };

  // Find highest priority proposal
  const sortedProposals = conflict.proposals.sort((a, b) => {
    const aWeight = (domainWeights[a.domain] || 0.5) * a.priority;
    const bWeight = (domainWeights[b.domain] || 0.5) * b.priority;
    return bWeight - aWeight;
  });

  if (sortedProposals.length > 0) {
    const winningProposal = sortedProposals[0];
    decision = JSON.stringify(winningProposal.proposal);
    reasoning = `Council selected ${winningProposal.domain} proposal (priority: ${winningProposal.priority}, domain weight: ${domainWeights[winningProposal.domain]})`;
    confidence = Math.min(0.95, 0.6 + (winningProposal.priority * 0.2));
  } else {
    decision = "No resolution";
    reasoning = "No proposals provided";
    confidence = 0.5;
  }

  return {
    id: `council-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    conflict: {
      type: conflict.type,
      participants: conflict.participants,
      issue: conflict.issue
    },
    decision,
    reasoning,
    confidence,
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resolve negotiation via Council
 */
export function resolveViaCouncil(negotiation: Negotiation): Negotiation {
  const councilDecision = arbitrateConflict({
    type: negotiation.topic,
    participants: negotiation.participants,
    issue: negotiation.topic,
    proposals: negotiation.proposals
  });

  return resolveNegotiation(
    negotiation,
    JSON.parse(councilDecision.decision),
    "council",
    councilDecision.confidence
  );
}
