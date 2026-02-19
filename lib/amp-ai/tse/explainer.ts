// 👑 STRIKE 8: The Engine Gains Self-Explanation
// Explains all sovereign decisions in human language

import { SovereignDecision } from "./types";

/**
 * Explain sovereign decision
 */
export function explainSovereignDecision(decision: SovereignDecision): string {
  const parts: string[] = [];

  parts.push(`[TSE Sovereign] ${decision.type.toUpperCase()}: ${decision.decision}`);
  parts.push(`Timestamp: ${new Date(decision.timestamp).toLocaleString()}`);
  parts.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
  parts.push("");

  parts.push(`Reason: ${decision.reason}`);
  parts.push("");

  if (decision.actions.length > 0) {
    parts.push("Actions Taken:");
    decision.actions.forEach((action, idx) => {
      const status = action.applied ? "✅" : "⏸️";
      parts.push(`  ${idx + 1}. ${status} ${action.action} on ${action.target}`);
      if (action.result) {
        parts.push(`     → ${action.result}`);
      }
    });
    parts.push("");
  }

  if (decision.outcome) {
    parts.push(`Outcome: ${decision.outcome}`);
    parts.push("");
  }

  parts.push(`Full Explanation: ${decision.explanation}`);

  return parts.join("\n");
}

/**
 * Generate sovereign summary
 */
export function generateSovereignSummary(decisions: SovereignDecision[]): string {
  if (decisions.length === 0) {
    return "No sovereign decisions made.";
  }

  const parts: string[] = [];
  parts.push("=== TSE Sovereign Summary ===");
  parts.push("");

  // Group by type
  const byType: Record<string, SovereignDecision[]> = {};
  decisions.forEach(d => {
    if (!byType[d.type]) {
      byType[d.type] = [];
    }
    byType[d.type].push(d);
  });

  for (const [type, typeDecisions] of Object.entries(byType)) {
    parts.push(`${type.toUpperCase()} (${typeDecisions.length}):`);
    typeDecisions.forEach((decision, idx) => {
      parts.push(`  ${idx + 1}. ${decision.decision}: ${decision.reason}`);
      if (decision.actions.length > 0) {
        parts.push(`     Actions: ${decision.actions.map(a => a.action).join(", ")}`);
      }
    });
    parts.push("");
  }

  return parts.join("\n");
}
