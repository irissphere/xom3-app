// MOF Orchestrator
// Coordinates the federation of sovereigns

import { MOFState, SovereignDomain, SovereignUnit } from "./types";
import { initializeFederation } from "./sovereign-units";
import { sendSignal, broadcastEvent } from "./isp";
import { resolveViaCouncil } from "./council";
import { sharePattern, broadcastPattern } from "./pattern-sharing";
import { negotiateLoadBalance } from "./load-balancing";
import { coordinateEvolution } from "./co-evolution";
import { detectAndProtect } from "./federated-protection";
import { createNewSovereign, splitSovereign, mergeSovereigns, spawnSubOrganism } from "./expansion";
import { explainFederatedDecision, generateFederationSummary } from "./explainer";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Run complete MOF federation cycle
 */
export async function runMOF(
  pipeline?: MigrationPipeline,
  context?: {
    threat?: {
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      description: string;
    };
    pattern?: {
      domain: SovereignDomain;
      type: string;
      pattern: any;
      confidence: number;
    };
    load?: Record<SovereignDomain, number>;
  }
): Promise<{
  state: MOFState;
  signals: any[];
  events: any[];
  negotiations: any[];
  councilDecisions: any[];
  sharedPatterns: any[];
  loadBalances: any[];
  evolutions: any[];
  protections: any[];
  expansions: any[];
  summary: string;
}> {
  // Initialize federation
  const sovereigns = initializeFederation();
  
  const signals: any[] = [];
  const events: any[] = [];
  const negotiations: any[] = [];
  const councilDecisions: any[] = [];
  const sharedPatterns: any[] = [];
  const loadBalances: any[] = [];
  const evolutions: any[] = [];
  const protections: any[] = [];
  const expansions: any[] = [];

  // Handle threat if present
  if (context?.threat) {
    const protection = await detectAndProtect(
      "migration",
      {
        ...context.threat,
        pipelineId: pipeline?.id,
        pipeline
      }
    );
    protections.push(protection);
  }

  // Handle pattern sharing if present
  if (context?.pattern) {
    const pattern = {
      id: `pattern-${Date.now()}`,
      type: context.pattern.type,
      domain: context.pattern.domain,
      pattern: context.pattern.pattern,
      confidence: context.pattern.confidence,
      shared: false,
      sharedWith: [],
      discoveredAt: new Date().toISOString()
    };

    const shared = broadcastPattern(context.pattern.domain, pattern);
    sharedPatterns.push(...shared);
  }

  // Handle load balancing if present
  if (context?.load) {
    const balance = negotiateLoadBalance(
      context.load,
      {
        healthcare: 0.7,
        healthcrm: 0.7,
        benefitscrm: 0.7,
        compliance: 0.7,
        workflow: 0.7,
        notification: 0.7,
        migration: 0.7,
        analytics: 0.7,
        commerce: 0.7,
        crm: 0.7,
        content: 0.7
      }
    );
    loadBalances.push(balance);
  }

  // Build MOF state
  const state: MOFState = {
    sovereigns,
    signals,
    events,
    negotiations,
    councilDecisions,
    sharedPatterns,
    loadBalances,
    evolutions,
    protections,
    expansions,
    lastUpdated: new Date().toISOString()
  };

  // Generate summary
  const summary = generateFederationSummary(
    signals,
    events,
    negotiations,
    councilDecisions,
    sharedPatterns,
    loadBalances,
    evolutions,
    protections,
    expansions
  );

  return {
    state,
    signals,
    events,
    negotiations,
    councilDecisions,
    sharedPatterns,
    loadBalances,
    evolutions,
    protections,
    expansions,
    summary
  };
}
