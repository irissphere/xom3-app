// STRIKE 8: Predict & Auto-Trigger Preventative Actions
// Generates and applies preventative actions based on predictions

import { PreventativeAction, PPOPrediction } from "./types";
import { cleanBatch } from "../data-cleaner";
import { suggestProfile } from "../profile-suggester";
import { detectSchemaFromCSV, detectSchemaFromAPI } from "../schema-detector";

/**
 * Generate preventative actions from predictions
 */
export function generatePreventativeActions(
  predictions: PPOPrediction
): PreventativeAction[] {
  const actions: PreventativeAction[] = [];

  // Pre-clean actions for predicted failures
  if (predictions.failures && predictions.failures.length > 0) {
    for (const failure of predictions.failures) {
      if (failure.confidence >= 0.8 && failure.column) {
        actions.push({
          type: "pre_clean",
          target: failure.column,
          action: {
            rule: "normalize",
            field: failure.column,
            failureType: failure.failureType
          },
          confidence: failure.confidence,
          reason: `Pre-clean '${failure.column}' to prevent ${failure.failureType} failures`,
          autoTrigger: failure.confidence >= 0.9
        });
      }
    }
  }

  // Pre-map actions for schema drift
  if (predictions.schemaDrift && predictions.schemaDrift.length > 0) {
    for (const drift of predictions.schemaDrift) {
      if (drift.type === "new_column" && drift.confidence >= 0.7) {
        actions.push({
          type: "pre_map",
          target: drift.column || "unknown",
          action: {
            column: drift.column,
            suggestedMapping: inferMapping(drift.column || "")
          },
          confidence: drift.confidence,
          reason: `Pre-map new column '${drift.column}' before it causes errors`,
          autoTrigger: drift.confidence >= 0.85
        });
      }
    }
  }

  // Pre-validate actions for error spikes
  if (predictions.errorSpikes && predictions.errorSpikes.length > 0) {
    for (const spike of predictions.errorSpikes) {
      if (spike.confidence >= 0.75) {
        actions.push({
          type: "pre_validate",
          target: spike.source,
          action: {
            validationRules: "enhanced",
            source: spike.source
          },
          confidence: spike.confidence,
          reason: `Pre-validate data from '${spike.source}' to prevent error spike`,
          autoTrigger: spike.confidence >= 0.85
        });
      }
    }
  }

  // Pre-adjust profile actions
  if (predictions.profiles && predictions.profiles.length > 0) {
    for (const profile of predictions.profiles) {
      if (profile.confidence >= 0.8 && profile.driftDetected) {
        actions.push({
          type: "pre_adjust_profile",
          target: profile.currentProfile,
          action: {
            switchTo: profile.suggestedProfile,
            reason: profile.reason
          },
          confidence: profile.confidence,
          reason: `Pre-adjust profile from '${profile.currentProfile}' to '${profile.suggestedProfile}'`,
          autoTrigger: profile.confidence >= 0.9
        });
      }
    }
  }

  // Pre-normalize actions for predicted type drift
  if (predictions.schemaDrift) {
    for (const drift of predictions.schemaDrift) {
      if (drift.type === "type_change" && drift.confidence >= 0.7) {
        actions.push({
          type: "pre_normalize",
          target: drift.column || "unknown",
          action: {
            column: drift.column,
            normalizationRule: inferNormalization(drift.column || "")
          },
          confidence: drift.confidence,
          reason: `Pre-normalize '${drift.column}' to handle type drift`,
          autoTrigger: drift.confidence >= 0.8
        });
      }
    }
  }

  return actions;
}

/**
 * Infer mapping for a column
 */
function inferMapping(columnName: string): string {
  const lower = columnName.toLowerCase();
  if (/first|fname|given/i.test(lower)) return "firstName";
  if (/last|lname|surname/i.test(lower)) return "lastName";
  if (/email/i.test(lower)) return "email";
  if (/phone|tel/i.test(lower)) return "phone";
  if (/status|stage/i.test(lower)) return "status";
  if (/created|date/i.test(lower)) return "createdAt";
  return "unknown";
}

/**
 * Infer normalization rule
 */
function inferNormalization(columnName: string): string {
  const lower = columnName.toLowerCase();
  if (/email/i.test(lower)) return "normalize_email";
  if (/phone|tel/i.test(lower)) return "normalize_phone";
  if (/name/i.test(lower)) return "normalize_name";
  if (/date/i.test(lower)) return "normalize_date";
  return "normalize_text";
}

/**
 * Apply preventative actions
 */
export async function applyPreventativeActions(
  actions: PreventativeAction[],
  data: Record<string, any>[]
): Promise<{
  applied: number;
  skipped: number;
  results: Record<string, any>;
}> {
  const results: Record<string, any> = {};
  let applied = 0;
  let skipped = 0;

  for (const action of actions) {
    if (!action.autoTrigger) {
      skipped++;
      continue;
    }

    try {
      switch (action.type) {
        case "pre_clean":
          // Apply cleaning to data
          const cleaned = cleanBatch(data);
          results[action.target] = {
            type: "cleaned",
            changes: cleaned.totalChanges
          };
          applied++;
          break;

        case "pre_map":
          // Pre-map would be applied during transformation
          results[action.target] = {
            type: "pre_mapped",
            mapping: action.action
          };
          applied++;
          break;

        case "pre_validate":
          // Pre-validation would be applied during transformation
          results[action.target] = {
            type: "pre_validated",
            rules: action.action
          };
          applied++;
          break;

        case "pre_normalize":
          // Pre-normalization would be applied during transformation
          results[action.target] = {
            type: "pre_normalized",
            rule: action.action
          };
          applied++;
          break;

        default:
          skipped++;
      }
    } catch (error) {
      console.error(`[PPO] Failed to apply preventative action ${action.type}:`, error);
      skipped++;
    }
  }

  return { applied, skipped, results };
}
