// Broadcast Engine - Optimization Loop: Funnel Optimization Engine
// Optimizes lead routing, agent assignment, task priority, follow-up timing, pipeline movement

import { RoutingDecision } from "../funnel-modules/routing";
import { AgentROI, FunnelEntryPointROI } from "../revenue-attribution/roi-calculator";
import { PerformanceAnalysis } from "./performance-analyzer";
import { ConversionData } from "../agent-workflow/close";

export interface FunnelOptimization {
  id: string;
  type: "lead_routing" | "agent_assignment" | "task_priority" | "followup_timing" | "pipeline_movement";
  target: string;
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number; // 0-1
  applied: boolean;
  appliedAt?: string;
}

/**
 * Optimize lead routing
 */
export function optimizeLeadRouting(
  currentRouting: RoutingDecision,
  analysis: PerformanceAnalysis
): FunnelOptimization {
  const entryPointROI = analysis.winners.funnelEntryPoints.find(e => e.entryPoint === currentRouting.entryPoint) ||
                        analysis.losers.funnelEntryPoints.find(e => e.entryPoint === currentRouting.entryPoint);
  
  let newEntryPoint = currentRouting.entryPoint;
  let reason = "No change";
  let confidence = 0.5;
  
  // Find best performing entry point
  const bestEntryPoint = analysis.winners.funnelEntryPoints
    .sort((a, b) => b.roi - a.roi)[0];
  
  if (bestEntryPoint && bestEntryPoint.roi > (entryPointROI?.roi || 0) * 1.5) {
    newEntryPoint = bestEntryPoint.entryPoint as any;
    reason = `Best performing entry point (ROI: ${bestEntryPoint.roi.toFixed(0)})`;
    confidence = 0.8;
  }
  
  return {
    id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "lead_routing",
    target: "routing",
    oldValue: currentRouting.entryPoint,
    newValue: newEntryPoint,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Optimize agent assignment
 */
export function optimizeAgentAssignment(
  currentAgentId: string,
  analysis: PerformanceAnalysis
): FunnelOptimization {
  const currentAgentROI = analysis.winners.agents.find(a => a.agentId === currentAgentId) ||
                          analysis.losers.agents.find(a => a.agentId === currentAgentId);
  
  let newAgentId = currentAgentId;
  let reason = "No change";
  let confidence = 0.5;
  
  // Find best performing agent
  const bestAgent = analysis.winners.agents
    .sort((a, b) => b.conversionRate - a.conversionRate)[0];
  
  if (bestAgent && bestAgent.conversionRate > (currentAgentROI?.conversionRate || 0) * 1.2) {
    newAgentId = bestAgent.agentId;
    reason = `Best performing agent (${(bestAgent.conversionRate * 100).toFixed(1)}% conversion)`;
    confidence = 0.9;
  }
  
  return {
    id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "agent_assignment",
    target: "agent",
    oldValue: currentAgentId,
    newValue: newAgentId,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Optimize task priority
 */
export function optimizeTaskPriority(
  currentPriority: "high" | "medium" | "low",
  conversionData: ConversionData,
  analysis: PerformanceAnalysis
): FunnelOptimization {
  let newPriority = currentPriority;
  let reason = "No change";
  let confidence = 0.5;
  
  // If entry point has high conversion rate, increase priority
  const entryPointROI = analysis.winners.funnelEntryPoints.find(e => e.entryPoint === conversionData.entryPoint);
  
  if (entryPointROI && entryPointROI.conversionRate > 0.2) {
    newPriority = "high";
    reason = `High-converting entry point (${(entryPointROI.conversionRate * 100).toFixed(1)}%)`;
    confidence = 0.8;
  } else if (entryPointROI && entryPointROI.conversionRate < 0.05) {
    newPriority = "low";
    reason = `Low-converting entry point (${(entryPointROI.conversionRate * 100).toFixed(1)}%)`;
    confidence = 0.7;
  }
  
  return {
    id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "task_priority",
    target: "task",
    oldValue: currentPriority,
    newValue: newPriority,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Optimize follow-up timing
 */
export function optimizeFollowupTiming(
  currentTiming: number, // Hours
  analysis: PerformanceAnalysis,
  conversions: ConversionData[]
): FunnelOptimization {
  // Calculate optimal follow-up time based on conversion data
  const successfulConversions = conversions.filter(c => 
    c.converted && c.conversionTime
  );
  
  let newTiming = currentTiming;
  let reason = "No change";
  let confidence = 0.5;
  
  if (successfulConversions.length > 0) {
    const avgConversionTime = successfulConversions.reduce((sum, c) => 
      sum + (c.conversionTime || 0), 0
    ) / successfulConversions.length;
    
    // Optimal follow-up is 20% of average conversion time
    newTiming = Math.max(1, Math.min(48, avgConversionTime * 0.2 / 60)); // Convert minutes to hours
    reason = `Optimized based on average conversion time (${(avgConversionTime / 60).toFixed(1)} hours)`;
    confidence = 0.8;
  }
  
  return {
    id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "followup_timing",
    target: "followup",
    oldValue: currentTiming,
    newValue: newTiming,
    reason,
    confidence,
    applied: false
  };
}

/**
 * Optimize pipeline movement
 */
export function optimizePipelineMovement(
  currentStage: string,
  analysis: PerformanceAnalysis
): FunnelOptimization {
  // In production, analyze which pipeline stages convert fastest
  // For now, keep current stage
  return {
    id: `optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: "pipeline_movement",
    target: "pipeline",
    oldValue: currentStage,
    newValue: currentStage,
    reason: "No optimization needed",
    confidence: 0.5,
    applied: false
  };
}

/**
 * Generate all funnel optimizations
 */
export function generateFunnelOptimizations(
  routing: RoutingDecision,
  agentId: string,
  taskPriority: "high" | "medium" | "low",
  followupTiming: number,
  currentStage: string,
  analysis: PerformanceAnalysis,
  conversions: ConversionData[]
): FunnelOptimization[] {
  const optimizations: FunnelOptimization[] = [];
  
  optimizations.push(optimizeLeadRouting(routing, analysis));
  optimizations.push(optimizeAgentAssignment(agentId, analysis));
  optimizations.push(optimizeTaskPriority(taskPriority, conversions[0] || {} as ConversionData, analysis));
  optimizations.push(optimizeFollowupTiming(followupTiming, analysis, conversions));
  optimizations.push(optimizePipelineMovement(currentStage, analysis));
  
  // Filter out no-change optimizations
  return optimizations.filter(o => o.oldValue !== o.newValue);
}
