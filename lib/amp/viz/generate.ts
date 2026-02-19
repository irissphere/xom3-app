// AMP Visualization Graph Generator
// Generates a graph structure for any pipeline

import { AmpVizGraph, AmpVizNode, AmpVizEdge } from "./model";

export function generatePipelineGraph(pipelineId: string, pipelineName?: string): AmpVizGraph {
  const nodes: AmpVizNode[] = [
    { id: "source", label: "Source", status: "idle" },
    { id: "transform", label: "Transform", status: "idle" },
    { id: "validate", label: "Validate", status: "idle" },
    { id: "insert", label: "Insert", status: "idle" },
    { id: "workflows", label: "Workflows", status: "idle" },
    { id: "notifications", label: "Notifications", status: "idle" },
    { id: "audit", label: "Audit", status: "idle" }
  ];

  const edges: AmpVizEdge[] = [
    { from: "source", to: "transform" },
    { from: "transform", to: "validate" },
    { from: "validate", to: "insert" },
    { from: "insert", to: "workflows" },
    { from: "workflows", to: "notifications" },
    { from: "notifications", to: "audit" }
  ];

  return {
    nodes,
    edges,
    pipelineId,
    pipelineName,
    lastUpdated: new Date().toISOString()
  };
}
