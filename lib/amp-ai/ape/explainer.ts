// STRIKE 9: Auto-Explain Evolution
// Generates human-readable explanations for all evolution actions

import { ProfileEvolution, EvolutionSuggestion, CleaningRuleEvolution, ValidationRuleEvolution } from "./types";

/**
 * Explain a profile evolution
 */
export function explainProfileEvolution(evolution: ProfileEvolution): string {
  if (evolution.changes.length === 0) {
    return "No profile changes detected.";
  }

  const changeDescriptions = evolution.changes.map(change => {
    if (change.type === "mapping_updated") {
      return `'${change.field}' → ${change.newValue} (${(change.confidence * 100).toFixed(0)}% confidence)`;
    } else if (change.type === "mapping_added") {
      return `Added mapping: '${change.field}' → ${change.newValue}`;
    } else if (change.type === "mapping_removed") {
      return `Removed mapping: '${change.field}'`;
    } else if (change.type === "rule_added") {
      return `Added rule: ${change.field}`;
    }
    return `${change.type}: ${change.field}`;
  }).join(", ");

  const status = evolution.applied 
    ? "Profile updated automatically" 
    : "Profile evolution suggested (requires review)";

  return `${status}: ${changeDescriptions}. ${evolution.explanation}`;
}

/**
 * Explain an evolution suggestion
 */
export function explainEvolutionSuggestion(suggestion: EvolutionSuggestion): string {
  let action = "";
  
  switch (suggestion.type) {
    case "mapping_update":
      action = `Update mapping: '${(suggestion.currentState as any).column}' → ${(suggestion.proposedChange as any).targetField}`;
      break;
    case "new_mapping":
      action = `Add new mapping: '${(suggestion.currentState as any).column}' → ${(suggestion.proposedChange as any).suggestedMapping}`;
      break;
    case "cleaning_rule":
      action = `Add cleaning rule: ${(suggestion.proposedChange as any).rule} for '${(suggestion.currentState as any).column}'`;
      break;
    case "validation_rule":
      action = `Add validation rule: ${(suggestion.proposedChange as any).ruleType} for '${(suggestion.currentState as any).column}'`;
      break;
    case "workflow_trigger":
      action = `Add workflow trigger: ${(suggestion.proposedChange as any).condition}`;
      break;
  }

  return `${action} (${(suggestion.confidence * 100).toFixed(0)}% confidence, ${suggestion.priority} priority). ${suggestion.reason}`;
}

/**
 * Explain cleaning rule evolution
 */
export function explainCleaningRuleEvolution(evolution: CleaningRuleEvolution): string {
  return `Cleaning rule evolved: ${evolution.pattern} for '${evolution.field}' (${evolution.frequency} occurrences, ${(evolution.confidence * 100).toFixed(0)}% confidence)${evolution.applied ? " - Applied automatically" : " - Requires review"}`;
}

/**
 * Explain validation rule evolution
 */
export function explainValidationRuleEvolution(evolution: ValidationRuleEvolution): string {
  return `Validation rule evolved: ${evolution.ruleType} rule for '${evolution.field}' (${evolution.frequency} errors, ${(evolution.confidence * 100).toFixed(0)}% confidence)${evolution.applied ? " - Applied automatically" : " - Requires review"}`;
}

/**
 * Generate comprehensive evolution summary
 */
export function generateEvolutionSummary(
  profileEvolution?: ProfileEvolution,
  cleaningEvolutions?: CleaningRuleEvolution[],
  validationEvolutions?: ValidationRuleEvolution[],
  suggestions?: EvolutionSuggestion[]
): string {
  const parts: string[] = [];

  if (profileEvolution && profileEvolution.changes.length > 0) {
    parts.push(explainProfileEvolution(profileEvolution));
  }

  if (cleaningEvolutions && cleaningEvolutions.length > 0) {
    parts.push(...cleaningEvolutions.map(explainCleaningRuleEvolution));
  }

  if (validationEvolutions && validationEvolutions.length > 0) {
    parts.push(...validationEvolutions.map(explainValidationRuleEvolution));
  }

  if (suggestions && suggestions.length > 0) {
    parts.push(`\nEvolution suggestions (${suggestions.length}):`);
    parts.push(...suggestions.map(explainEvolutionSuggestion));
  }

  return parts.length > 0 ? parts.join("\n") : "No evolution detected.";
}
