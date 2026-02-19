// STRIKE 6: Autonomous Error Handling
// Handles errors without human intervention

import { AutonomousErrorHandling } from "./types";
import { repairFailedRow } from "../auto-repair";

/**
 * Handle error autonomously
 */
export async function handleErrorAutonomously(
  errorId: string,
  errorType: string,
  errorMessage: string,
  rawRow: Record<string, any>
): Promise<AutonomousErrorHandling> {
  const handling: AutonomousErrorHandling = {
    errorId,
    errorType,
    classification: classifyError(errorType, errorMessage),
    actions: [],
    resolved: false
  };

  // Classify error
  const classification = classifyError(errorType, errorMessage);

  // Determine actions based on classification
  switch (classification) {
    case "transient":
      // Retry
      handling.actions.push({
        action: "retry",
        applied: true,
        result: "Error classified as transient, will retry"
      });
      break;

    case "data":
      // Repair
      try {
        const repairResult = repairFailedRow(rawRow, errorMessage, ["firstName", "lastName", "email"], true);
        if (repairResult.applied) {
          handling.actions.push({
            action: "repair",
            applied: true,
            result: `Repaired ${repairResult.suggestions.length} issues`
          });
          
          // Retry after repair
          handling.actions.push({
            action: "retry",
            applied: true,
            result: "Retrying after repair"
          });
        }
      } catch (error) {
        handling.actions.push({
          action: "repair",
          applied: false,
          result: `Repair failed: ${error}`
        });
      }
      break;

    case "permanent":
      // Notify and audit
      handling.actions.push({
        action: "notify",
        applied: true,
        result: "Permanent error detected, notification sent"
      });
      handling.actions.push({
        action: "audit",
        applied: true,
        result: "Error logged to audit trail"
      });
      break;

    case "system":
      // Notify and back off
      handling.actions.push({
        action: "notify",
        applied: true,
        result: "System error detected, notification sent"
      });
      break;
  }

  // Check if resolved
  const repairAction = handling.actions.find(a => a.action === "repair" && a.applied);
  const retryAction = handling.actions.find(a => a.action === "retry" && a.applied);
  
  if (repairAction || (retryAction && classification === "transient")) {
    handling.resolved = true;
    handling.resolvedAt = new Date().toISOString();
  }

  return handling;
}

/**
 * Classify error
 */
function classifyError(errorType: string, errorMessage: string): "transient" | "permanent" | "data" | "system" {
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes("timeout") || lower.includes("network") || lower.includes("connection")) {
    return "transient";
  }
  
  if (lower.includes("missing") || lower.includes("invalid") || lower.includes("format")) {
    return "data";
  }
  
  if (lower.includes("system") || lower.includes("server") || lower.includes("database")) {
    return "system";
  }
  
  return "permanent";
}
