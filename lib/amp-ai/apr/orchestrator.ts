// APR Orchestrator
// Coordinates all pipeline rewriting strikes

import { PipelineStructure, PipelineRewrite, RewriteSuggestion } from "./types";
import { MigrationPipeline } from "../../pipelines/types";
import { createPipelineStructure, applyPipelineChanges } from "./rewriter";
import { evaluateRewriteTriggers } from "./triggers";
import { explainPipelineRewrite, generateRewriteSummary } from "./explainer";

/**
 * Run complete APR rewrite cycle
 */
export async function runAPR(
  pipeline: MigrationPipeline,
  ppoPredictions?: any
): Promise<{
  rewrite?: PipelineRewrite;
  suggestions: RewriteSuggestion[];
  summary: string;
  applied: boolean;
}> {
  try {
    // Create current pipeline structure
    const currentStructure = createPipelineStructure(pipeline);

    // Evaluate rewrite triggers
    const suggestions = await evaluateRewriteTriggers(
      pipeline.id,
      pipeline.tenant,
      ppoPredictions
    );

    if (suggestions.length === 0) {
      return {
        suggestions: [],
        summary: "No rewrite suggestions generated.",
        applied: false
      };
    }

    // Get highest confidence suggestion
    const bestSuggestion = suggestions[0];
    
    // Only apply if confidence is high enough
    const shouldApply = bestSuggestion.confidence >= 0.75 && bestSuggestion.impact === "high";

    // Apply changes
    const rewrite = applyPipelineChanges(
      currentStructure,
      bestSuggestion.changes,
      bestSuggestion.trigger,
      bestSuggestion.confidence
    );

    rewrite.pipelineId = pipeline.id;
    rewrite.tenant = pipeline.tenant;
    rewrite.applied = shouldApply;

    // Generate summary
    const summary = generateRewriteSummary(rewrite);

    return {
      rewrite,
      suggestions,
      summary,
      applied: shouldApply
    };
  } catch (error) {
    console.error("[APR] Rewrite cycle failed:", error);
    return {
      suggestions: [],
      summary: "Rewrite cycle encountered an error (see logs)",
      applied: false
    };
  }
}

/**
 * Apply rewrite to pipeline
 */
export async function applyRewrite(
  pipeline: MigrationPipeline,
  rewrite: PipelineRewrite
): Promise<MigrationPipeline> {
  // Update pipeline based on rewrite
  const updatedPipeline: MigrationPipeline = {
    ...pipeline,
    updatedAt: new Date().toISOString()
  };

  // Apply stage changes (simplified - would need full pipeline update logic)
  // For now, we'll store the rewrite in pipeline details
  updatedPipeline.mapping = {
    ...updatedPipeline.mapping,
    // Add APR metadata
    autoDetect: true // Enable auto-detection if AI detection stage added
  };

  return updatedPipeline;
}
