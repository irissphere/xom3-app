// Benefits CRM Agent Handlers
// Integration with Cockpit Command Layer

import { CommandExecutionResult } from "@/lib/cockpit/command-layer";
import { BenefitsIntakeAgent } from "./benefits-intake-agent";
import { BenefitsFollowupAgent } from "./benefits-followup-agent";
import { BenefitsLeadIntake } from "./types";

/**
 * Handle Benefits Intake Agent execution
 */
export async function handleBenefitsIntakeAgent(
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult> {
  const agent = new BenefitsIntakeAgent();
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    if (action === "process_intake" || action === "trigger") {
      if (!payload) {
        throw new Error("Payload is required for intake processing");
      }

      const intakeData: BenefitsLeadIntake = {
        name: payload.name,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        source: payload.source,
        dateOfBirth: payload.dateOfBirth,
        zipCode: payload.zipCode,
        state: payload.state,
        leadType: payload.leadType,
        employerName: payload.employerName,
        currentCoverage: payload.currentCoverage,
        interestedIn: payload.interestedIn,
        householdSize: payload.householdSize,
        income: payload.income,
        preferredContactMethod: payload.preferredContactMethod,
        smsOptIn: payload.smsOptIn,
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
        target: "benefits-intake",
        action: "process_intake",
        result: result.data,
        decisions: [],
        message: `Successfully processed benefits lead intake. ${result.data?.isNewClient ? "New client created" : "Existing client updated"}.`,
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
      target: "benefits-intake",
      action,
      result: null,
      decisions: [],
      message: `Benefits intake agent execution failed: ${error.message}`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Handle Benefits Follow-up Agent execution
 */
export async function handleBenefitsFollowupAgent(
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult> {
  const agent = new BenefitsFollowupAgent();
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    const validAction = (action === "process_tasks" || action === "create_task" || action === "complete_task") 
      ? action 
      : (action === "trigger" || action === "run") 
        ? "process_tasks" 
        : null;

    if (!validAction) {
      throw new Error(`Unknown action: ${action}`);
    }

    const result = await agent.execute(validAction as any, payload || {});

    if (!result.success) {
      throw new Error(result.errors?.map((e) => e.message).join("; ") || "Execution failed");
    }

    const summary = [];
    if (result.data?.processedCount) {
      summary.push(`${result.data.processedCount} record(s) processed`);
    }
    if (result.data?.smsSentCount) {
      summary.push(`${result.data.smsSentCount} SMS sent`);
    }
    if (result.data?.taskId) {
      summary.push(`Task ${result.data.taskId} handled`);
    }

    return {
      commandId,
      success: true,
      mode: "direct",
      type: "execute",
      target: "benefits-followup",
      action: validAction,
      result: result.data,
      decisions: [],
      message: `Successfully executed benefits follow-up action: ${validAction}. ${summary.join(", ")}.`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      commandId,
      success: false,
      mode: "direct",
      type: "execute",
      target: "benefits-followup",
      action,
      result: null,
      decisions: [],
      message: `Benefits follow-up agent execution failed: ${error.message}`,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Resolve benefits agent handler by agent ID
 */
export async function resolveBenefitsAgentHandler(
  agentId: string,
  action: string,
  payload?: Record<string, any>
): Promise<CommandExecutionResult | null> {
  switch (agentId) {
    case "benefits-intake":
      return handleBenefitsIntakeAgent(action, payload);
    case "benefits-followup":
      return handleBenefitsFollowupAgent(action, payload);
    default:
      return null;
  }
}
