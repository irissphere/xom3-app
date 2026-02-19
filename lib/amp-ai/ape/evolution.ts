// STRIKE 5, 6, 7, 8: Auto-Evolve Profiles, Rules, and Triggers
// Applies evolution suggestions based on confidence

import { EvolutionSuggestion, ProfileEvolution, CleaningRuleEvolution, ValidationRuleEvolution, WorkflowTriggerEvolution } from "./types";
import { generateEvolutionSuggestions, generateCleaningRuleSuggestions } from "./suggestions";
import { loadEvolutionMemory } from "./memory";
import fs from "fs";
import path from "path";

const HIGH_CONFIDENCE = 0.9;
const MEDIUM_CONFIDENCE = 0.7;

/**
 * Evolve a mapping profile based on suggestions
 */
export async function evolveMappingProfile(
  profileKey: string,
  tenant: string,
  suggestions: EvolutionSuggestion[]
): Promise<ProfileEvolution> {
  const evolution: ProfileEvolution = {
    profileKey,
    tenant,
    changes: [],
    confidence: 0,
    applied: false,
    explanation: ""
  };

  // Filter high-confidence suggestions for auto-apply
  const highConfidenceSuggestions = suggestions.filter(
    s => s.type === "mapping_update" && s.confidence >= HIGH_CONFIDENCE && s.priority === "high"
  );

  if (highConfidenceSuggestions.length === 0) {
    return evolution;
  }

  // Calculate overall confidence
  const avgConfidence = highConfidenceSuggestions.reduce((sum, s) => sum + s.confidence, 0) / highConfidenceSuggestions.length;
  evolution.confidence = avgConfidence;

  // Apply changes
  for (const suggestion of highConfidenceSuggestions) {
    if (suggestion.type === "mapping_update" && suggestion.proposedChange) {
      evolution.changes.push({
        type: "mapping_updated",
        field: suggestion.proposedChange.column,
        newValue: suggestion.proposedChange.targetField,
        confidence: suggestion.confidence,
        reason: suggestion.reason
      });
    }
  }

  // Auto-apply if confidence is high enough
  if (evolution.confidence >= HIGH_CONFIDENCE && evolution.changes.length > 0) {
    evolution.applied = true;
    evolution.appliedAt = new Date().toISOString();
    
    // Update the profile file
    await applyProfileEvolution(profileKey, evolution);
    
    evolution.explanation = `Profile updated automatically: ${evolution.changes.map(c => 
      `'${c.field}' → ${c.newValue}`
    ).join(", ")} (${(evolution.confidence * 100).toFixed(0)}% confidence)`;
  } else {
    evolution.explanation = `Profile evolution suggested: ${evolution.changes.length} changes proposed (${(evolution.confidence * 100).toFixed(0)}% confidence). Review in cockpit.`;
  }

  return evolution;
}

/**
 * Apply profile evolution to file system
 */
async function applyProfileEvolution(
  profileKey: string,
  evolution: ProfileEvolution
): Promise<void> {
  try {
    // Ensure pipeline system is initialized (creates directories if needed)
    const { initializePipelineSystem } = await import("../../pipelines/init");
    initializePipelineSystem();
    
    const profilesPath = path.join(process.cwd(), "mapping-profiles", "visual-profiles.json");
    
    if (!fs.existsSync(profilesPath)) {
      console.warn("[APE] Profiles file not found, cannot apply evolution");
      return;
    }

    let content: string;
    try {
      content = fs.readFileSync(profilesPath, "utf8");
    } catch (readError: any) {
      if (readError.code === "EACCES") {
        console.error(`[APE] Permission denied reading profiles file: ${profilesPath}`);
        throw new Error(`Permission denied reading profiles file: ${readError.message}`);
      } else {
        console.error(`[APE] Failed to read profiles file: ${profilesPath}`, readError);
        throw new Error(`Failed to read profiles file: ${readError.message || String(readError)}`);
      }
    }

    let profiles: Record<string, Record<string, string>>;
    try {
      profiles = JSON.parse(content) as Record<string, Record<string, string>>;
    } catch (parseError: any) {
      console.error(`[APE] Invalid JSON in profiles file: ${profilesPath}`, parseError);
      throw new Error(`Invalid JSON in profiles file: ${parseError.message}`);
    }

    // Find the profile (remove 'visual-' prefix if present)
    const profileName = profileKey.startsWith("visual-") 
      ? profileKey.substring(7) 
      : profileKey;

    if (!profiles[profileName]) {
      console.warn(`[APE] Profile ${profileName} not found`);
      return;
    }

    // Apply changes
    for (const change of evolution.changes) {
      if (change.type === "mapping_updated" && change.newValue) {
        // Find the column that maps to the old value and update it
        const currentMapping = profiles[profileName];
        for (const [column, targetField] of Object.entries(currentMapping)) {
          if (column === change.field) {
            profiles[profileName][column] = change.newValue;
            break;
          }
        }
      }
    }

    // Save updated profile
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2));
    
    console.log(`[APE] Profile ${profileName} evolved successfully`);
  } catch (error) {
    console.error("[APE] Failed to apply profile evolution:", error);
    throw error;
  }
}

