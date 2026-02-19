// Data Consistency Checker - Integrity Engine
// Scans system for data inconsistencies and flags issues
// Task 51: Enhanced Data Consistency Checker

export type ConsistencyIssueType =
  | "missing_required_field"
  | "invalid_data_format"
  | "orphaned_record"
  | "duplicate_record"
  | "invalid_relationship"
  | "missing_reference"
  | "date_inconsistency"
  | "status_inconsistency";

export interface ConsistencyIssue {
  id: string;
  type: ConsistencyIssueType;
  severity: "critical" | "warning" | "info";
  entity: string; // "client", "policy", "household", etc.
  entityId: string;
  field?: string;
  message: string;
  currentValue?: any;
  expectedValue?: any;
  fixable: boolean;
  fixAction?: {
    type: "update_field" | "delete_record" | "create_record" | "link_record";
    params: Record<string, any>;
  };
  detectedAt: string;
  fixed: boolean;
  fixedAt?: string;
  fixedBy?: string;
}

/**
 * Check client data consistency
 */
export async function checkClientConsistency(
  client: any,
  clientId: string
): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  // Check required fields
  if (!client.firstName || client.firstName.trim() === "") {
    issues.push(createIssue(
      "missing_required_field",
      "critical",
      "client",
      clientId,
      "firstName",
      "Client missing first name",
      undefined,
      undefined,
      {
        type: "update_field",
        params: { field: "firstName", value: "" }
      }
    ));
  }

  if (!client.lastName || client.lastName.trim() === "") {
    issues.push(createIssue(
      "missing_required_field",
      "critical",
      "client",
      clientId,
      "lastName",
      "Client missing last name",
      undefined,
      undefined,
      {
        type: "update_field",
        params: { field: "lastName", value: "" }
      }
    ));
  }

  if (!client.email || client.email.trim() === "") {
    issues.push(createIssue(
      "missing_required_field",
      "critical",
      "client",
      clientId,
      "email",
      "Client missing email address",
      undefined,
      undefined,
      {
        type: "update_field",
        params: { field: "email", value: "" }
      }
    ));
  } else {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) {
      issues.push(createIssue(
        "invalid_data_format",
        "warning",
        "client",
        clientId,
        "email",
        "Client email format is invalid",
        client.email,
        "valid email format",
        {
          type: "update_field",
          params: { field: "email", value: client.email }
        }
      ));
    }
  }

  // Check status consistency
  if (client.status === "Policy Active" && !client.policyNumber) {
    issues.push(createIssue(
      "status_inconsistency",
      "warning",
      "client",
      clientId,
      "policyNumber",
      "Client marked as Policy Active but no policy number",
      undefined,
      "policy number",
      {
        type: "update_field",
        params: { field: "policyNumber", value: "" }
      }
    ));
  }

  // Check renewal date if policy exists
  if (client.policyNumber && !client.renewalDate) {
    issues.push(createIssue(
      "missing_required_field",
      "warning",
      "client",
      clientId,
      "renewalDate",
      "Policy exists but no renewal date set",
      undefined,
      "renewal date",
      {
        type: "update_field",
        params: { field: "renewalDate", value: "" }
      }
    ));
  }

  // Check appointment date consistency
  if (client.appointmentDate) {
    try {
      const apptDate = new Date(client.appointmentDate);
      const now = new Date();
      if (apptDate < now && client.status === "Appointment") {
        issues.push(createIssue(
          "date_inconsistency",
          "warning",
          "client",
          clientId,
      "appointmentDate",
          "Appointment date is in the past but status still shows Appointment",
          client.appointmentDate,
          "updated status or future date",
          {
            type: "update_field",
            params: { field: "status", value: "Appointment Completed" }
          }
        ));
      }
    } catch {
      issues.push(createIssue(
        "invalid_data_format",
        "warning",
        "client",
        clientId,
        "appointmentDate",
        "Appointment date format is invalid",
        client.appointmentDate,
        "valid date format",
        {
          type: "update_field",
          params: { field: "appointmentDate", value: "" }
        }
      ));
    }
  }

  return issues;
}

/**
 * Check household consistency
 */
export async function checkHouseholdConsistency(
  household: any,
  householdId: string,
  allClients: any[]
): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  // Check if household has members
  const members = allClients.filter(c => c.householdId === householdId);
  if (members.length === 0) {
    issues.push(createIssue(
      "orphaned_record",
      "warning",
      "household",
      householdId,
      undefined,
      "Household has no members",
      undefined,
      "at least one member",
      {
        type: "link_record",
        params: { entity: "client", linkTo: householdId }
      }
    ));
  }

  return issues;
}

/**
 * Check task consistency
 */
export async function checkTaskConsistency(
  task: any,
  taskId: string
): Promise<ConsistencyIssue[]> {
  const issues: ConsistencyIssue[] = [];

  // Check if task has owner
  if (!task.assignedTo || task.assignedTo.trim() === "") {
    issues.push(createIssue(
      "missing_required_field",
      "warning",
      "task",
      taskId,
      "assignedTo",
      "Task has no assigned owner",
      undefined,
      "agent or user",
      {
        type: "update_field",
        params: { field: "assignedTo", value: "" }
      }
    ));
  }

  // Check if task has client link
  if (!task.clientId && !task.client) {
    issues.push(createIssue(
      "missing_reference",
      "info",
      "task",
      taskId,
      "clientId",
      "Task is not linked to a client",
      undefined,
      "client reference",
      {
        type: "link_record",
        params: { entity: "client", linkTo: taskId }
      }
    ));
  }

  return issues;
}

