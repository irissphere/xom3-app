// STRIKE 7: Auto-Explain What It Did
// Generate human-readable explanations for all AMP-AI actions

import { AIExplanation, AMPAIContext } from "./types";

/**
 * Create an explanation for an AMP-AI action
 */
export function explain(
  action: string,
  description: string,
  details: Record<string, any> = {},
  confidence?: number
): AIExplanation {
  return {
    action,
    description,
    details,
    timestamp: new Date().toISOString(),
    confidence
  };
}

/**
 * Explain schema detection
 */
export function explainSchemaDetection(
  detectedColumns: number,
  suggestedProfile?: string,
  confidence?: number
): AIExplanation {
  let description = `Detected ${detectedColumns} columns in source data`;
  
  if (suggestedProfile) {
    description += ` and suggested mapping profile "${suggestedProfile}"`;
    if (confidence) {
      description += ` with ${(confidence * 100).toFixed(0)}% confidence`;
    }
  }

  return explain(
    "schema_detection",
    description,
    {
      columnsDetected: detectedColumns,
      suggestedProfile,
      confidence
    },
    confidence
  );
}

/**
 * Explain profile suggestion
 */
export function explainProfileSuggestion(
  profileName: string,
  score: number,
  matchedColumns: number
): AIExplanation {
  return explain(
    "profile_suggestion",
    `Suggested mapping profile "${profileName}" (${matchedColumns} columns matched, ${(score * 100).toFixed(0)}% similarity)`,
    {
      profileName,
      score,
      matchedColumns
    },
    score
  );
}

/**
 * Explain data cleaning
 */
export function explainDataCleaning(
  changesCount: number,
  fieldsCleaned: string[]
): AIExplanation {
  return explain(
    "data_cleaning",
    `Cleaned ${changesCount} field${changesCount !== 1 ? "s" : ""} across ${fieldsCleaned.length} column${fieldsCleaned.length !== 1 ? "s" : ""}`,
    {
      changesCount,
      fieldsCleaned
    }
  );
}

/**
 * Explain auto-repair
 */
export function explainAutoRepair(
  repairsApplied: number,
  repairs: Array<{ field: string; reason: string }>
): AIExplanation {
  const reasons = repairs.map(r => `${r.field}: ${r.reason}`).join(", ");
  
  return explain(
    "auto_repair",
    `Repaired ${repairsApplied} issue${repairsApplied !== 1 ? "s" : ""}: ${reasons}`,
    {
      repairsApplied,
      repairs
    }
  );
}

/**
 * Explain optimization insight
 */
export function explainOptimization(
  insightType: string,
  recommendation: string,
  impact: string
): AIExplanation {
  return explain(
    "optimization",
    `Optimization insight: ${recommendation} (${impact} impact)`,
    {
      insightType,
      recommendation,
      impact
    }
  );
}

/**
 * Explain pattern detection
 */
export function explainPatternDetection(
  patternType: string,
  description: string,
  severity: string
): AIExplanation {
  return explain(
    "pattern_detection",
    `Detected ${patternType} pattern: ${description} (${severity} severity)`,
    {
      patternType,
      description,
      severity
    }
  );
}

/**
 * Add explanation to context
 */
export function addExplanation(
  context: AMPAIContext,
  explanation: AIExplanation
): AMPAIContext {
  return {
    ...context,
    explanations: [...(context.explanations || []), explanation]
  };
}

/**
 * Get formatted explanation summary
 */
export function getExplanationSummary(context: AMPAIContext): string {
  if (!context.explanations || context.explanations.length === 0) {
    return "No AMP-AI actions performed";
  }

  return context.explanations
    .map(exp => `• ${exp.description}`)
    .join("\n");
}
