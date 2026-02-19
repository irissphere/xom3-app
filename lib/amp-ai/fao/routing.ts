// STRIKE 4: Autonomous Routing
// Reroutes data through optimal paths

import { AutonomousRoute } from "./types";
import type { OrchestrationGraph } from "./types";
import { findOptimalPath } from "./graph";

/**
 * Determine optimal route for data
 */
export function determineRoute(
  graph: OrchestrationGraph,
  source: string,
  target: string,
  context: {
    dataSize?: number;
    urgency?: number;
    errorRate?: number;
  }
): AutonomousRoute {
  const factors: Array<{ factor: string; impact: "positive" | "negative"; description: string }> = [];
  
  // Find optimal path
  const path = findOptimalPath(graph, source, target);
  
  // Calculate estimated time (simplified)
  const baseTime = 1000; // 1 second base
  const dataSize = context.dataSize || 100;
  const estimatedTime = baseTime + (dataSize * 10); // 10ms per row

  let reason = `Optimal path found: ${path.join(" → ")}`;
  let confidence = 0.8;

  // Adjust based on urgency
  if (context.urgency && context.urgency > 0.8) {
    // Prefer shorter paths for high urgency
    if (path.length > 3) {
      factors.push({
        factor: "High Urgency",
        impact: "negative",
        description: "Path is too long for urgent data"
      });
      confidence = 0.6;
    } else {
      factors.push({
        factor: "High Urgency",
        impact: "positive",
        description: "Short path selected for urgent data"
      });
      confidence = 0.9;
    }
  }

  // Adjust based on error rate
  if (context.errorRate && context.errorRate > 0.2) {
    // Prefer paths with cleaning/validation stages
    const hasCleaning = path.some(p => p.includes("clean") || p.includes("validate"));
    if (!hasCleaning) {
      factors.push({
        factor: "High Error Rate",
        impact: "negative",
        description: "Path lacks cleaning/validation stages"
      });
      confidence = 0.6;
    } else {
      factors.push({
        factor: "High Error Rate",
        impact: "positive",
        description: "Path includes cleaning/validation stages"
      });
      confidence = 0.85;
    }
  }

  return {
    source,
    target,
    path,
    reason,
    confidence,
    estimatedTime,
    factors
  };
}
