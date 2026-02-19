// STRIKE 4: Generate Evolution Suggestions
// Analyzes evolution memory and generates actionable suggestions

import { EvolutionMemory, EvolutionSuggestion } from "./types";

const HIGH_CONFIDENCE_THRESHOLD = 0.9;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.7;
const MIN_FREQUENCY = 10; // Minimum occurrences to suggest

/**
 * Generate evolution suggestions from memory
 */
export function generateEvolutionSuggestions(
  memory: EvolutionMemory
): EvolutionSuggestion[] {
  const suggestions: EvolutionSuggestion[] = [];

  // Analyze column mappings
  for (const [column, mappings] of Object.entries(memory.columnMappings)) {
    if (typeof mappings === "object" && mappings !== null) {
      const mappingEntries = Object.entries(mappings);
      
      for (const [targetField, frequency] of mappingEntries) {
        const freq = frequency as any;
        
        if (freq.totalCount >= MIN_FREQUENCY && freq.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
          // High confidence mapping - suggest auto-update
          suggestions.push({
            type: "mapping_update",
            priority: "high",
            confidence: freq.confidence,
            description: `Column '${column}' consistently maps to ${targetField} (${(freq.confidence * 100).toFixed(0)}% success rate)`,
            currentState: { column, currentMapping: "unknown" },
            proposedChange: { column, targetField, confidence: freq.confidence },
            impact: "High - Will improve mapping accuracy",
            reason: `${freq.successCount} successful mappings out of ${freq.totalCount} total`
          });
        } else if (freq.totalCount >= MIN_FREQUENCY && freq.confidence >= MEDIUM_CONFIDENCE_THRESHOLD) {
          // Medium confidence - suggest for review
          suggestions.push({
            type: "mapping_update",
            priority: "medium",
            confidence: freq.confidence,
            description: `Column '${column}' frequently maps to ${targetField} (${(freq.confidence * 100).toFixed(0)}% success rate)`,
            currentState: { column, currentMapping: "unknown" },
            proposedChange: { column, targetField, confidence: freq.confidence },
            impact: "Medium - May improve mapping accuracy",
            reason: `${freq.successCount} successful mappings out of ${freq.totalCount} total`
          });
        }
      }
    }
  }

  // Analyze error patterns
  for (const errorPattern of memory.errorPatterns) {
    if (errorPattern.frequency >= MIN_FREQUENCY) {
      // High frequency error - suggest new mapping or rule
      suggestions.push({
        type: "mapping_update",
        priority: "high",
        confidence: 0.8,
        description: `Column '${errorPattern.column}' has ${errorPattern.frequency} errors: ${errorPattern.errorType}`,
        currentState: { column: errorPattern.column, errorCount: errorPattern.frequency },
        proposedChange: { 
          column: errorPattern.column, 
          suggestedFix: errorPattern.suggestedFix || "Review mapping or add validation rule"
        },
        impact: "High - Will reduce error rate",
        reason: `Repeated ${errorPattern.errorType} errors suggest mapping issue`
      });
    }
  }

  // Analyze schema drifts
  const newColumns = memory.schemaDrifts.filter(d => d.type === "new_column");
  for (const drift of newColumns) {
    suggestions.push({
      type: "new_mapping",
      priority: "medium",
      confidence: 0.6,
      description: `New column '${drift.column}' detected in source data`,
      currentState: { column: drift.column, status: "unmapped" },
      proposedChange: { 
        column: drift.column, 
        suggestedMapping: inferTargetField(drift.column)
      },
      impact: "Medium - New data may be missed without mapping",
      reason: "Column appeared in recent data but is not in current profile"
    });
  }

  // Analyze tenant overrides
  const overrides = memory.tenantOverrides;
  if (overrides.length > 0) {
    const overrideCounts: Record<string, number> = {};
    overrides.forEach(override => {
      const key = `${override.column}:${override.overrideMapping}`;
      overrideCounts[key] = (overrideCounts[key] || 0) + 1;
    });

    for (const [key, count] of Object.entries(overrideCounts)) {
      if (count >= 3) { // Multiple tenants override the same way
        const [column, mapping] = key.split(":");
        suggestions.push({
          type: "mapping_update",
          priority: "medium",
          confidence: 0.7,
          description: `Multiple tenants override '${column}' to ${mapping}`,
          currentState: { column, currentMapping: "unknown" },
          proposedChange: { column, targetField: mapping },
          impact: "Medium - Reflects common tenant preference",
          reason: `${count} tenants have manually set this mapping`
        });
      }
    }
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Infer target field from column name
 */
function inferTargetField(columnName: string): string {
  const lower = columnName.toLowerCase();
  
  if (/first|fname|given/i.test(lower)) return "firstName";
  if (/last|lname|surname|family/i.test(lower)) return "lastName";
  if (/email|e.?mail/i.test(lower)) return "email";
  if (/phone|tel|mobile|cell/i.test(lower)) return "phone";
  if (/status|stage|state/i.test(lower)) return "status";
  if (/created|date|timestamp/i.test(lower)) return "createdAt";
  
  return "unknown";
}

/**
 * Generate cleaning rule suggestions
 */
export function generateCleaningRuleSuggestions(
  memory: EvolutionMemory,
  sampleData: Record<string, any>[]
): EvolutionSuggestion[] {
  const suggestions: EvolutionSuggestion[] = [];

  // Analyze common formatting patterns
  for (const [column, mappings] of Object.entries(memory.columnMappings)) {
    const samples = sampleData.map(row => row[column]).filter(v => v);
    
    if (samples.length === 0) continue;

    // Check for phone number formatting inconsistencies
    if (/phone|tel|mobile/i.test(column)) {
      const formats = samples.map(v => {
        const digits = String(v).replace(/\D/g, "");
        return digits.length;
      });
      const uniqueFormats = new Set(formats);
      
      if (uniqueFormats.size > 1) {
        suggestions.push({
          type: "cleaning_rule",
          priority: "medium",
          confidence: 0.8,
          description: `Phone numbers in '${column}' have inconsistent formats`,
          currentState: { column, formats: Array.from(uniqueFormats) },
          proposedChange: { 
            rule: "normalize_phone",
            targetFormat: "E.164"
          },
          impact: "Medium - Will standardize phone number format",
          reason: `Found ${uniqueFormats.size} different phone number formats`
        });
      }
    }

    // Check for email domain typos
    if (/email/i.test(column)) {
      const typos = samples.filter(v => {
        const email = String(v).toLowerCase();
        return /gmal\.com|gmial\.com|gmai\.com|yaho\.com|hotmai\.com/.test(email);
      });
      
      if (typos.length > 0) {
        suggestions.push({
          type: "cleaning_rule",
          priority: "high",
          confidence: 0.9,
          description: `Found ${typos.length} email typos in '${column}'`,
          currentState: { column, typoCount: typos.length },
          proposedChange: {
            rule: "fix_email_domains",
            corrections: {
              "gmal.com": "gmail.com",
              "gmial.com": "gmail.com",
              "gmai.com": "gmail.com",
              "yaho.com": "yahoo.com",
              "hotmai.com": "hotmail.com"
            }
          },
          impact: "High - Will fix common email domain typos",
          reason: `Detected ${typos.length} emails with common typos`
        });
      }
    }
  }

  return suggestions;
}
