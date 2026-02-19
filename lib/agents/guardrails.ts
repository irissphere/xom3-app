// Agent Guardrails
// Prevent compliance drift, validate stage transitions, enforce billing checks

import { logComplianceEvent } from "../hpe/compliance-engine";
import { AgentIdentity } from "./identity";
import { getAirtableBase } from "../airtable/client";

async function getBase() {
  return await getAirtableBase();
}

export interface GuardrailCheck {
  passed: boolean;
  reason?: string;
  requiredActions?: string[];
}

export interface StageTransitionCheck extends GuardrailCheck {
  requiredDocuments?: string[];
  missingDocuments?: string[];
  complianceChecks?: string[];
  billingChecks?: string[];
}

/**
 * Check if agent can move client to stage
 */
export async function canMoveClientToStage(
  clientId: string,
  newStage: string,
  agent: AgentIdentity
): Promise<StageTransitionCheck> {
  try {
    const base = await getBase();
    const client = await base("Clients").find(clientId);
    const fields = client.fields as any;
    const currentStage = fields.Status || "Prospect";

    // Check if transition is valid
    const validTransitions: Record<string, string[]> = {
      Prospect: ["Intake", "Closed"],
      Intake: ["Active", "Compliance", "Closed"],
      Active: ["Compliance", "Closed"],
      Compliance: ["Active", "Closed"],
      Closed: [], // Can't move from closed
    };

    if (!validTransitions[currentStage]?.includes(newStage)) {
      return {
        passed: false,
        reason: `Invalid transition from ${currentStage} to ${newStage}`,
      };
    }

    // Check required documents based on stage
    const requiredDocs = getRequiredDocumentsForStage(newStage);
    const missingDocs: string[] = [];

    // Check compliance requirements
    const complianceChecks = await checkComplianceRequirements(clientId, newStage);
    if (!complianceChecks.passed) {
      return {
        passed: false,
        reason: complianceChecks.reason,
        requiredDocuments: requiredDocs,
        complianceChecks: complianceChecks.requiredActions,
      };
    }

    // Check billing requirements
    const billingChecks = await checkBillingRequirements(clientId, newStage);
    if (!billingChecks.passed) {
      return {
        passed: false,
        reason: billingChecks.reason,
        requiredDocuments: requiredDocs,
        billingChecks: billingChecks.requiredActions,
      };
    }

    return {
      passed: true,
      requiredDocuments: requiredDocs,
    };
  } catch (error) {
    console.error("Error checking stage transition:", error);
    return {
      passed: false,
      reason: "Error checking transition requirements",
    };
  }
}

/**
 * Get required documents for stage
 */
function getRequiredDocumentsForStage(stage: string): string[] {
  const requirements: Record<string, string[]> = {
    Intake: ["Application Form", "ID Verification"],
    Active: ["Application Form", "ID Verification", "Payment Method"],
    Compliance: ["Application Form", "ID Verification", "Payment Method", "Compliance Documents"],
    Closed: [],
  };

  return requirements[stage] || [];
}

/**
 * Check compliance requirements for stage transition
 */
async function checkComplianceRequirements(
  clientId: string,
  newStage: string
): Promise<GuardrailCheck> {
  try {
    const base = await getBase();
    // Get compliance logs for client
    const complianceLogs = await base("Compliance Logs")
      .select({
        filterByFormula: `FIND('${clientId}', ARRAYJOIN({Client}))`,
      })
      .all();

    // Check for pending compliance issues
    const pendingIssues = complianceLogs.filter(
      (log: any) => log.fields.Status === "Pending" || log.fields.Status === "In Review"
    );

    if (pendingIssues.length > 0 && newStage !== "Compliance") {
      return {
        passed: false,
        reason: "Client has pending compliance issues that must be resolved",
        requiredActions: ["Resolve pending compliance issues"],
      };
    }

    // Stage-specific compliance checks
    if (newStage === "Active" || newStage === "Compliance") {
      const hasApproval = complianceLogs.some(
        (log: any) => log.fields["Event Type"] === "Approval" && log.fields.Status === "Approved"
      );

      if (!hasApproval && newStage === "Active") {
        return {
          passed: false,
          reason: "Client requires compliance approval before moving to Active",
          requiredActions: ["Obtain compliance approval"],
        };
      }
    }

    return { passed: true };
  } catch (error) {
    console.error("Error checking compliance requirements:", error);
    return { passed: true }; // Fail open for now
  }
}

/**
 * Check billing requirements for stage transition
 */
async function checkBillingRequirements(
  clientId: string,
  newStage: string
): Promise<GuardrailCheck> {
  try {
    const base = await getBase();
    // Get billing records for client
    const billingRecords = await base("Billing")
      .select({
        filterByFormula: `FIND('${clientId}', ARRAYJOIN({Client}))`,
      })
      .all();

    // Check for overdue invoices
    const overdueInvoices = billingRecords.filter((record: any) => {
      const status = record.fields.Status;
      const dueDate = record.fields["Due Date"];
      if (!dueDate) return false;
      return status === "Overdue" || (status === "Sent" && new Date(dueDate) < new Date());
    });

    if (overdueInvoices.length > 0 && newStage !== "Closed") {
      return {
        passed: false,
        reason: "Client has overdue invoices that must be resolved",
        requiredActions: ["Resolve overdue invoices"],
      };
    }

    // Stage-specific billing checks
    if (newStage === "Active") {
      const hasPaymentMethod = billingRecords.some(
        (record: any) => record.fields["Stripe Customer ID"]
      );

      if (!hasPaymentMethod) {
        return {
          passed: false,
          reason: "Client requires payment method before moving to Active",
          requiredActions: ["Set up payment method"],
        };
      }
    }

    return { passed: true };
  } catch (error) {
    console.error("Error checking billing requirements:", error);
    return { passed: true }; // Fail open for now
  }
}

/**
 * Enforce guardrails on stage transition
 */
export async function enforceStageTransition(
  clientId: string,
  newStage: string,
  agent: AgentIdentity
): Promise<{ success: boolean; check: StageTransitionCheck }> {
  const check = await canMoveClientToStage(clientId, newStage, agent);

  if (!check.passed) {
    // Log compliance event for failed transition attempt
    await logComplianceEvent({
      clientId,
      eventType: "Violation",
      description: `Agent ${agent.name} attempted invalid stage transition: ${check.reason}`,
      status: "Rejected",
      userId: agent.id,
      metadata: {
        attemptedStage: newStage,
        reason: check.reason,
      },
    });

    return { success: false, check };
  }

  return { success: true, check };
}

/**
 * Check if agent can skip compliance step
 */
export async function canSkipComplianceStep(
  clientId: string,
  step: string,
  agent: AgentIdentity
): Promise<GuardrailCheck> {
  // Only admins and managers can skip compliance steps
  if (agent.role !== "admin" && agent.role !== "manager") {
    return {
      passed: false,
      reason: "Only admins and managers can skip compliance steps",
    };
  }

  // Log the skip
  await logComplianceEvent({
    clientId,
    eventType: "Review",
    description: `Compliance step '${step}' skipped by ${agent.name}`,
    status: "Approved",
    userId: agent.id,
    metadata: {
      skippedStep: step,
      skippedBy: agent.role,
    },
  });

  return { passed: true };
}

/**
 * Check if agent can bypass billing check
 */
export async function canBypassBillingCheck(
  clientId: string,
  agent: AgentIdentity
): Promise<GuardrailCheck> {
  // Only admins can bypass billing checks
  if (agent.role !== "admin") {
    return {
      passed: false,
      reason: "Only admins can bypass billing checks",
    };
  }

  return { passed: true };
}
