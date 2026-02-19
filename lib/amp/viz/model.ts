// AMP Visualization Model
// Defines the graph structure for pipeline visualization

export type AmpVizNodeStatus = "idle" | "running" | "success" | "error";

export type AmpVizNode = {
  id: string;
  label: string;
  status: AmpVizNodeStatus;
  metadata?: {
    rowsProcessed?: number;
    rowsImported?: number;
    rowsFailed?: number;
    errorMessage?: string;
    executionTime?: number;
  };
};

export type AmpVizEdge = {
  from: string;
  to: string;
};

export type AmpVizGraph = {
  nodes: AmpVizNode[];
  edges: AmpVizEdge[];
  pipelineId: string;
  pipelineName?: string;
  executionId?: string;
  lastUpdated?: string;
};
