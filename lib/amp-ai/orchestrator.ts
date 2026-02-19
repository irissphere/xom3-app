// AMP-AI Orchestrator
// Coordinates all AMP-AI strikes for autonomous operation

import { AMPAIContext, SchemaAnalysis, RepairResult } from "./types";
import {
  detectSchemaFromCSV,
  detectSchemaFromAPI,
  analyzeColumn
} from "./schema-detector";
import {
  suggestProfile,
  getProfileSuggestions
} from "./profile-suggester";
import {
  cleanRecord,
  cleanBatch
} from "./data-cleaner";
import {
  repairFailedRow,
  analyzeError
} from "./auto-repair";
import {
  explain,
  explainSchemaDetection,
  explainProfileSuggestion,
  explainDataCleaning,
  explainAutoRepair,
  explainPatternDetection,
  addExplanation,
  getExplanationSummary
} from "./explainer";

/**
 * Process incoming data with full AMP-AI pipeline
 */
export async function processWithAMPAI(
  data: string | any[],
  tenant: string,
  pipelineId?: string,
  executionId?: string,
  options: {
    autoDetectSchema?: boolean;
    autoSuggestProfile?: boolean;
    autoClean?: boolean;
    autoRepair?: boolean;
    autoApplyProfile?: boolean;
    profileThreshold?: number;
  } = {}
): Promise<{
  schemaAnalysis?: SchemaAnalysis;
  suggestedProfile?: string;
  cleanedData?: any[];
  context: AMPAIContext;
}> {
  const {
    autoDetectSchema = true,
    autoSuggestProfile = true,
    autoClean = true,
    autoRepair = false,
    autoApplyProfile = false,
    profileThreshold = 0.6
  } = options;

  const context: AMPAIContext = {
    tenant,
    pipelineId,
    executionId,
    explanations: []
  };

  let schemaAnalysis: SchemaAnalysis | undefined;
  let suggestedProfile: string | undefined;
  let cleanedData: any[] | undefined;

  // STRIKE 1: Auto-detect schema
  if (autoDetectSchema) {
    if (typeof data === "string") {
      schemaAnalysis = detectSchemaFromCSV(data);
    } else if (Array.isArray(data)) {
      schemaAnalysis = detectSchemaFromAPI(data);
    }

    if (schemaAnalysis) {
      const explanation = explainSchemaDetection(
        schemaAnalysis.columns.length,
        undefined,
        schemaAnalysis.confidence
      );
      addExplanation(context, explanation);
    }
  }

  // STRIKE 2: Auto-suggest profile
  if (autoSuggestProfile && schemaAnalysis) {
    const match = suggestProfile(schemaAnalysis, profileThreshold);
    
    if (match) {
      suggestedProfile = match.profileKey;
      const explanation = explainProfileSuggestion(
        match.profileName,
        match.score,
        match.matchedColumns
      );
      addExplanation(context, explanation);
    }
  }

  // STRIKE 3: Auto-clean data
  if (autoClean && schemaAnalysis) {
    let records: Record<string, any>[] = [];
    
    if (typeof data === "string") {
      // Parse CSV
      const lines = data.split("\n").filter(l => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(",").map(h => h.trim());
        records = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          const record: Record<string, any> = {};
          headers.forEach((h, i) => {
            record[h] = values[i] || "";
          });
          return record;
        });
      }
    } else if (Array.isArray(data)) {
      records = data;
    }

    if (records.length > 0) {
      const cleaned = cleanBatch(records, schemaAnalysis);
      cleanedData = cleaned.cleaned;
      
      if (cleaned.totalChanges > 0) {
        const explanation = explainDataCleaning(
          cleaned.totalChanges,
          Object.keys(cleaned.changesByField)
        );
        addExplanation(context, explanation);
      }
    }
  }

  return {
    schemaAnalysis,
    suggestedProfile,
    cleanedData,
    context
  };
}

/**
 * Repair failed rows with AMP-AI
 */
