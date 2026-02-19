// STRIKE 8: Enable Cross-Domain Self-Expansion
// Sovereigns can create, split, merge, spawn

import { SovereignExpansion, SovereignDomain } from "./types";
import { createSovereignUnit } from "./sovereign-units";

/**
 * Create new sovereign
 */
export function createNewSovereign(
  parentDomain: SovereignDomain,
  newDomain: SovereignDomain,
  reason: string
): SovereignExpansion {
  const newSovereign = createSovereignUnit(newDomain);

  return {
    id: `expansion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentDomain,
    newDomain,
    type: "create",
    reason,
    applied: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Split sovereign
 */
export function splitSovereign(
  domain: SovereignDomain,
  reason: string
): SovereignExpansion {
  // Split into sub-domains (simplified)
  const subDomain = `${domain}-sub` as SovereignDomain;

  return {
    id: `split-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentDomain: domain,
    newDomain: subDomain,
    type: "split",
    reason,
    applied: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Merge sovereigns
 */
export function mergeSovereigns(
  domains: SovereignDomain[],
  reason: string
): SovereignExpansion {
  return {
    id: `merge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentDomain: domains[0],
    type: "merge",
    reason: `${domains.join(", ")} merged: ${reason}`,
    applied: true,
    timestamp: new Date().toISOString()
  };
}

/**
 * Spawn sub-organism
 */
export function spawnSubOrganism(
  parentDomain: SovereignDomain,
  reason: string
): SovereignExpansion {
  const subDomain = `${parentDomain}-spawn` as SovereignDomain;

  return {
    id: `spawn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parentDomain,
    newDomain: subDomain,
    type: "spawn",
    reason,
    applied: true,
    timestamp: new Date().toISOString()
  };
}
