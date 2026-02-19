// Health CRM Agent Handlers
// Integration with Cockpit Command Layer

import { CommandExecutionResult } from "@/lib/cockpit/command-layer";
import { HealthIntakeAgent } from "./health-intake-agent";
import { HealthFollowupAgent } from "./health-followup-agent";
import { HealthLeadIntake } from "./types";

/**
 * Handle Health Intake Agent execution
 */
export async function handleHealthIntakeAgent(
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult> {
  const agent = new HealthIntakeAgent();
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Validate payload for intake action
    if (action === "process_intake" || action === "trigger") {
      if (!payload) {
        throw new Error("Payload is required for intake processing");
      }

      const intakeData: HealthLeadIntake = {
        name: payload.name,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        dateOfBirth: payload.dateOfBirth,
        insurance: payload.insurance,
        primaryCareProvider: payload.primaryCareProvider,
        reasonForContact: payload.reasonForContact,
        preferredContactMethod: payload.preferredContactMethod,
        referralSource: payload.referralSource,
        notes: payload.notes,
        submittedAt: payload.submittedAt,
        rawPayload: payload,
      };

      const result = await agent.execute(intakeData);

      if (!result.success) {
        throw new Error(result.errors?.map((e) => e.message).join("; ") || "Execution failed");
      }

      return {
        commandId,
        success: true,
        mode: "direct",
        type: "execute",
        target: "health-intake",
        action: "process_intake",
        result: result.data,
        decisions: [],
        message: `Successfully processed health lead intake. ${result.data?.isNewClient ? "New client created" : "Existing client updated"}.`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    return {
      commandId,
      success: false,
      mode: "direct",
      type: "execute",
      target: "health-intake",
      action,
      result: null,
      decisions: [],
      message: `Health intake agent execution failed: ${error.message}`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Handle Health Follow-up Agent execution
 */
export async function handleHealthFollowupAgent(
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult> {
  const agent = new HealthFollowupAgent();
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Determine action
    const generateTasks = action === "generate_tasks" || action === "trigger" || action === "run";
    const updateStates = action === "update_states" || action === "trigger" || action === "run";

    const options = {
      generateTasks: payload?.generateTasks !== false && generateTasks,
      updateStates: payload?.updateStates !== false && updateStates,
      clientId: payload?.clientId,
    };

    const result = await agent.execute(options);

    if (!result.success) {
      throw new Error(result.errors?.map((e) => e.message).join("; ") || "Execution failed");
    }

    const summary = [];
    if (result.data?.tasksGenerated) {
      summary.push(`${result.data.tasksGenerated} task(s) generated`);
    }
    if (result.data?.tasksUpdated) {
      summary.push(`${result.data.tasksUpdated} task(s) updated`);
    }
    if (result.data?.tasksCompleted?.length) {
      summary.push(`${result.data.tasksCompleted.length} task(s) completed`);
    }

    return {
      commandId,
      success: true,
      mode: "direct",
      type: "execute",
      target: "health-followup",
      action: "process_followups",
      result: result.data,
      decisions: [],
      message: `Successfully processed follow-ups. ${summary.join(", ")}.`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      commandId,
      success: false,
      mode: "direct",
      type: "execute",
      target: "health-followup",
      action,
      result: null,
      decisions: [],
      message: `Health follow-up agent execution failed: ${error.message}`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Resolve agent handler by agent ID
 */
export async function resolveHealthAgentHandler(
  agentId: string,
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult | null> {
  switch (agentId) {
    case "health-intake":
      return handleHealthIntakeAgent(action, payload);
    case "health-followup":
      return handleHealthFollowupAgent(action, payload);
    default:
      return null;
  }
}
