// STRIKE 2: Create Inter-Sovereign Protocol (ISP)
// The language of the federation

import { ISPSignal, ISPEvent, Negotiation, SovereignDomain } from "./types";

/**
 * Send signal between sovereigns
 */
export function sendSignal(
  from: SovereignDomain,
  to: SovereignDomain | "all" | "council",
  type: ISPSignal["type"],
  payload: any,
  priority: ISPSignal["priority"] = "medium"
): ISPSignal {
  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    from,
    to,
    type,
    payload,
    priority,
    timestamp: new Date().toISOString(),
    requiresResponse: type === "request" || priority === "critical"
  };
}

/**
 * Broadcast event to federation
 */
export function broadcastEvent(
  domain: SovereignDomain,
  type: ISPEvent["type"],
  severity: ISPEvent["severity"],
  payload: any
): ISPEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    domain,
    type,
    severity,
    payload,
    timestamp: new Date().toISOString(),
    broadcast: true
  };
}

/**
 * Create negotiation between sovereigns
 */
export function createNegotiation(
  participants: SovereignDomain[],
  topic: string
): Negotiation {
  return {
    id: `negotiation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    participants,
    topic,
    proposals: [],
    status: "pending"
  };
}

/**
 * Add proposal to negotiation
 */
export function addProposal(
  negotiation: Negotiation,
  domain: SovereignDomain,
  proposal: any,
  priority: number
): Negotiation {
  negotiation.proposals.push({
    domain,
    proposal,
    priority,
    timestamp: new Date().toISOString()
  });

  return negotiation;
}

/**
 * Resolve negotiation
 */
export function resolveNegotiation(
  negotiation: Negotiation,
  decision: any,
  arbitrator: "council" | SovereignDomain,
  confidence: number
): Negotiation {
  negotiation.resolution = {
    decision,
    arbitrator,
    confidence,
    timestamp: new Date().toISOString()
  };
  negotiation.status = "resolved";

  return negotiation;
}

/**
 * Process signal
 */
export function processSignal(
  signal: ISPSignal,
  handler: (signal: ISPSignal) => Promise<any>
): Promise<any> {
  return handler(signal);
}
