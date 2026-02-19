// STRIKE 9: Enable Unified Explanation Layer
// Federated clarity - the federation speaks with one voice

import type {
  FederatedExplanation,
  SovereignDomain,
  ISPSignal,
  ISPEvent,
  Negotiation,
  CouncilDecision,
  CrossDomainPattern,
  LoadBalanceNegotiation,
  CrossDomainEvolution,
  FederatedProtection,
  SovereignExpansion,
} from "./types";

/**
 * Explain federated decision
 */
export function explainFederatedDecision(
  domains: SovereignDomain[],
  decision: string,
  reason: string,
  actions: Array<{ domain: SovereignDomain; action: string; result: string }>
): FederatedExplanation {
  const explanation = `[MOF Federation] ${domains.join(" + ")}: ${decision}. ${reason}. Actions: ${actions.map(a => `${a.domain} ${a.action} (${a.result})`).join(", ")}.`;

  return {
    id: `federated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    domains,
    decision,
    reason,
    actions,
    timestamp: new Date().toISOString(),
    explanation
  };
}

/**
 * Generate unified federation summary
 */
export function generateFederationSummary(
  signals: ISPSignal[],
  events: ISPEvent[],
  negotiations: Negotiation[],
  councilDecisions: CouncilDecision[],
  sharedPatterns: CrossDomainPattern[],
  loadBalances: LoadBalanceNegotiation[],
  evolutions: CrossDomainEvolution[],
  protections: FederatedProtection[],
  expansions: SovereignExpansion[]
): string {
  const parts: string[] = [];

  parts.push("=== MOF Federation Summary ===");
  parts.push("");

  // Signals
  if (signals.length > 0) {
    parts.push(`📡 Signals: ${signals.length} inter-sovereign signals`);
    signals.slice(0, 5).forEach(signal => {
      parts.push(`  • ${signal.from} → ${signal.to}: ${signal.type} (${signal.priority})`);
    });
    parts.push("");
  }

  // Events
  if (events.length > 0) {
    parts.push(`📢 Events: ${events.length} broadcast events`);
    events.slice(0, 5).forEach(event => {
      parts.push(`  • ${event.domain}: ${event.type} (${event.severity})`);
    });
    parts.push("");
  }

  // Negotiations
  if (negotiations.length > 0) {
    parts.push(`🤝 Negotiations: ${negotiations.length} negotiations`);
    negotiations.forEach(neg => {
      parts.push(`  • ${neg.participants.join(" + ")}: ${neg.topic} (${neg.status})`);
    });
    parts.push("");
  }

  // Council Decisions
  if (councilDecisions.length > 0) {
    parts.push(`⚖️ Council Decisions: ${councilDecisions.length} arbitrations`);
    councilDecisions.forEach(decision => {
      parts.push(`  • ${decision.conflict.participants.join(" vs ")}: ${decision.decision} (${(decision.confidence * 100).toFixed(0)}% confidence)`);
    });
    parts.push("");
  }

  // Shared Patterns
  if (sharedPatterns.length > 0) {
    parts.push(`🔄 Shared Patterns: ${sharedPatterns.length} cross-domain patterns`);
    sharedPatterns.slice(0, 5).forEach(pattern => {
      parts.push(`  • ${pattern.sourceDomain} → ${pattern.targetDomain}: ${pattern.pattern.type}`);
    });
    parts.push("");
  }

  // Load Balances
  if (loadBalances.length > 0) {
    parts.push(`⚖️ Load Balances: ${loadBalances.length} negotiations`);
    loadBalances.forEach(balance => {
      parts.push(`  • ${balance.participants.join(", ")}: ${balance.resolution.reason}`);
    });
    parts.push("");
  }

  // Evolutions
  if (evolutions.length > 0) {
    parts.push(`🧬 Co-Evolutions: ${evolutions.length} coordinated evolutions`);
    evolutions.forEach(evolution => {
      parts.push(`  • ${evolution.domains.join(" + ")}: ${evolution.evolutionType} (${evolution.changes.length} changes)`);
    });
    parts.push("");
  }

  // Protections
  if (protections.length > 0) {
    parts.push(`🛡️ Federated Protections: ${protections.length} threat responses`);
    protections.forEach(protection => {
      parts.push(`  • Detected by ${protection.detectedBy}: ${protection.threat.type} (${protection.threat.severity})`);
      parts.push(`    Responses: ${protection.responses.map(r => `${r.domain} ${r.action}`).join(", ")}`);
    });
    parts.push("");
  }

  // Expansions
  if (expansions.length > 0) {
    parts.push(`🌱 Expansions: ${expansions.length} sovereign expansions`);
    expansions.forEach(expansion => {
      parts.push(`  • ${expansion.parentDomain}: ${expansion.type}${expansion.newDomain ? ` → ${expansion.newDomain}` : ""} (${expansion.reason})`);
    });
    parts.push("");
  }

  return parts.join("\n");
}
