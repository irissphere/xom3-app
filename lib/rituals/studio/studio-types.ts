export type VisualRitualNodeType = "trigger" | "action" | "wait" | "branch";

export type VisualRitualNodeStatus = "pending" | "running" | "completed" | "failed";

export type VisualRitualNode = {
  nodeId: string;
  stepId: string;
  label: string;
  type: VisualRitualNodeType;
  status?: VisualRitualNodeStatus;
};

export type VisualRitualEdge = {
  fromNodeId: string;
  toNodeId: string;
  conditionLabel?: string;
};

export type VisualRitualGraph = {
  ritualId: string;
  nodes: VisualRitualNode[];
  edges: VisualRitualEdge[];
};