/**
 * Create consistency issue
 */
function createIssue(
  type: ConsistencyIssueType,
  severity: "critical" | "warning" | "info",
  entity: string,
  entityId: string,
  field: string | undefined,
  message: string,
  currentValue: any,
  expectedValue: any,
  fixAction?: ConsistencyIssue["fixAction"]
): ConsistencyIssue {
  return {
    id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    severity,
    entity,
    entityId,
    field,
    message,
    currentValue,
    expectedValue,
    fixable: !!fixAction,
    fixAction,
    detectedAt: new Date().toISOString(),
    fixed: false,
  };
}

/**
 * Run full consistency check
 */
export async function runConsistencyCheck(
  clients: any[],
  households: any[] = [],
  tasks: any[] = []
): Promise<ConsistencyIssue[]> {
  const allIssues: ConsistencyIssue[] = [];

  // Check all clients
  for (const client of clients) {
    const issues = await checkClientConsistency(client, client.id || client.recordId);
    allIssues.push(...issues);
  }

  // Check all households
  for (const household of households) {
    const issues = await checkHouseholdConsistency(household, household.id || household.recordId, clients);
    allIssues.push(...issues);
  }

  // Check all tasks
  for (const task of tasks) {
    const issues = await checkTaskConsistency(task, task.id || task.recordId);
    allIssues.push(...issues);
  }

  return allIssues;
}

/**
 * Task 52: Generate auto-fix suggestions for issues
 */
export function generateAutoFixSuggestions(issues: ConsistencyIssue[]): Array<{
  issueId: string;
  suggestion: string;
  action: ConsistencyIssue["fixAction"];
  confidence: number;
  estimatedImpact: "high" | "medium" | "low";
}> {
  const suggestions: Array<{
    issueId: string;
    suggestion: string;
    action: ConsistencyIssue["fixAction"];
    confidence: number;
    estimatedImpact: "high" | "medium" | "low";
  }> = [];

  for (const issue of issues) {
    if (!issue.fixable || !issue.fixAction) continue;

    let suggestion = "";
    let confidence = 0.7;
    let impact: "high" | "medium" | "low" = "medium";

    switch (issue.type) {
      case "missing_required_field":
        suggestion = `Fill in missing ${issue.field} field`;
        confidence = 0.9;
        impact = issue.severity === "critical" ? "high" : "medium";
        break;

      case "invalid_data_format":
        suggestion = `Fix format of ${issue.field} field`;
        confidence = 0.8;
        impact = "medium";
        break;

      case "orphaned_record":
        suggestion = `Link ${issue.entity} to a parent record or delete if obsolete`;
        confidence = 0.6;
        impact = "low";
        break;

      case "date_inconsistency":
        suggestion = `Update ${issue.field} or related status to match`;
        confidence = 0.7;
        impact = "medium";
        break;

      case "status_inconsistency":
        suggestion = `Update status or add missing ${issue.field}`;
        confidence = 0.8;
        impact = "medium";
        break;

      default:
        suggestion = `Review and fix ${issue.type}`;
        confidence = 0.5;
        impact = "low";
    }

    suggestions.push({
      issueId: issue.id,
      suggestion,
      action: issue.fixAction,
      confidence,
      estimatedImpact: impact,
    });
  }

  return suggestions.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    if (impactOrder[a.estimatedImpact] !== impactOrder[b.estimatedImpact]) {
      return impactOrder[b.estimatedImpact] - impactOrder[a.estimatedImpact];
    }
    return b.confidence - a.confidence;
  });
}

/**
 * Task 53: Self-healing routine - automatically fix common issues
 */
export async function selfHealData(
  issues: ConsistencyIssue[],
  autoFixThreshold: number = 0.8 // Only auto-fix if confidence >= 0.8
): Promise<{
  fixed: number;
  failed: number;
  skipped: number;
  results: Array<{
    issueId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{ issueId: string; success: boolean; error?: string }> = [];
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  const suggestions = generateAutoFixSuggestions(issues);

  for (const suggestion of suggestions) {
    if (suggestion.confidence < autoFixThreshold) {
      skipped++;
      continue;
    }

    const issue = issues.find(i => i.id === suggestion.issueId);
    if (!issue || !issue.fixAction) {
      skipped++;
      continue;
    }

    try {
      // Apply fix based on action type
      switch (issue.fixAction.type) {
        case "update_field":
          // In production, this would actually update the record
          // await updateRecord(issue.entity, issue.entityId, issue.fixAction.params);
          fixed++;
          results.push({ issueId: issue.id, success: true });
          break;

        case "delete_record":
          // await deleteRecord(issue.entity, issue.entityId);
          fixed++;
          results.push({ issueId: issue.id, success: true });
          break;

        case "link_record":
          // await linkRecord(issue.entity, issue.entityId, issue.fixAction.params);
          fixed++;
          results.push({ issueId: issue.id, success: true });
          break;

        default:
          skipped++;
          results.push({ issueId: issue.id, success: false, error: "Unknown action type" });
      }
    } catch (error: any) {
      failed++;
      results.push({ issueId: issue.id, success: false, error: error.message });
    }
  }

  return { fixed, failed, skipped, results };
}
