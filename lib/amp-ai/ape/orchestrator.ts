// APE Orchestrator
// Coordinates all evolution strikes

import { loadEvolutionMemory } from "./memory";
import { learningLoop } from "./hooks";
import { generateEvolutionSuggestions, generateCleaningRuleSuggestions } from "./suggestions";
import {
  evolveMappingProfile,
  evolveCleaningRules,
  evolveValidationRules,
  evolveWorkflowTriggers
} from "./evolution";
import { generateEvolutionSummary } from "./explainer";
import { ProfileEvolution, EvolutionSuggestion, CleaningRuleEvolution, ValidationRuleEvolution } from "./types";

/**
 * Run complete evolution cycle
 */
export async function runEvolutionCycle(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  rawRows: Record<string, any>[],
  transformedRows: Record<string, any>[],
  errors: Array<{ row: number; error: string }>,
  columnMappings: Record<string, string>
): Promise<{
  profileEvolution?: ProfileEvolution;
  cleaningEvolutions: CleaningRuleEvolution[];
  validationEvolutions: ValidationRuleEvolution[];
  suggestions: EvolutionSuggestion[];
  summary: string;
}> {
  // Step 1: Learning loop - capture signals
  await learningLoop(pipelineId, tenant, profileKey, rawRows, transformedRows, errors, columnMappings);

  // Step 2: Load evolution memory
  const memory = await loadEvolutionMemory(profileKey, tenant);

  // Step 3: Generate suggestions
  const suggestions = generateEvolutionSuggestions(memory);
  const cleaningSuggestions = generateCleaningRuleSuggestions(memory, rawRows.slice(0, 100)); // Sample

  // Step 4: Evolve profiles (auto-apply high confidence)
  const profileEvolution = await evolveMappingProfile(profileKey, tenant, suggestions);

  // Step 5: Evolve cleaning rules
  const cleaningEvolutions = await evolveCleaningRules(profileKey, tenant, memory, rawRows.slice(0, 100));

  // Step 6: Evolve validation rules
  const validationEvolutions = await evolveValidationRules(profileKey, tenant, memory);

  // Step 7: Evolve workflow triggers
  const workflowEvolutions = await evolveWorkflowTriggers(profileKey, tenant, memory);

  // Step 8: Generate summary
  const summary = generateEvolutionSummary(
    profileEvolution,
    cleaningEvolutions,
    validationEvolutions,
    [...suggestions, ...cleaningSuggestions]
  );

  return {
    profileEvolution,
    cleaningEvolutions,
    validationEvolutions,
    suggestions: [...suggestions, ...cleaningSuggestions],
    summary
  };
}
