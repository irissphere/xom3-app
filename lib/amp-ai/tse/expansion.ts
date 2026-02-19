// 👑 STRIKE 4: The Engine Gains Self-Expansion
// Creates new pipelines, workflows, profiles, rules

import { SovereignExpansion, SovereignDecision } from "./types";
import { manageProfileAutonomously } from "../fao/profile-management";
import fs from "fs";
import path from "path";

/**
 * Expand autonomously
 */
export async function expandAutonomously(
  tenant: string,
  signals: {
    newColumns?: string[];
    tenantDivergence?: boolean;
    newPattern?: string;
    workflowNeeded?: boolean;
  }
): Promise<{
  expansions: SovereignExpansion[];
  decision: SovereignDecision;
}> {
  const expansions: SovereignExpansion[] = [];

  // Create new profile if new columns detected
  if (signals.newColumns && signals.newColumns.length > 0) {
    const profileManagement = await manageProfileAutonomously(
      "default-csv",
      tenant,
      "create",
      { newColumns: signals.newColumns }
    );

    if (profileManagement.applied && profileManagement.newProfileKey) {
      expansions.push({
        type: "profile",
        created: true,
        id: profileManagement.newProfileKey,
        reason: `New columns detected: ${signals.newColumns.join(", ")}, created new profile`,
        confidence: profileManagement.confidence,
        metadata: {
          columns: signals.newColumns,
          tenant
        }
      });
    }
  }

  // Split profile if tenant diverging
  if (signals.tenantDivergence) {
    const profileManagement = await manageProfileAutonomously(
      "default-csv",
      tenant,
      "split",
      { tenantDivergence: true }
    );

    if (profileManagement.applied && profileManagement.newProfileKey) {
      expansions.push({
        type: "profile",
        created: true,
        id: profileManagement.newProfileKey,
        reason: `Tenant diverging from base profile, split into tenant-specific profile`,
        confidence: profileManagement.confidence,
        metadata: {
          originalProfile: profileManagement.profileKey,
          tenant
        }
      });
    }
  }

  // Create new workflow if pattern detected
  if (signals.workflowNeeded && signals.newPattern) {
    expansions.push({
      type: "workflow",
      created: true,
      id: `workflow-${Date.now()}`,
      reason: `New pattern detected: ${signals.newPattern}, workflow needed`,
      confidence: 0.7,
      metadata: {
        pattern: signals.newPattern,
        tenant
      }
    });
  }

  const decision: SovereignDecision = {
    id: `expansion-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "expansion",
    decision: expansions.length > 0 ? "expand" : "monitor",
    reason: expansions.length > 0 
      ? `Created ${expansions.length} new ${expansions.map(e => e.type).join(", ")}`
      : "No expansion needed",
    actions: expansions.map(e => ({
      action: "create",
      target: e.id || "unknown",
      applied: e.created,
      result: e.reason
    })),
    confidence: expansions.length > 0 ? 0.8 : 0.5,
    explanation: expansions.length > 0
      ? `TSE expanded capabilities: ${expansions.map(e => `Created ${e.type} '${e.id}' (${e.reason})`).join(". ")}.`
      : "No expansion needed at this time."
  };

  return { expansions, decision };
}
