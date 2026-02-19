// STRIKE 2: Orchestration Graph (The Brainstem)
// Builds the global orchestration graph - the nervous system

import { OrchestrationGraph, GraphNode, GraphEdge } from "./types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Build orchestration graph
 */
export async function buildOrchestrationGraph(tenant: string): Promise<OrchestrationGraph> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const weights: Record<string, number> = {};

  try {
    // Load pipelines
    const historyTable = base("AMP History");
    const pipelineRecords = await historyTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 50,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    // Create pipeline nodes
    const pipelineIds = new Set<string>();
    pipelineRecords.forEach(record => {
      const pipelineId = record.get("PipelineID") as string;
      if (pipelineId && !pipelineIds.has(pipelineId)) {
        pipelineIds.add(pipelineId);
        
        const rowsProcessed = (record.get("RowsProcessed") as number) || 0;
        const rowsFailed = (record.get("RowsFailed") as number) || 0;
        const executionTime = (record.get("ExecutionTime") as number) || 0;
        const successRate = rowsProcessed > 0 ? 1 - (rowsFailed / rowsProcessed) : 0;
        const throughput = executionTime > 0 ? (rowsProcessed / executionTime) * 1000 : 0;

        nodes.push({
          id: pipelineId,
          type: "pipeline",
          data: {
            pipelineId,
            tenant,
            successRate,
            throughput
          },
          position: { x: Math.random() * 1000, y: Math.random() * 1000 },
          metadata: {
            confidence: successRate,
            priority: throughput > 10 ? 1 : 2,
            urgency: rowsFailed > 0 ? 1 : 0,
            lastActivity: record.get("Timestamp") as string || new Date().toISOString()
          }
        });

        weights[pipelineId] = successRate * throughput;
      }
    });

    // Create tenant node
    nodes.push({
      id: `tenant-${tenant}`,
      type: "tenant",
      data: { tenant },
      position: { x: 500, y: 500 },
      metadata: {
        confidence: 1.0,
        priority: 0,
        urgency: 0,
        lastActivity: new Date().toISOString()
      }
    });

    // Create edges from pipelines to tenant
    pipelineIds.forEach(pipelineId => {
      edges.push({
        id: `edge-${pipelineId}-tenant`,
        source: pipelineId,
        target: `tenant-${tenant}`,
        type: "data_flow",
        weight: weights[pipelineId] || 0.5,
        metadata: {
          confidence: 0.8,
          frequency: 1,
          lastUsed: new Date().toISOString()
        }
      });
    });

    // Create workflow nodes (simplified - would load from actual workflows)
    const workflowNodes: GraphNode[] = [
      {
        id: "workflow-intake",
        type: "workflow",
        data: { workflowId: "intake", name: "Intake Workflow" },
        position: { x: 200, y: 200 },
        metadata: {
          confidence: 0.9,
          priority: 1,
          urgency: 0,
          lastActivity: new Date().toISOString()
        }
      }
    ];

    nodes.push(...workflowNodes);

    // Create edges from pipelines to workflows
    pipelineIds.forEach(pipelineId => {
      edges.push({
        id: `edge-${pipelineId}-intake`,
        source: pipelineId,
        target: "workflow-intake",
        type: "signal",
        weight: 0.7,
        condition: "on_success",
        metadata: {
          confidence: 0.7,
          frequency: 0.5,
          lastUsed: new Date().toISOString()
        }
      });
    });

  } catch (error) {
    console.error("[FAO] Failed to build orchestration graph:", error);
  }

  return {
    nodes,
    edges,
    weights,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Update graph weights based on recent activity
 */
export function updateGraphWeights(
  graph: OrchestrationGraph,
  activity: Record<string, { successRate: number; throughput: number }>
): OrchestrationGraph {
  for (const [nodeId, metrics] of Object.entries(activity)) {
    graph.weights[nodeId] = metrics.successRate * metrics.throughput;
    
    // Update node metadata
    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) {
      node.metadata.confidence = metrics.successRate;
      node.metadata.priority = metrics.throughput > 10 ? 1 : 2;
      node.metadata.lastActivity = new Date().toISOString();
    }
  }

  graph.lastUpdated = new Date().toISOString();
  return graph;
}

/**
 * Find optimal path through graph
 */
export function findOptimalPath(
  graph: OrchestrationGraph,
  source: string,
  target: string
): string[] {
  // Simplified pathfinding (would use proper graph algorithm)
  const path: string[] = [source];
  
  // Find direct edge
  const directEdge = graph.edges.find(e => e.source === source && e.target === target);
  if (directEdge) {
    path.push(target);
    return path;
  }

  // Find intermediate nodes
  const intermediateEdges = graph.edges.filter(e => e.source === source);
  if (intermediateEdges.length > 0) {
    const bestEdge = intermediateEdges.sort((a, b) => b.weight - a.weight)[0];
    path.push(bestEdge.target);
    
    const finalEdge = graph.edges.find(e => e.source === bestEdge.target && e.target === target);
    if (finalEdge) {
      path.push(target);
    }
  }

  return path;
}