export function repairRowsWithAMPAI(
  failedRows: Array<{ row: Record<string, any>; error: string }>,
  context: AMPAIContext
): {
  repaired: Array<{ row: Record<string, any>; error: string; repairResult: RepairResult }>;
  context: AMPAIContext;
} {
  const repaired = failedRows.map(({ row, error }) => {
    const repairResult = repairFailedRow(row, error, ["firstName", "lastName", "email"], true);
    
    if (repairResult.applied && repairResult.suggestions.length > 0) {
      const explanation = explainAutoRepair(
        repairResult.suggestions.length,
        repairResult.suggestions.map(s => ({
          field: s.field,
          reason: s.reason
        }))
      );
      addExplanation(context, explanation);
    }

    return { row, error, repairResult };
  });

  return { repaired, context };
}

/**
 * Monitor and trigger workflows based on patterns
 */
export async function monitorAndTrigger(
  pipelineId: string,
  tenant: string,
  workflowWebhook?: string
): Promise<AMPAIContext> {
  const context: AMPAIContext = {
    tenant,
    pipelineId,
    explanations: []
  };

  // Lazy-load pattern detection to avoid build-time Airtable initialization
  const { detectPatterns, triggerWorkflowForPattern, sendPatternAlert } = await import("./pattern-detector");
  const patterns = await detectPatterns(pipelineId, tenant);

  for (const pattern of patterns) {
    const explanation = explainPatternDetection(
      pattern.type,
      pattern.description,
      pattern.severity
    );
    addExplanation(context, explanation);

    // Trigger workflow if configured
    if (workflowWebhook && (pattern.severity === "critical" || pattern.severity === "warning")) {
      await triggerWorkflowForPattern(pattern, pipelineId, workflowWebhook);
    }

    // Send alerts
    if (pattern.severity === "critical") {
      await sendPatternAlert(pattern, pipelineId, ["slack"]);
    }
  }

  return context;
}

/**
 * Get human-readable summary of all AMP-AI actions
 */
export function getAMPAISummary(context: AMPAIContext): string {
  return getExplanationSummary(context);
}

/**
 * Run APE evolution cycle after pipeline execution
 */
export async function runAPE(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  rawRows: Record<string, any>[],
  transformedRows: Record<string, any>[],
  errors: Array<{ row: number; error: string }>,
  columnMappings: Record<string, string>
): Promise<{
  evolutionSummary: string;
  profileEvolution?: any;
  suggestions: any[];
}> {
  try {
    // Lazy-load APE orchestrator to avoid build-time Airtable initialization
    const { runEvolutionCycle } = await import("./ape/orchestrator");
    const evolutionResult = await runEvolutionCycle(
      pipelineId,
      tenant,
      profileKey,
      rawRows,
      transformedRows,
      errors,
      columnMappings
    );

    return {
      evolutionSummary: evolutionResult.summary,
      profileEvolution: evolutionResult.profileEvolution,
      suggestions: evolutionResult.suggestions
    };
  } catch (error) {
    console.error("[APE] Evolution cycle failed:", error);
    return {
      evolutionSummary: "Evolution cycle encountered an error (see logs)",
      suggestions: []
    };
  }
}

/**
 * Run PPO predictions before pipeline execution
 */
export async function runPPOPredictions(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  incomingColumns?: string[],
  estimatedRows?: number
): Promise<{
  predictions: any;
  summary: string;
  overallRisk: string;
}> {
  try {
    // Lazy-load PPO orchestrator to avoid build-time Airtable initialization
    const { runPPO } = await import("./ppo/orchestrator");
    const prediction = await runPPO(
      pipelineId,
      tenant,
      profileKey,
      incomingColumns,
      estimatedRows
    );

    return {
      predictions: prediction,
      summary: prediction.summary || "",
      overallRisk: prediction.overallRisk
    };
  } catch (error) {
    console.error("[PPO] Prediction cycle failed:", error);
    return {
      predictions: {},
      summary: "Prediction cycle encountered an error (see logs)",
      overallRisk: "low"
    };
  }
}
