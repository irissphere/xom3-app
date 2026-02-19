import type { CosSceneInstanceStatus } from "@/lib/cos/cos-types";

export type SceneGraph = {
  id: string;
  name: string;
  description: string;
  nodes: SceneGraphNode[];
  edges: SceneGraphEdge[];
  entryNodes: string[];
  exitNodes: string[];
  triggers: Array<{ eventType: string; source?: string }>;
};

export type SceneGraphNode = {
  nodeId: string;
  sceneId: string;
  conditions?: Record<string, any>;
  parallelGroup?: string;
};

export type SceneGraphEdge = {
  fromNodeId: string;
  toNodeId: string;
  condition?: Record<string, any>;
  eventGate?: string; // wait for event type before allowing transition
};

export type CosGraphInstanceStatus = "running" | "paused" | "completed" | "failed";

export type CosGraphInstance = {
  instanceId: string;
  graphId: string;
  status: CosGraphInstanceStatus;
  startedAt: number;
  completedAt?: number;
  activeNodes: Array<{ nodeId: string; sceneInstanceId: string; status: CosSceneInstanceStatus }>;
  completedNodes: string[];
  context: {
    subject?: { type: string; id: string };
    flags?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  parallelGroups: Record<
    string,
    {
      groupId: string;
      nodeIds: string[];
      completedNodeIds: string[];
      status: "running" | "completed";
    }
  >;
  lastError?: { at: number; message: string };
};
