import { subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import { startScene } from "@/lib/cos";
import { cosSceneStarted as cosSceneStartedSignal } from "@/lib/cos/cos-signals";
import { cosSceneGraphs, getSceneGraph } from "./cos-graph-builder";
import type { CosGraphInstance, SceneGraph, SceneGraphEdge, SceneGraphNode } from "./cos-graph-types";
import { createGraphInstance, getGraphInstance, listGraphInstances, updateGraphInstance } from "./cos-graph-state";
import {
  cosGraphCompleted,
  cosGraphFailed,
  cosGraphNodeCompleted,
  cosGraphNodeStarted,
  cosGraphParallelGroupCompleted,
  cosGraphStarted,
} from "./cos-graph-signals";

type GlobalGuard = {
  __xom3_cos_graph_bound__?: boolean;
  __xom3_cos_graph_unsub__?: (() => void) | null;
  __xom3_cos_graph_scene_to_node__?: Record<string, { graphInstanceId: string; nodeId: string }>;
};

function g(): GlobalGuard {
  const gg = globalThis as any;
  gg.__xom3_cos_graph_scene_to_node__ = gg.__xom3_cos_graph_scene_to_node__ || {};
  return gg as any;
}

function conditionsOk(conditions: any, ctx: CosGraphInstance["context"]) {
  if (!conditions) return true;
  // Minimal predicate: { flag: "key" } or { flagEquals: { key: value } }
  if (typeof conditions.flag === "string") {
    return Boolean(ctx.flags?.[conditions.flag]);
  }
  if (conditions.flagEquals && typeof conditions.flagEquals === "object") {
    return Object.entries(conditions.flagEquals).every(([k, v]) => ctx.flags?.[k] === v);
  }
  return true;
}

function nodeById(graph: SceneGraph, nodeId: string) {
  return graph.nodes.find((n) => n.nodeId === nodeId) || null;
}

function groupNodes(graph: SceneGraph, groupId: string) {
  return graph.nodes.filter((n) => n.parallelGroup === groupId);
}

async function startNode(graph: SceneGraph, inst: CosGraphInstance, node: SceneGraphNode, sourceEvent?: SovereignEvent) {
  // Node conditions
  if (!conditionsOk(node.conditions, inst.context)) return null;

  // Already active or completed?
  if (inst.completedNodes.includes(node.nodeId)) return null;
  if (inst.activeNodes.some((n) => n.nodeId === node.nodeId)) return null;

  const sceneInst = await startScene(node.sceneId, {
    sourceEvent: {
      type: "cos.graph.node",
      payload: {
        graphId: graph.id,
        graphInstanceId: inst.instanceId,
        nodeId: node.nodeId,
        sceneId: node.sceneId,
        eventId: sourceEvent?.id,
      },
    },
  });

  const gg = g();
  gg.__xom3_cos_graph_scene_to_node__![sceneInst.instanceId] = { graphInstanceId: inst.instanceId, nodeId: node.nodeId };

  const nextActive = inst.activeNodes.concat([{ nodeId: node.nodeId, sceneInstanceId: sceneInst.instanceId, status: sceneInst.status }]);
  const nextParallelGroups = { ...inst.parallelGroups };
  if (node.parallelGroup) {
    const group = nextParallelGroups[node.parallelGroup] || {
      groupId: node.parallelGroup,
      nodeIds: groupNodes(graph, node.parallelGroup).map((n) => n.nodeId),
      completedNodeIds: [],
      status: "running" as const,
    };
    nextParallelGroups[node.parallelGroup] = group;
  }

  updateGraphInstance(inst.instanceId, { activeNodes: nextActive, parallelGroups: nextParallelGroups });
  cosGraphNodeStarted(inst.instanceId, node.nodeId);
  return sceneInst.instanceId;
}

async function startParallelGroup(graph: SceneGraph, inst: CosGraphInstance, groupId: string, fromNodeId: string, sourceEvent?: SovereignEvent) {
  const candidates = groupNodes(graph, groupId).filter((n) => {
    // group start is driven by edges from the same fromNodeId
    const edgeExists = graph.edges.some((e) => e.fromNodeId === fromNodeId && e.toNodeId === n.nodeId);
    return edgeExists;
  });
  for (const node of candidates) {
    await startNode(graph, getGraphInstance(inst.instanceId) || inst, node, sourceEvent);
  }
}

function edgeGateMatches(edge: SceneGraphEdge, event: SovereignEvent) {
  if (!edge.eventGate) return false;
  // Special gate: parallel group completion broadcast
  if (edge.eventGate === "cos.graph.parallelGroup.completed") {
    return event.type === "cos.graph.parallelGroup.completed";
  }
  return event.type === edge.eventGate;
}

async function evaluateEdgesOnEvent(inst: CosGraphInstance, graph: SceneGraph, event: SovereignEvent) {
  // Allow edges with eventGate to start nodes while fromNode is active or completed.
  const eligible = graph.edges.filter((e) => e.eventGate && edgeGateMatches(e, event));

  for (const edge of eligible) {
    const fromIsActiveOrDone =
      inst.activeNodes.some((n) => n.nodeId === edge.fromNodeId) || inst.completedNodes.includes(edge.fromNodeId);
    if (!fromIsActiveOrDone) continue;

    if (!conditionsOk(edge.condition, inst.context)) continue;
    const to = nodeById(graph, edge.toNodeId);
    if (!to) continue;

    if (to.parallelGroup) {
      await startParallelGroup(graph, inst, to.parallelGroup, edge.fromNodeId, event);
    } else {
      await startNode(graph, inst, to, event);
    }
  }
}

function maybeCompleteParallelGroups(inst: CosGraphInstance, graph: SceneGraph, patch: Partial<CosGraphInstance>) {
  const next = patch.parallelGroups || inst.parallelGroups;
  for (const [groupId, group] of Object.entries(next)) {
    if (group.status === "completed") continue;
    const allDone = group.nodeIds.every((nid) => group.completedNodeIds.includes(nid) || inst.completedNodes.includes(nid));
    if (!allDone) continue;
    next[groupId] = { ...group, status: "completed" };
    patch.parallelGroups = next;
    patch.context = {
      ...inst.context,
      flags: { ...(inst.context.flags || {}), [`parallel:${groupId}:completed`]: true },
    };
    cosGraphParallelGroupCompleted(inst.instanceId, groupId);
  }
}

function maybeCompleteGraph(inst: CosGraphInstance, graph: SceneGraph, patch: Partial<CosGraphInstance>) {
  const completed = new Set((patch.completedNodes || inst.completedNodes) as string[]);
  const allExit = graph.exitNodes.every((n) => completed.has(n));
  if (!allExit) return;
  patch.status = "completed";
  patch.completedAt = Date.now();
}

async function onSceneCompletion(event: SovereignEvent) {
  if (event.type !== "cos.scene.completed" && event.type !== "cos.scene.failed") return;
  const sceneInstanceId = String(event.payload?.instanceId || "");
  if (!sceneInstanceId) return;

  const map = g().__xom3_cos_graph_scene_to_node__ || {};
  const ref = map[sceneInstanceId];
  if (!ref) return;

  const inst = getGraphInstance(ref.graphInstanceId);
  if (!inst) return;
  const graph = getSceneGraph(inst.graphId);
  if (!graph) return;

  const nodeId = ref.nodeId;
  const nextActive = inst.activeNodes.filter((n) => n.sceneInstanceId !== sceneInstanceId);
  const nextCompleted = inst.completedNodes.includes(nodeId) ? inst.completedNodes : inst.completedNodes.concat([nodeId]);

  const patch: Partial<CosGraphInstance> = { activeNodes: nextActive, completedNodes: nextCompleted };
  cosGraphNodeCompleted(inst.instanceId, nodeId);

  // Update parallel group completion tracking
  const node = nodeById(graph, nodeId);
  if (node?.parallelGroup) {
    const pg = { ...(inst.parallelGroups || {}) };
    const group = pg[node.parallelGroup] || {
      groupId: node.parallelGroup,
      nodeIds: groupNodes(graph, node.parallelGroup).map((n) => n.nodeId),
      completedNodeIds: [],
      status: "running" as const,
    };
    if (!group.completedNodeIds.includes(nodeId)) group.completedNodeIds = group.completedNodeIds.concat([nodeId]);
    pg[node.parallelGroup] = group;
    patch.parallelGroups = pg as any;
  }

  // Check group + graph completion
  maybeCompleteParallelGroups(inst, graph, patch);
  maybeCompleteGraph(inst, graph, patch);

  // If scene failed, mark graph failed (strict)
  if (event.type === "cos.scene.failed") {
    patch.status = "failed";
    patch.lastError = { at: Date.now(), message: String(event.payload?.error || "scene_failed") };
  }

  const updated = updateGraphInstance(inst.instanceId, patch);
  if (!updated) return;

  if (updated.status === "completed") {
    cosGraphCompleted(updated.graphId, updated.instanceId);
    return;
  }
  if (updated.status === "failed") {
    cosGraphFailed(updated.graphId, updated.instanceId, updated.lastError?.message || "failed");
    return;
  }

  // After node completion, start any outgoing edges without event gates.
  const outgoing = graph.edges.filter((e) => e.fromNodeId === nodeId && !e.eventGate);
  for (const edge of outgoing) {
    if (!conditionsOk(edge.condition, updated.context)) continue;
    const to = nodeById(graph, edge.toNodeId);
    if (!to) continue;
    if (to.parallelGroup) {
      await startParallelGroup(graph, updated, to.parallelGroup, nodeId);
    } else {
      await startNode(graph, updated, to);
    }
  }
}

export async function startGraph(graphId: string, input?: { subject?: { type: string; id: string }; flags?: Record<string, any> }) {
  const graph = getSceneGraph(graphId);
  if (!graph) throw new Error("graph_not_found");
  const now = Date.now();
  const inst = createGraphInstance({
    graphId,
    status: "running",
    startedAt: now,
    activeNodes: [],
    completedNodes: [],
    context: { subject: input?.subject, flags: input?.flags || {}, metadata: {} },
    parallelGroups: {},
  });
  cosGraphStarted(graphId, inst.instanceId);

  // Start entry nodes (and their parallel groups)
  for (const nodeId of graph.entryNodes) {
    const node = nodeById(graph, nodeId);
    if (!node) continue;
    if (node.parallelGroup) {
      await startParallelGroup(graph, inst, node.parallelGroup, nodeId);
    } else {
      await startNode(graph, getGraphInstance(inst.instanceId) || inst, node);
    }
  }

  return getGraphInstance(inst.instanceId)!;
}

export function ensureCosGraphBound() {
  const gg = g();
  if (gg.__xom3_cos_graph_bound__) return;
  gg.__xom3_cos_graph_bound__ = true;

  gg.__xom3_cos_graph_unsub__ = subscribe((event) => {
    try {
      // Start graphs on triggers
      for (const graph of cosSceneGraphs) {
        if (!graph.triggers?.some((t) => t.eventType === event.type)) continue;
        void startGraph(graph.id, { subject: event.payload?.subject, flags: { triggerEvent: event.type } }).catch(() => {});
      }

      // Event-gated edges (including parallel group completion)
      for (const inst of listGraphInstances(120)) {
        if (inst.status !== "running") continue;
        const graph = getSceneGraph(inst.graphId);
        if (!graph) continue;
        void evaluateEdgesOnEvent(inst, graph, event).catch(() => {});
      }

      // Scene completion -> node completion
      void onSceneCompletion(event).catch(() => {});
    } catch {
      // passive lane
    }
  });
}

export function getCosGraphStatus() {
  const gg = g();
  return { bound: Boolean(gg.__xom3_cos_graph_bound__), graphs: cosSceneGraphs.length };
}
