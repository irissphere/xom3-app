// STRIKE 9: Generate Rewrite Explanations
// Human-readable explanations for all pipeline rewrites

import { PipelineRewrite, PipelineChange } from "./types";

/**
 * Explain a pipeline rewrite
 */
export function explainPipelineRewrite(rewrite: PipelineRewrite): string {
  const parts: string[] = [];

  parts.push(`[APR] Pipeline Rewrite: ${rewrite.trigger}`);
  parts.push(`Confidence: ${(rewrite.confidence * 100).toFixed(0)}%`);
  parts.push(`Applied: ${rewrite.applied ? "Yes" : "No"}`);
  parts.push("");

  if (rewrite.changes.length > 0) {
    parts.push("Changes Applied:");
    rewrite.changes.forEach((change, idx) => {
      parts.push(`  ${idx + 1}. ${explainChange(change)}`);
    });
    parts.push("");
  }

  parts.push(`Explanation: ${rewrite.explanation}`);

  if (rewrite.appliedAt) {
    parts.push(`Applied At: ${new Date(rewrite.appliedAt).toLocaleString()}`);
  }

  return parts.join("\n");
}

/**
 * Explain a single change
 */
function explainChange(change: PipelineChange): string {
  switch (change.type) {
    case "add_stage":
      return `Added ${change.stage} stage at position ${change.position}. Reason: ${change.reason}`;
    
    case "remove_stage":
      return `Removed ${change.stage} stage. Reason: ${change.reason}`;
    
    case "reorder_stage":
      return `Reordered ${change.stage} from position ${change.oldPosition} to ${change.newPosition}. Reason: ${change.reason}`;
    
    case "modify_stage":
      return `Modified ${change.stage} stage. Reason: ${change.reason}`;
    
    case "insert_node":
      return `Inserted ${change.node?.type} node at position ${change.position}. Reason: ${change.reason}`;
    
    default:
      return `Applied change: ${change.reason}`;
  }
}

/**
 * Generate detailed rewrite summary
 */
export function generateRewriteSummary(rewrite: PipelineRewrite): string {
  const summary: string[] = [];

  summary.push("=== Pipeline Rewrite Summary ===");
  summary.push("");
  summary.push(`Trigger: ${rewrite.trigger}`);
  summary.push(`Confidence: ${(rewrite.confidence * 100).toFixed(0)}%`);
  summary.push(`Status: ${rewrite.applied ? "✅ Applied" : "⏸️ Pending Review"}`);
  summary.push("");

  // Before/After comparison
  summary.push("Pipeline Structure Changes:");
  summary.push(`  Before: ${rewrite.beforeState.stages.length} stages`);
  summary.push(`  After: ${rewrite.afterState.stages.length} stages`);
  summary.push("");

  // Stage changes
  const beforeStages = rewrite.beforeState.stages.map(s => s.type);
  const afterStages = rewrite.afterState.stages.map(s => s.type);
  
  const addedStages = afterStages.filter(s => !beforeStages.includes(s));
  const removedStages = beforeStages.filter(s => !afterStages.includes(s));

  if (addedStages.length > 0) {
    summary.push(`Added Stages: ${addedStages.join(", ")}`);
  }
  if (removedStages.length > 0) {
    summary.push(`Removed Stages: ${removedStages.join(", ")}`);
  }
  if (addedStages.length === 0 && removedStages.length === 0) {
    summary.push("Stage order or configuration modified");
  }
  summary.push("");

  // Detailed changes
  if (rewrite.changes.length > 0) {
    summary.push("Detailed Changes:");
    rewrite.changes.forEach((change, idx) => {
      summary.push(`  ${idx + 1}. ${explainChange(change)}`);
      summary.push(`     Confidence: ${(change.confidence * 100).toFixed(0)}%`);
    });
    summary.push("");
  }

  // Explanation
  summary.push("Full Explanation:");
  summary.push(`  ${rewrite.explanation}`);

  return summary.join("\n");
}

/**
 * Generate visualization update description
 */
export function generateVisualizationUpdate(rewrite: PipelineRewrite): {
  newNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  reorderedNodes: string[];
} {
  const beforeStages = rewrite.beforeState.stages.map(s => s.type);
  const afterStages = rewrite.afterState.stages.map(s => s.type);

  const newNodes = afterStages.filter(s => !beforeStages.includes(s));
  const removedNodes = beforeStages.filter(s => !afterStages.includes(s));
  
  const modifiedNodes: string[] = [];
  const reorderedNodes: string[] = [];

  // Check for modifications
  rewrite.beforeState.stages.forEach(beforeStage => {
    const afterStage = rewrite.afterState.stages.find(a => a.type === beforeStage.type);
    if (afterStage && JSON.stringify(beforeStage.config) !== JSON.stringify(afterStage.config)) {
      modifiedNodes.push(beforeStage.type);
    }
    if (afterStage && beforeStage.position !== afterStage.position) {
      reorderedNodes.push(beforeStage.type);
    }
  });

  return {
    newNodes,
    removedNodes,
    modifiedNodes,
    reorderedNodes
  };
}