/**
 * Evolve cleaning rules based on patterns
 */
export async function evolveCleaningRules(
  profileKey: string,
  tenant: string,
  memory: any,
  sampleData: Record<string, any>[]
): Promise<CleaningRuleEvolution[]> {
  const suggestions = generateCleaningRuleSuggestions(memory, sampleData);
  const evolutions: CleaningRuleEvolution[] = [];

  for (const suggestion of suggestions) {
    if (suggestion.type === "cleaning_rule" && suggestion.confidence >= MEDIUM_CONFIDENCE) {
      const proposed = suggestion.proposedChange as any;
      
      evolutions.push({
        field: (suggestion.currentState as any).column,
        pattern: proposed.rule,
        transformation: JSON.stringify(proposed),
        frequency: (suggestion.currentState as any).typoCount || 0,
        confidence: suggestion.confidence,
        applied: suggestion.confidence >= HIGH_CONFIDENCE
      });
    }
  }

  return evolutions;
}

/**
 * Evolve validation rules based on error patterns
 */
export async function evolveValidationRules(
  profileKey: string,
  tenant: string,
  memory: any
): Promise<ValidationRuleEvolution[]> {
  const evolutions: ValidationRuleEvolution[] = [];

  // Analyze error patterns to suggest validation rules
  for (const errorPattern of memory.errorPatterns || []) {
    if (errorPattern.frequency >= 10) {
      // High frequency error suggests we need a validation rule
      let ruleType: "required" | "format" | "range" | "enum" | "fallback" = "format";
      let rule: any = {};

      if (errorPattern.errorMessage.includes("missing") || errorPattern.errorMessage.includes("required")) {
        ruleType = "required";
        rule = { required: true };
      } else if (errorPattern.errorMessage.includes("invalid") || errorPattern.errorMessage.includes("format")) {
        ruleType = "format";
        rule = { format: inferFormat(errorPattern.column) };
      } else if (errorPattern.errorMessage.includes("fallback")) {
        ruleType = "fallback";
        rule = { fallback: inferFallback(errorPattern.column) };
      }

      evolutions.push({
        field: errorPattern.column,
        ruleType,
        rule,
        frequency: errorPattern.frequency,
        confidence: Math.min(0.9, errorPattern.frequency / 20),
        applied: errorPattern.frequency >= 20
      });
    }
  }

  return evolutions;
}

/**
 * Infer format from column name
 */
function inferFormat(columnName: string): string {
  const lower = columnName.toLowerCase();
  if (/email/i.test(lower)) return "email";
  if (/phone|tel/i.test(lower)) return "phone";
  if (/date/i.test(lower)) return "date";
  return "text";
}

/**
 * Infer fallback value from column name
 */
function inferFallback(columnName: string): any {
  const lower = columnName.toLowerCase();
  if (/status/i.test(lower)) return "Prospect";
  if (/date|created/i.test(lower)) return new Date().toISOString();
  return "";
}

/**
 * Evolve workflow triggers based on patterns
 */
export async function evolveWorkflowTriggers(
  profileKey: string,
  tenant: string,
  memory: any
): Promise<WorkflowTriggerEvolution[]> {
  const evolutions: WorkflowTriggerEvolution[] = [];

  // Analyze workflow outcomes from signals
  // This would require loading workflow outcome signals
  // For now, return empty array as this requires more integration

  return evolutions;
}
