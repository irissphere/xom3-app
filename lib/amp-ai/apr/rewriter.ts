// STRIKE 1, 3, 4, 5, 6, 7: Pipeline Rewriter
// Rewrites pipeline structure based on suggestions

import { 
  PipelineStructure, 
  PipelineNode, 
  PipelineChange, 
  PipelineRewrite,
  WorkflowHook,
  NotificationRule,
  ValidationRule
} from "./types";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Create initial pipeline structure from migration pipeline
 */
export function createPipelineStructure(
  pipeline: MigrationPipeline
): PipelineStructure {
  const stages: PipelineNode[] = [
    {
      id: "source",
      type: "source",
      config: pipeline.source,
      position: 0,
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    },
    {
      id: "transform",
      type: "transform",
      config: {
        profileKey: pipeline.mapping.profileKey,
        autoDetect: pipeline.mapping.autoDetect
      },
      position: 1,
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    },
    {
      id: "insert",
      type: "insert",
      config: {
        targetTable: pipeline.targetTable
      },
      position: 2,
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    }
  ];

  const workflowHooks: WorkflowHook[] = [];
  if (pipeline.workflow?.triggerOnSuccess) {
    workflowHooks.push({
      id: "workflow-success",
      workflowId: pipeline.workflow.workflowId || "",
      trigger: "on_success",
      position: 0,
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    });
  }
  if (pipeline.workflow?.triggerOnError) {
    workflowHooks.push({
      id: "workflow-error",
      workflowId: pipeline.workflow.workflowId || "",
      trigger: "on_error",
      position: 1,
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    });
  }

  const notificationRules: NotificationRule[] = [];
  if (pipeline.notification?.onSuccess) {
    notificationRules.push({
      id: "notify-success",
      type: "alert",
      trigger: "workflow_success",
      channels: pipeline.notification.channels || [],
      enabled: true,
      metadata: {
        addedBy: "apr",
        addedAt: pipeline.createdAt
      }
    });
  }

  const validationRules: ValidationRule[] = [];
  if (pipeline.validation) {
    if (pipeline.validation.requiredFields) {
      pipeline.validation.requiredFields.forEach((field, idx) => {
        validationRules.push({
          id: `validate-${field}`,
          field,
          ruleType: "required",
          rule: { required: true },
          position: idx,
          enabled: true,
          metadata: {
            addedBy: "apr",
            addedAt: pipeline.createdAt
          }
        });
      });
    }
  }

  return {
    stages,
    workflowHooks,
    notificationRules,
    validationRules,
    metadata: {
      version: 1,
      lastModified: pipeline.updatedAt,
      modifiedBy: "apr"
    }
  };
}

/**
 * Apply changes to pipeline structure
 */
export function applyPipelineChanges(
  structure: PipelineStructure,
  changes: PipelineChange[],
  trigger: string,
  confidence: number
): PipelineRewrite {
  const beforeState = JSON.parse(JSON.stringify(structure));
  const newStages = [...structure.stages];
  const newWorkflowHooks = [...structure.workflowHooks];
  const newNotificationRules = [...structure.notificationRules];
  const newValidationRules = [...structure.validationRules];

  const appliedChanges: PipelineChange[] = [];

  for (const change of changes) {
    try {
      switch (change.type) {
        case "add_stage":
          if (change.stage && change.position !== undefined) {
            const newNode: PipelineNode = {
              id: `${change.stage}-${Date.now()}`,
              type: change.stage,
              config: change.config || {},
              position: change.position,
              enabled: true,
              metadata: {
                addedBy: "apr",
                addedAt: new Date().toISOString(),
                reason: change.reason,
                confidence: change.confidence
              }
            };
            
            // Insert at position, shift others
            newStages.splice(change.position, 0, newNode);
            // Reindex positions
            newStages.forEach((stage, idx) => {
              stage.position = idx;
            });
            
            appliedChanges.push(change);
          }
          break;

        case "remove_stage":
          if (change.stage) {
            const index = newStages.findIndex(s => s.type === change.stage);
            if (index !== -1 && newStages[index].metadata?.addedBy === "apr") {
              newStages.splice(index, 1);
              // Reindex positions
              newStages.forEach((stage, idx) => {
                stage.position = idx;
              });
              appliedChanges.push(change);
            }
          }
          break;

        case "reorder_stage":
          if (change.stage && change.oldPosition !== undefined && change.newPosition !== undefined) {
            const index = newStages.findIndex(s => s.type === change.stage);
            if (index !== -1) {
              const [moved] = newStages.splice(index, 1);
              newStages.splice(change.newPosition, 0, moved);
              // Reindex positions
              newStages.forEach((stage, idx) => {
                stage.position = idx;
              });
              appliedChanges.push(change);
            }
          }
          break;

        case "modify_stage":
          if (change.stage) {
            const stage = newStages.find(s => s.type === change.stage);
            if (stage) {
              stage.config = { ...stage.config, ...change.config };
              stage.metadata = {
                ...stage.metadata,
                addedBy: "apr",
                addedAt: new Date().toISOString(),
                reason: change.reason,
                confidence: change.confidence
              };
              appliedChanges.push(change);
            }
          }
          break;

        case "insert_node":
          if (change.node) {
            const position = change.position !== undefined ? change.position : newStages.length;
            newStages.splice(position, 0, change.node);
            // Reindex positions
            newStages.forEach((stage, idx) => {
              stage.position = idx;
            });
            appliedChanges.push(change);
          }
          break;
      }
    } catch (error) {
      console.error(`[APR] Failed to apply change ${change.type}:`, error);
    }
  }

  const afterState: PipelineStructure = {
    stages: newStages,
    workflowHooks: newWorkflowHooks,
    notificationRules: newNotificationRules,
    validationRules: newValidationRules,
    metadata: {
      version: structure.metadata.version + 1,
      lastModified: new Date().toISOString(),
      modifiedBy: "apr"
    }
  };

  const rewrite: PipelineRewrite = {
    pipelineId: "",
    tenant: "",
    trigger: trigger as any,
    changes: appliedChanges,
    confidence,
    applied: appliedChanges.length > 0,
    appliedAt: appliedChanges.length > 0 ? new Date().toISOString() : undefined,
    explanation: generateRewriteExplanation(appliedChanges, trigger),
    beforeState,
    afterState
  };

  return rewrite;
}

