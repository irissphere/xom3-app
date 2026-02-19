// UOI 2: Unified Orchestration Layer
// Central engine for prioritization, conflict resolution, resource allocation

import { OrchestrationDecision, UnifiedDataModel } from "./types";

/**
 * Prioritize tasks across all domains
 */
export function prioritizeTasks(
  model: UnifiedDataModel,
  tasks: Array<{
    id: string;
    domain: string;
    priority: number;
    urgency: number;
    resourceCost: number;
  }>
): OrchestrationDecision {
  // Sort by priority * urgency / resourceCost
  const sorted = tasks.sort((a, b) => {
    const aScore = (a.priority * a.urgency) / a.resourceCost;
    const bScore = (b.priority * b.urgency) / b.resourceCost;
    return bScore - aScore;
  });

  return {
    id: `priority-${Date.now()}`,
    type: "priority",
    decision: JSON.stringify(sorted.map(t => t.id)),
    reasoning: `Prioritized ${tasks.length} tasks based on priority, urgency, and resource cost`,
    participants: tasks.map(t => t.domain),
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Resolve conflicts between domains
 */
export function resolveConflict(
  conflict: {
    type: string;
    participants: string[];
    issue: string;
    proposals: Array<{
      domain: string;
      proposal: any;
      priority: number;
    }>;
  }
): OrchestrationDecision {
  // Select proposal with highest priority
  const sorted = conflict.proposals.sort((a, b) => b.priority - a.priority);
  const winner = sorted[0];

  return {
    id: `conflict-${Date.now()}`,
    type: "conflict",
    decision: JSON.stringify(winner.proposal),
    reasoning: `Resolved conflict: ${conflict.issue}. Selected ${winner.domain} proposal (priority: ${winner.priority})`,
    participants: conflict.participants,
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Allocate resources across domains
 */
export function allocateResources(
  model: UnifiedDataModel,
  requests: Array<{
    domain: string;
    resource: string;
    amount: number;
    priority: number;
  }>,
  available: Record<string, number>
): OrchestrationDecision {
  const allocations: Record<string, number> = {};

  // Sort by priority
  const sorted = requests.sort((a, b) => b.priority - a.priority);

  sorted.forEach(request => {
    const availableAmount = available[request.resource] || 0;
    const allocated = Math.min(request.amount, availableAmount);
    
    if (allocated > 0) {
      allocations[request.domain] = allocated;
      available[request.resource] -= allocated;
    }
  });

  return {
    id: `resource-${Date.now()}`,
    type: "resource",
    decision: JSON.stringify(allocations),
    reasoning: `Allocated resources across ${requests.length} domains based on priority`,
    participants: requests.map(r => r.domain),
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Manage load across domains
 */
export function manageLoad(
  model: UnifiedDataModel,
  currentLoad: Record<string, number>,
  targets: Record<string, number>
): OrchestrationDecision {
  const adjustments: Record<string, number> = {};

  Object.keys(currentLoad).forEach(domain => {
    const current = currentLoad[domain];
    const target = targets[domain] || 0.7;
    const adjustment = target - current;
    
    if (Math.abs(adjustment) > 0.1) {
      adjustments[domain] = adjustment;
    }
  });

  return {
    id: `load-${Date.now()}`,
    type: "load",
    decision: JSON.stringify(adjustments),
    reasoning: `Adjusted load across domains to meet targets`,
    participants: Object.keys(adjustments),
    applied: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Schedule tasks across domains
 */
export function scheduleTasks(
  model: UnifiedDataModel,
  tasks: Array<{
    id: string;
    domain: string;
    estimatedDuration: number;
    dependencies: string[];
    priority: number;
  }>
): OrchestrationDecision {
  // Simple scheduling: sort by priority, then by dependencies
  const scheduled: string[] = [];
  const scheduledIds = new Set<string>();

  // First, schedule tasks with no dependencies
  tasks.filter(t => t.dependencies.length === 0)
    .sort((a, b) => b.priority - a.priority)
    .forEach(t => {
      scheduled.push(t.id);
      scheduledIds.add(t.id);
    });

  // Then schedule dependent tasks
  let remaining = tasks.filter(t => !scheduledIds.has(t.id));
  while (remaining.length > 0) {
    const ready = remaining.filter(t => 
      t.dependencies.every(dep => scheduledIds.has(dep))
    ).sort((a, b) => b.priority - a.priority);

    if (ready.length === 0) break; // Circular dependency

    ready.forEach(t => {
      scheduled.push(t.id);
      scheduledIds.add(t.id);
    });

    remaining = remaining.filter(t => !scheduledIds.has(t.id));
  }

  return {
    id: `schedule-${Date.now()}`,
    type: "schedule",
    decision: JSON.stringify(scheduled),
    reasoning: `Scheduled ${scheduled.length} tasks across domains based on priority and dependencies`,
    participants: tasks.map(t => t.domain),
    applied: false,
    timestamp: new Date().toISOString()
  };
}
