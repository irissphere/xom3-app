// STRIKE 6: Enable Cross-Domain Evolution
// Sovereigns evolve together

import { CrossDomainEvolution, SovereignDomain } from "./types";
import { sendSignal, broadcastEvent } from "./isp";

/**
 * Coordinate evolution across domains
 */
export function coordinateEvolution(
  domains: SovereignDomain[],
  evolutionType: CrossDomainEvolution["evolutionType"],
  trigger: {
    domain: SovereignDomain;
    change: any;
    reason: string;
  }
): CrossDomainEvolution {
  const changes: CrossDomainEvolution["changes"] = [trigger];

  // Notify other domains
  domains.forEach(domain => {
    if (domain !== trigger.domain) {
      // Send evolution signal
      sendSignal(
        trigger.domain,
        domain,
        "event",
        {
          evolutionType,
          change: trigger.change,
          reason: trigger.reason
        },
        "high"
      );

      // Determine if domain should evolve in response
      const shouldEvolve = shouldEvolveInResponse(domain, trigger.domain, evolutionType);
      
      if (shouldEvolve) {
        changes.push({
          domain,
          change: inferEvolutionChange(domain, trigger),
          reason: `Evolved in response to ${trigger.domain} evolution`
        });
      }
    }
  });

  return {
    id: `evolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    domains,
    evolutionType,
    changes,
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Determine if domain should evolve in response
 */
function shouldEvolveInResponse(
  domain: SovereignDomain,
  sourceDomain: SovereignDomain,
  evolutionType: string
): boolean {
  // Evolution dependencies
  const dependencies: Record<SovereignDomain, SovereignDomain[]> = {
    workflow: ["migration", "compliance"],
    migration: ["compliance", "analytics"],
    compliance: ["workflow", "notification"],
    notification: ["workflow", "analytics"],
    analytics: ["migration", "commerce"],
    commerce: ["crm", "content"],
    crm: ["commerce", "content"],
    content: ["commerce", "crm"],
    healthcare: ["compliance", "workflow"],
    healthcrm: ["compliance", "workflow"],
    benefitscrm: ["compliance", "workflow"],
  };

  return dependencies[domain]?.includes(sourceDomain) || false;
}

/**
 * Infer evolution change for domain
 */
function inferEvolutionChange(
  domain: SovereignDomain,
  trigger: {
    domain: SovereignDomain;
    change: any;
    reason: string;
  }
): any {
  // Simplified inference logic
  if (trigger.domain === "workflow" && domain === "migration") {
    return {
      type: "mapping_update",
      reason: "Workflow trigger evolved, updating migration mapping"
    };
  }

  if (trigger.domain === "migration" && domain === "compliance") {
    return {
      type: "rule_update",
      reason: "Migration mapping evolved, updating compliance rules"
    };
  }

  return {
    type: "coordinate",
    reason: `Coordinating with ${trigger.domain} evolution`
  };
}
