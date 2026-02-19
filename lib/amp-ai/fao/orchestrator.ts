// FAO Orchestrator
// Coordinates all autonomous orchestration strikes

import type {
  PipelineAgent,
  OrchestrationGraph,
  AutonomousSchedule,
  AutonomousRoute,
  WorkflowChain,
  AutonomousErrorHandling,
  ProfileManagement,
  DriftResponse,
  OrchestrationExplanation,
} from "./types";
import { createPipelineAgent, updateAgentMemory, makeAgentDecision } from "./agents";
import { buildOrchestrationGraph } from "./graph";
import { determineSchedule } from "./scheduler";
import { determineRoute } from "./routing";
import { createWorkflowChain } from "./workflow-chaining";
import { handleErrorAutonomously } from "./error-handling";
import { manageProfileAutonomously } from "./profile-management";
import { respondToDrift } from "./drift-response";
import { explainDecision, generateOrchestrationSummary } from "./explainer";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Run complete FAO orchestration cycle
 */
export async function runFAO(
  pipeline: MigrationPipeline,
  execution?: {
    status: string;
    rowsProcessed: number;
    rowsFailed: number;
    executionTime: number;
    errors?: Array<{ error: string }>;
  },
  context?: {
    load?: number;
    drift?: boolean;
    errors?: number;
    predictions?: any;
  }
): Promise<{
  agent: PipelineAgent;
  graph: OrchestrationGraph;
  schedule?: AutonomousSchedule;
  route?: AutonomousRoute;
  workflowChain?: WorkflowChain;
  errorHandling?: AutonomousErrorHandling[];
  profileManagement?: ProfileManagement[];
  driftResponse?: DriftResponse;
  explanations: OrchestrationExplanation[];
  summary: string;
}> {
  const explanations: OrchestrationExplanation[] = [];

  // Create/update agent
  let agent = createPipelineAgent(pipeline);
  
  if (execution) {
    agent = await updateAgentMemory(agent, execution);
  }

  // Make agent decision
  const decision = makeAgentDecision(agent, context || {});
  agent.lastDecision = decision.decision;
  agent.lastDecisionAt = new Date().toISOString();
  
  explanations.push(explainDecision(
    decision.decision,
    decision.reason,
    ["Agent decision"],
    decision.confidence
  ));

  // Build orchestration graph
  const graph = await buildOrchestrationGraph(pipeline.tenant);

  // Determine schedule
  let schedule: AutonomousSchedule | undefined;
  if (context) {
    schedule = await determineSchedule(agent, context);
    explanations.push(explainDecision(
      `Schedule: ${schedule.schedule}`,
      schedule.reason,
      schedule.factors.map(f => f.description),
      schedule.confidence
    ));
  }

  // Determine route (if needed)
  let route: AutonomousRoute | undefined;
  if (pipeline.source && pipeline.targetTable) {
    route = determineRoute(
      graph,
      pipeline.source.type,
      pipeline.targetTable,
      {
        dataSize: execution?.rowsProcessed,
        errorRate: execution?.rowsFailed && execution?.rowsProcessed 
          ? execution.rowsFailed / execution.rowsProcessed 
          : 0
      }
    );
    explanations.push(explainDecision(
      `Route: ${route.path.join(" → ")}`,
      route.reason,
      route.factors.map(f => f.description),
      route.confidence
    ));
  }

  // Create workflow chain (if patterns detected)
  let workflowChain: WorkflowChain | undefined;
  if (context?.predictions) {
    workflowChain = await createWorkflowChain(
      pipeline.id,
      pipeline.tenant,
      {
        compliancePattern: true,
        dataPattern: "new_client"
      }
    );
    if (workflowChain) {
      explanations.push(explainDecision(
        `Workflow Chain: ${workflowChain.workflows.join(", ")}`,
        "Workflow chain created based on data patterns",
        ["Compliance pattern", "New client pattern"],
        0.8
      ));
    }
  }

  // Handle errors autonomously
  const errorHandling: AutonomousErrorHandling[] = [];
  if (execution?.errors) {
    for (const error of execution.errors) {
      const handling = await handleErrorAutonomously(
        `error-${Date.now()}`,
        "unknown",
        error.error,
        {}
      );
      errorHandling.push(handling);
      
      if (handling.resolved) {
        explanations.push(explainDecision(
          `Error Resolved: ${handling.errorType}`,
          `Error handled autonomously: ${handling.actions.map(a => a.action).join(", ")}`,
          [handling.classification],
          0.85,
          "Error resolved"
        ));
      }
    }
  }

  // Manage profiles (if drift detected)
  const profileManagement: ProfileManagement[] = [];
  if (context?.drift) {
    const management = await manageProfileAutonomously(
      pipeline.mapping.profileKey,
      pipeline.tenant,
      "evolve",
      { errorRate: context.errors }
    );
    profileManagement.push(management);
    
    if (management.applied) {
      explanations.push(explainDecision(
        `Profile ${management.action}: ${management.profileKey}`,
        management.reason,
        ["Drift detected"],
        management.confidence
      ));
    }
  }

  // Respond to drift
  let driftResponse: DriftResponse | undefined;
  if (context?.drift) {
    driftResponse = await respondToDrift(pipeline, "schema_drift", new Date().toISOString());
    
    if (driftResponse.resolved) {
      explanations.push(explainDecision(
        "Drift Response",
        `Responded to ${driftResponse.driftType} drift`,
        driftResponse.responses.map(r => r.type),
        0.8,
        "Drift resolved"
      ));
    }
  }

  // Generate summary
  const summary = generateOrchestrationSummary(explanations);

  return {
    agent,
    graph,
    schedule,
    route,
    workflowChain,
    errorHandling,
    profileManagement,
    driftResponse,
    explanations,
    summary
  };
}
