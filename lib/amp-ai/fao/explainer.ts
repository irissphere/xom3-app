// STRIKE 9: Autonomous Explanation Layer
// Explains all orchestration decisions

import { OrchestrationExplanation } from "./types";

/**
 * Explain orchestration decision
 */
export function explainDecision(
  decision: string,
  reason: string,
  factors: string[],
  confidence: number,
  outcome?: string
): OrchestrationExplanation {
  const explanation = `[FAO] ${decision}: ${reason}. Factors: ${factors.join(", ")}. Confidence: ${(confidence * 100).toFixed(0)}%.${outcome ? ` Outcome: ${outcome}.` : ""}`;

  return {
    timestamp: new Date().toISOString(),
    decision,
    reason,
    factors,
    confidence,
    outcome,
    explanation
  };
}

/**
 * Generate comprehensive orchestration summary
 */
export function generateOrchestrationSummary(
  explanations: OrchestrationExplanation[]
): string {
  if (explanations.length === 0) {
    return "No orchestration decisions made.";
  }

  const parts: string[] = [];
  parts.push("=== FAO Orchestration Summary ===");
  parts.push("");

  explanations.forEach((exp, idx) => {
    parts.push(`${idx + 1}. ${exp.explanation}`);
    parts.push("");
  });

  return parts.join("\n");
}
