// STRIKE 2: Predict Mapping Failures Before They Occur
// Analyzes historical failures to predict future issues

import { FailurePrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

/**
 * Predict mapping failures for a pipeline
 */
export async function predictMappingFailures(
  pipelineId: string,
  tenant: string,
  profileKey: string
): Promise<FailurePrediction[]> {
  const predictions: FailurePrediction[] = [];

  try {
    const base = await getAirtableBase();
    // Load error history
    const errorTable = base("AMP Errors");
    const errors = await errorTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 200,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (errors.length < 10) {
      return predictions; // Need sufficient error history
    }

    // Analyze errors by column
    const columnErrors: Record<string, {
      count: number;
      errorTypes: Record<string, number>;
      recentCount: number;
      timestamps: string[];
    }> = {};

    const recentErrors = errors.slice(0, 50);
    const olderErrors = errors.slice(50, 100);

    errors.forEach(record => {
      const rawRow = JSON.parse((record.get("RawRow") as string) || "{}");
      const errorMsg = record.get("ErrorMessage") as string || "";
      const timestamp = record.get("Timestamp") as string || "";

      // Identify problematic column from error message or raw row
      let problematicColumn: string | undefined;

      const lowerError = errorMsg.toLowerCase();
      if (lowerError.includes("email")) {
        problematicColumn = Object.keys(rawRow).find(c => /email/i.test(c));
      } else if (lowerError.includes("phone")) {
        problematicColumn = Object.keys(rawRow).find(c => /phone|tel/i.test(c));
      } else if (lowerError.includes("missing") || lowerError.includes("required")) {
        // Find missing required field
        const requiredFields = ["firstName", "lastName", "email"];
        for (const field of requiredFields) {
          const col = Object.keys(rawRow).find(c => 
            rawRow[c] === "" || rawRow[c] === null || rawRow[c] === undefined
          );
          if (col) {
            problematicColumn = col;
            break;
          }
        }
      } else {
        // Try to infer from raw row structure
        problematicColumn = Object.keys(rawRow).find(c => !rawRow[c] || rawRow[c].trim() === "");
      }

      if (problematicColumn) {
        if (!columnErrors[problematicColumn]) {
          columnErrors[problematicColumn] = {
            count: 0,
            errorTypes: {},
            recentCount: 0,
            timestamps: []
          };
        }

        columnErrors[problematicColumn].count++;
        columnErrors[problematicColumn].timestamps.push(timestamp);

        // Categorize error type
        let errorType = "unknown";
        if (lowerError.includes("missing") || lowerError.includes("required")) {
          errorType = "missing_field";
        } else if (lowerError.includes("invalid") || lowerError.includes("format")) {
          errorType = "invalid_format";
        } else if (lowerError.includes("email")) {
          errorType = "email_validation";
        } else if (lowerError.includes("phone")) {
          errorType = "phone_validation";
        }

        columnErrors[problematicColumn].errorTypes[errorType] = 
          (columnErrors[problematicColumn].errorTypes[errorType] || 0) + 1;

        // Count recent errors
        if (recentErrors.some(e => e.id === record.id)) {
          columnErrors[problematicColumn].recentCount++;
        }
      }
    });

    // Generate predictions for columns with increasing error rates
    for (const [column, errorData] of Object.entries(columnErrors)) {
      const totalErrors = errorData.count;
      const recentErrors = errorData.recentCount;
      const olderErrors = totalErrors - recentErrors;

      // Calculate trend
      const recentRate = recentErrors / 50; // Assuming 50 recent errors checked
      const olderRate = olderErrors / 50;
      const trend = recentRate > olderRate * 1.2 ? "increasing" :
                   recentRate < olderRate * 0.8 ? "decreasing" : "stable";

      // Predict if trend is increasing
      if (trend === "increasing" && totalErrors >= 5) {
        const dominantErrorType = Object.entries(errorData.errorTypes)
          .sort((a, b) => b[1] - a[1])[0][0];

        const confidence = Math.min(0.9, 0.5 + (recentErrors / 20) * 0.4);

        predictions.push({
          column,
          tenant,
          profileKey,
          failureType: dominantErrorType,
          confidence,
          timeframe: recentErrors >= 10 ? "immediate" : "short_term",
          description: `Column '${column}' has ${recentErrors} recent errors (${totalErrors} total). Trend suggests failures will continue.`,
          historicalPattern: {
            frequency: totalErrors,
            trend,
            lastOccurrence: errorData.timestamps[0] || new Date().toISOString()
          },
          recommendedAction: `Review '${column}' mapping, add validation rule, or update profile`
        });
      }
    }

    // Analyze tenant-specific patterns
    const tenantErrorRate = errors.length / 200; // Assuming 200 max records
    if (tenantErrorRate > 0.3) {
      predictions.push({
        tenant,
        profileKey,
        failureType: "high_error_rate",
        confidence: 0.8,
        timeframe: "immediate",
        description: `Tenant '${tenant}' has high error rate (${(tenantErrorRate * 100).toFixed(1)}%). Profile may be outdated.`,
        historicalPattern: {
          frequency: errors.length,
          trend: "increasing",
          lastOccurrence: errors[0]?.get("Timestamp") as string || new Date().toISOString()
        },
        recommendedAction: `Review profile '${profileKey}' for tenant '${tenant}' or create tenant-specific profile`
      });
    }

  } catch (error) {
    console.error("[PPO] Failed to predict mapping failures:", error);
  }

  return predictions;
}
