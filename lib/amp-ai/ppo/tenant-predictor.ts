// STRIKE 7: Predict Tenant-Specific Issues
// Learns tenant patterns and predicts issues

import { TenantIssuePrediction } from "./types";
import { getAirtableBase } from "../../airtable/client";

/**
 * Predict tenant-specific issues
 */
export async function predictTenantIssues(
  tenant: string
): Promise<TenantIssuePrediction[]> {
  const predictions: TenantIssuePrediction[] = [];

  try {
    const base = await getAirtableBase();
    // Load all pipeline executions for tenant
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 10) {
      return predictions;
    }

    // Analyze error patterns
    const errorTable = base("AMP Errors");
    const errors = await errorTable.select({
      filterByFormula: `{Tenant} = "${tenant}"`,
      maxRecords: 200,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    const errorRate = errors.length / records.length;
    const recentErrors = errors.slice(0, 50).length;
    const olderErrors = errors.slice(50, 100).length;

    // Predict mapping drift
    if (errorRate > 0.2 && recentErrors > olderErrors * 1.3) {
      predictions.push({
        tenant,
        issueType: "mapping_drift",
        confidence: 0.75,
        timeframe: "short_term",
        description: `Tenant '${tenant}' has ${(errorRate * 100).toFixed(1)}% error rate with increasing trend. Mapping profile may be drifting.`,
        indicators: [
          `${(errorRate * 100).toFixed(1)}% error rate`,
          `${recentErrors} recent errors vs ${olderErrors} older errors`,
          "Trend suggests profile mismatch"
        ],
        recommendedAction: `Review and update mapping profile for tenant '${tenant}' or create tenant-specific profile`
      });
    }

    // Analyze schema drift signals
    const signalsTable = base("AMP Evolution Signals");
    const driftSignals = await signalsTable.select({
      filterByFormula: `AND({Type} = "drift", {Tenant} = "${tenant}")`,
      maxRecords: 50,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (driftSignals.length >= 5) {
      const newColumns = driftSignals.filter(s => {
        const metadata = JSON.parse((s.get("Metadata") as string) || "{}");
        return metadata.driftType === "new_column";
      }).length;

      if (newColumns >= 3) {
        predictions.push({
          tenant,
          issueType: "schema_change",
          confidence: 0.7,
          timeframe: "short_term",
          description: `Tenant '${tenant}' has ${newColumns} new columns detected. Schema is evolving.`,
          indicators: [
            `${newColumns} new columns detected`,
            `${driftSignals.length} total drift signals`,
            "Schema structure is changing"
          ],
          recommendedAction: `Update mapping profile for tenant '${tenant}' to include new columns`
        });
      }
    }

    // Analyze workflow failures
    const workflowFailures = records.filter(r => {
      const status = r.get("Status") as string;
      return status === "error" || status === "partial";
    }).length;

    const workflowFailureRate = workflowFailures / records.length;

    if (workflowFailureRate > 0.15) {
      predictions.push({
        tenant,
        issueType: "workflow_failure",
        confidence: 0.7,
        timeframe: "immediate",
        description: `Tenant '${tenant}' has ${(workflowFailureRate * 100).toFixed(1)}% workflow failure rate.`,
        indicators: [
          `${workflowFailures} failed workflows out of ${records.length} total`,
          `${(workflowFailureRate * 100).toFixed(1)}% failure rate`
        ],
        recommendedAction: `Review workflow configuration and data quality for tenant '${tenant}'`
      });
    }

  } catch (error) {
    console.error("[PPO] Failed to predict tenant issues:", error);
  }

  return predictions;
}
