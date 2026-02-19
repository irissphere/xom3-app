import { publish } from "@/lib/sovereigns/event-bus";

export function cosGraphStarted(graphId: string, instanceId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.started",
    severity: "info",
    payload: { graphId, instanceId, at: Date.now() },
    tags: ["cos", "graph"],
  });
}

export function cosGraphNodeStarted(instanceId: string, nodeId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.node.started",
    severity: "info",
    payload: { instanceId, nodeId, at: Date.now() },
    tags: ["cos", "graph"],
  });
}

export function cosGraphNodeCompleted(instanceId: string, nodeId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.node.completed",
    severity: "info",
    payload: { instanceId, nodeId, at: Date.now() },
    tags: ["cos", "graph"],
  });
}

export function cosGraphParallelGroupCompleted(instanceId: string, groupId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.parallelGroup.completed",
    severity: "info",
    payload: { instanceId, groupId, at: Date.now() },
    tags: ["cos", "graph"],
  });
}

export function cosGraphCompleted(graphId: string, instanceId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.completed",
    severity: "info",
    payload: { graphId, instanceId, at: Date.now() },
    tags: ["cos", "graph"],
  });
}

export function cosGraphFailed(graphId: string, instanceId: string, error: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.graph.failed",
    severity: "error",
    payload: { graphId, instanceId, error, at: Date.now() },
    tags: ["cos", "graph"],
  });
}
