import type { RitualDefinition, RitualRun } from "@/lib/rituals/types";
import type { VisualRitualGraph, VisualRitualNode, VisualRitualNodeStatus } from "./studio-types";

function nodeStatusForRun(run: RitualRun | null | undefined, stepIndex: number): VisualRitualNodeStatus | undefined {
  if (!run) return undefined;
  const sr = run.steps?.find((s) => s.index === stepIndex);
  if (!sr) return undefined;
  if (sr.status === "pending") return "pending";
  if (sr.status === "running") return "running";
  if (sr.status === "completed") return "completed";
  if (sr.status === "failed") return "failed";
  return undefined;
}

export function ritualDefinitionToVisualGraph(def: RitualDefinition, run?: RitualRun | null): VisualRitualGraph {
  const nodes: VisualRitualNode[] = [];
  const edges: Array<{ fromNodeId: string; toNodeId: string; conditionLabel?: string }> = [];

  // Entry trigger node (RAE-1 canon doesn’t expose triggers; COS/RAE can wrap later)
  nodes.push({
    nodeId: "trigger",
    stepId: "trigger",
    label: def.name || def.key,
    type: "trigger",
  });

  // Step nodes in order
  for (let idx = 0; idx < def.steps.length; idx += 1) {
    const step = def.steps[idx];
    const nodeId = `step_${idx}`;
    nodes.push({
      nodeId,
      stepId: String(idx),
      label: `${step.kind}`,
      type: step.kind.startsWith("wait") ? "wait" : "action",
      status: nodeStatusForRun(run || null, idx),
    });
    const from = idx === 0 ? "trigger" : `step_${idx - 1}`;
    edges.push({ fromNodeId: from, toNodeId: nodeId });
  }

  return { ritualId: def.key, nodes, edges };
}
