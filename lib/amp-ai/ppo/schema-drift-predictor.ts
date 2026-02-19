// STRIKE 1: Predict Schema Drift Before It Breaks
// Analyzes column patterns to predict schema changes

import { SchemaDriftPrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

interface ColumnHistory {
  column: string;
  appearances: number;
  lastSeen: string;
  firstSeen: string;
  frequency: number; // appearances / total runs
  trend: "increasing" | "decreasing" | "stable";
}

/**
 * Predict schema drift for a pipeline
 */
export async function predictSchemaDrift(
  pipelineId: string,
  tenant: string,
  profileKey: string
): Promise<SchemaDriftPrediction[]> {
  const predictions: SchemaDriftPrediction[] = [];

  try {
    const base = await getAirtableBase();
    // Load execution history
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 50,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 5) {
      return predictions; // Need at least 5 runs for prediction
    }

    // Load schema drifts from APE memory
    const signalsTable = base("AMP Evolution Signals");
    const driftSignals = await signalsTable.select({
      filterByFormula: `AND({Type} = "drift", {ProfileKey} = "${profileKey}", {Tenant} = "${tenant}")`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    // Analyze column frequency trends
    const columnHistory: Record<string, ColumnHistory> = {};
    const recentColumns = new Set<string>();
    const olderColumns = new Set<string>();

    // Split into recent (last 10) and older (10-20)
    const recentRuns = records.slice(0, 10);
    const olderRuns = records.slice(10, 20);

    // This is simplified - in reality we'd need to track actual column names per run
    // For now, we'll use drift signals to infer patterns

    // Analyze drift signals
    const newColumnCounts: Record<string, number> = {};
    const missingColumnCounts: Record<string, number> = {};

    driftSignals.forEach(record => {
      const metadata = JSON.parse((record.get("Metadata") as string) || "{}");
      const column = record.get("Column") as string;
      const driftType = metadata.driftType;

      if (driftType === "new_column") {
        newColumnCounts[column] = (newColumnCounts[column] || 0) + 1;
      } else if (driftType === "missing_column") {
        missingColumnCounts[column] = (missingColumnCounts[column] || 0) + 1;
      }
    });

    // Predict new columns based on frequency of new column signals
    for (const [column, count] of Object.entries(newColumnCounts)) {
      if (count >= 2) {
        predictions.push({
          type: "new_column",
          column,
          confidence: Math.min(0.9, 0.5 + (count / 5) * 0.4),
          timeframe: count >= 3 ? "immediate" : "short_term",
          description: `Column '${column}' has appeared ${count} times recently and may become permanent`,
          indicators: [
            `Appeared in ${count} recent runs`,
            "Trend suggests it will be added to schema"
          ],
          recommendedAction: `Add '${column}' to mapping profile or create fallback mapping`
        });
      }
    }

    // Predict missing columns based on decreasing frequency
    for (const [column, count] of Object.entries(missingColumnCounts)) {
      if (count >= 2) {
        predictions.push({
          type: "missing_column",
          column,
          confidence: Math.min(0.85, 0.4 + (count / 5) * 0.45),
          timeframe: count >= 3 ? "immediate" : "short_term",
          description: `Column '${column}' has been missing ${count} times recently`,
          indicators: [
            `Missing in ${count} recent runs`,
            "May be deprecated or renamed"
          ],
          recommendedAction: `Make '${column}' mapping optional or add fallback value`
        });
      }
    }

    // Predict type drift based on error patterns
    const errorTable = base("AMP Errors");
    const recentErrors = await errorTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 50,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    const columnErrorTypes: Record<string, Record<string, number>> = {};
    recentErrors.forEach(record => {
      const rawRow = JSON.parse((record.get("RawRow") as string) || "{}");
      const errorMsg = (record.get("ErrorMessage") as string || "").toLowerCase();
      
      // Try to identify column from error message
      for (const [column, value] of Object.entries(rawRow)) {
        if (errorMsg.includes(column.toLowerCase()) || errorMsg.includes("format") || errorMsg.includes("invalid")) {
          if (!columnErrorTypes[column]) {
            columnErrorTypes[column] = {};
          }
          const errorType = errorMsg.includes("email") ? "email" :
                           errorMsg.includes("phone") ? "phone" :
                           errorMsg.includes("date") ? "date" :
                           "format";
          columnErrorTypes[column][errorType] = (columnErrorTypes[column][errorType] || 0) + 1;
        }
      }
    });

    // Predict type drift for columns with format errors
    for (const [column, errorTypes] of Object.entries(columnErrorTypes)) {
      const totalErrors = Object.values(errorTypes).reduce((sum, count) => sum + count, 0);
      if (totalErrors >= 5) {
        const dominantError = Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0];
        
        predictions.push({
          type: "type_change",
          column,
          confidence: Math.min(0.8, 0.5 + (totalErrors / 20) * 0.3),
          timeframe: "short_term",
          description: `Column '${column}' has ${totalErrors} format errors, suggesting type drift`,
          indicators: [
            `${dominantError[1]} ${dominantError[0]} format errors`,
            "Data format is becoming inconsistent"
          ],
          recommendedAction: `Review '${column}' type mapping and add normalization rule`
        });
      }
    }

  } catch (error) {
    console.error("[PPO] Failed to predict schema drift:", error);
  }

  return predictions;
}
