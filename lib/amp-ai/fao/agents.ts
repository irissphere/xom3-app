// STRIKE 1: Pipelines Become Agents
// Transform pipelines into autonomous agents

import { PipelineAgent, AgentGoal, AgentTrigger, AgentBehavior, AgentMemory, EvolutionRule } from "./types";
import { MigrationPipeline } from "../../pipelines/types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Create pipeline agent from migration pipeline
 */
export function createPipelineAgent(pipeline: MigrationPipeline): PipelineAgent {
  // Define default goals
  const goals: AgentGoal[] = [
    {
      id: "throughput",
      type: "throughput",
      target: 100, // rows per second
      current: 0,
      priority: 1,
      status: "progressing"
    },
    {
      id: "accuracy",
      type: "accuracy",
      target: 0.95, // 95% success rate
      current: 0,
      priority: 2,
      status: "progressing"
    },
    {
      id: "latency",
      type: "latency",
      target: 5000, // 5 seconds max
      current: 0,
      priority: 3,
      status: "progressing"
    }
  ];

  // Define default triggers
  const triggers: AgentTrigger[] = [
    {
      id: "schedule-trigger",
      type: "schedule",
      condition: pipeline.schedule,
      action: "run",
      enabled: pipeline.enabled
    },
    {
      id: "error-trigger",
      type: "event",
      condition: "error_rate > 0.2",
      action: "backoff",
      enabled: true
    },
    {
      id: "drift-trigger",
      type: "signal",
      condition: "schema_drift_detected",
      action: "reconfigure",
      enabled: true
    }
  ];

  // Define default behaviors
  const behaviors: AgentBehavior[] = [
    {
      id: "auto-routing",
      type: "routing",
      config: {
        enabled: true,
        optimizeFor: "throughput"
      },
      enabled: true
    },
    {
      id: "auto-scheduling",
      type: "scheduling",
      config: {
        enabled: true,
        adaptive: true
      },
      enabled: true
    },
    {
      id: "auto-error-handling",
      type: "error_handling",
      config: {
        enabled: true,
        autoRetry: true,
        autoRepair: true
      },
      enabled: true
    }
  ];

  // Initialize memory
  const memory: AgentMemory = {
    executionHistory: [],
    errorPatterns: [],
    performanceMetrics: [],
    decisions: [],
    lastUpdated: new Date().toISOString()
  };

  // Define evolution rules
  const evolutionRules: EvolutionRule[] = [
    {
      id: "rewrite-on-drift",
      condition: "schema_drift_count >= 3",
      action: "rewrite",
      config: {
        addStages: ["ai_detect", "pre_clean"]
      },
      enabled: true
    },
    {
      id: "rewrite-on-errors",
      condition: "error_rate > 0.3",
      action: "rewrite",
      config: {
        addStages: ["pre_clean", "validate"]
      },
      enabled: true
    }
  ];

  return {
    id: `agent-${pipeline.id}`,
    pipelineId: pipeline.id,
    tenant: pipeline.tenant,
    goals,
    triggers,
    behaviors,
    memory,
    evolutionRules,
    state: pipeline.enabled ? "active" : "paused",
    lastDecision: "Agent created",
    lastDecisionAt: new Date().toISOString()
  };
}

/**
 * Update agent memory from execution
 */
export async function updateAgentMemory(
  agent: PipelineAgent,
  execution: {
    status: string;
    rowsProcessed: number;
    rowsFailed: number;
    executionTime: number;
    errors?: Array<{ error: string }>;
  }
): Promise<PipelineAgent> {
  // Add execution record
  agent.memory.executionHistory.push({
    timestamp: new Date().toISOString(),
    status: execution.status,
    rowsProcessed: execution.rowsProcessed,
    rowsFailed: execution.rowsFailed,
    executionTime: execution.executionTime,
    decisions: []
  });

  // Update error patterns
  if (execution.errors) {
    execution.errors.forEach(err => {
      const errorType = classifyError(err.error);
      const existing = agent.memory.errorPatterns.find(p => p.type === errorType);
      
      if (existing) {
        existing.frequency++;
        existing.lastSeen = new Date().toISOString();
      } else {
        agent.memory.errorPatterns.push({
          type: errorType,
          frequency: 1,
          lastSeen: new Date().toISOString(),
          resolution: "pending"
        });
      }
    });
  }

  // Update performance metrics
  const throughput = execution.rowsProcessed > 0 
    ? (execution.rowsProcessed / execution.executionTime) * 1000 
    : 0;
  const accuracy = execution.rowsProcessed > 0
    ? 1 - (execution.rowsFailed / execution.rowsProcessed)
    : 0;

  agent.memory.performanceMetrics.push({
    metric: "throughput",
    value: throughput,
    timestamp: new Date().toISOString(),
    trend: "stable"
  });

  agent.memory.performanceMetrics.push({
    metric: "accuracy",
    value: accuracy,
    timestamp: new Date().toISOString(),
    trend: "stable"
  });

  // Update goals
  agent.goals.forEach(goal => {
    if (goal.type === "throughput") {
      goal.current = throughput;
      goal.status = throughput >= goal.target ? "achieved" : "progressing";
    } else if (goal.type === "accuracy") {
      goal.current = accuracy;
      goal.status = accuracy >= goal.target ? "achieved" : "progressing";
    } else if (goal.type === "latency") {
      goal.current = execution.executionTime;
      goal.status = execution.executionTime <= goal.target ? "achieved" : "failing";
    }
  });

  agent.memory.lastUpdated = new Date().toISOString();

  return agent;
}

/**
 * Make autonomous decision for agent
 */
export function makeAgentDecision(
  agent: PipelineAgent,
  context: {
    load?: number;
    drift?: boolean;
    errors?: number;
    predictions?: any;
  }
): {
  decision: string;
  action: string;
  reason: string;
  confidence: number;
} {
  // Evaluate triggers
  for (const trigger of agent.triggers) {
    if (!trigger.enabled) continue;

    let shouldTrigger = false;

    switch (trigger.type) {
      case "event":
        if (trigger.condition.includes("error_rate")) {
          const errorRate = context.errors || 0;
          shouldTrigger = errorRate > 0.2;
        }
        break;
      case "signal":
        if (trigger.condition === "schema_drift_detected") {
          shouldTrigger = context.drift || false;
        }
        break;
      case "condition":
        // Evaluate condition (simplified)
        shouldTrigger = true; // Would need proper condition evaluator
        break;
    }

    if (shouldTrigger) {
      return {
        decision: trigger.action,
        action: trigger.action,
        reason: `Trigger activated: ${trigger.condition}`,
        confidence: 0.8
      };
    }
  }

  // Default decision
  return {
    decision: "run",
    action: "run",
    reason: "No triggers activated, proceeding with normal execution",
    confidence: 1.0
  };
}

/**
 * Classify error type
 */
function classifyError(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes("missing") || lower.includes("required")) return "missing_field";
  if (lower.includes("invalid") || lower.includes("format")) return "invalid_format";
  if (lower.includes("email")) return "email_validation";
  if (lower.includes("phone")) return "phone_validation";
  if (lower.includes("timeout")) return "timeout";
  return "unknown";
}