/**
 * Add workflow hook
 */
export function addWorkflowHook(
  structure: PipelineStructure,
  hook: Omit<WorkflowHook, "id" | "position">
): PipelineStructure {
  const newHook: WorkflowHook = {
    ...hook,
    id: `workflow-${Date.now()}`,
    position: structure.workflowHooks.length,
    metadata: {
      ...hook.metadata,
      addedBy: "apr",
      addedAt: new Date().toISOString()
    }
  };

  return {
    ...structure,
    workflowHooks: [...structure.workflowHooks, newHook],
    metadata: {
      ...structure.metadata,
      version: structure.metadata.version + 1,
      lastModified: new Date().toISOString(),
      modifiedBy: "apr"
    }
  };
}

/**
 * Add notification rule
 */
export function addNotificationRule(
  structure: PipelineStructure,
  rule: Omit<NotificationRule, "id">
): PipelineStructure {
  const newRule: NotificationRule = {
    ...rule,
    id: `notify-${Date.now()}`,
    metadata: {
      ...rule.metadata,
      addedBy: "apr",
      addedAt: new Date().toISOString()
    }
  };

  return {
    ...structure,
    notificationRules: [...structure.notificationRules, newRule],
    metadata: {
      ...structure.metadata,
      version: structure.metadata.version + 1,
      lastModified: new Date().toISOString(),
      modifiedBy: "apr"
    }
  };
}

/**
 * Add validation rule
 */
export function addValidationRule(
  structure: PipelineStructure,
  rule: Omit<ValidationRule, "id" | "position">
): PipelineStructure {
  const newRule: ValidationRule = {
    ...rule,
    id: `validate-${Date.now()}`,
    position: structure.validationRules.length,
    metadata: {
      ...rule.metadata,
      addedBy: "apr",
      addedAt: new Date().toISOString()
    }
  };

  return {
    ...structure,
    validationRules: [...structure.validationRules, newRule],
    metadata: {
      ...structure.metadata,
      version: structure.metadata.version + 1,
      lastModified: new Date().toISOString(),
      modifiedBy: "apr"
    }
  };
}

/**
 * Generate rewrite explanation
 */
function generateRewriteExplanation(changes: PipelineChange[], trigger: string): string {
  if (changes.length === 0) {
    return "No changes applied.";
  }

  const changeDescriptions = changes.map(change => {
    switch (change.type) {
      case "add_stage":
        return `Added ${change.stage} stage (${change.reason})`;
      case "remove_stage":
        return `Removed ${change.stage} stage (${change.reason})`;
      case "reorder_stage":
        return `Reordered ${change.stage} from position ${change.oldPosition} to ${change.newPosition} (${change.reason})`;
      case "modify_stage":
        return `Modified ${change.stage} stage (${change.reason})`;
      case "insert_node":
        return `Inserted ${change.node?.type} node (${change.reason})`;
      default:
        return `Applied change: ${change.reason}`;
    }
  }).join(", ");

  return `Pipeline rewritten due to ${trigger}: ${changeDescriptions}`;
}
