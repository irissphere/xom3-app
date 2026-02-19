// PPO Orchestrator
// Coordinates all prediction strikes

import { PPOPrediction } from "./types";
import { predictSchemaDrift } from "./schema-drift-predictor";
import { predictMappingFailures } from "./failure-predictor";
import { predictWorkflowBottlenecks } from "./bottleneck-predictor";
import { predictErrorSpikes } from "./error-spike-predictor";
import { predictOptimalProfile } from "./profile-predictor";
import { predictThroughput } from "./throughput-predictor";
import { predictTenantIssues } from "./tenant-predictor";
import { generatePreventativeActions } from "./preventative-actions";
import { generatePredictionSummary } from "./explainer";
import { emitAnalyticsSignal } from "../../uoi/analytics-signal";

/**
 * Run complete PPO prediction cycle
 */
export async function runPPO(
  pipelineId: string,
  tenant: string,
  profileKey: string,
  incomingColumns?: string[],
  estimatedRows?: number
): Promise<PPOPrediction> {
  const prediction: PPOPrediction = {
    overallRisk: "low",
    summary: ""
  };

  try {
    // Run all predictors in parallel
    const [
      schemaDrift,
      failures,
      bottlenecks,
      errorSpikes,
      throughput,
      tenantIssues
    ] = await Promise.all([
      predictSchemaDrift(pipelineId, tenant, profileKey),
      predictMappingFailures(pipelineId, tenant, profileKey),
      predictWorkflowBottlenecks(pipelineId, tenant),
      predictErrorSpikes(pipelineId, tenant),
      predictThroughput(pipelineId, tenant, estimatedRows),
      predictTenantIssues(tenant)
    ]);

    prediction.schemaDrift = schemaDrift;
    prediction.failures = failures;
    prediction.bottlenecks = bottlenecks;
    prediction.errorSpikes = errorSpikes;
    prediction.throughput = throughput ? [throughput] : undefined;
    prediction.tenantIssues = tenantIssues;

    // Predict optimal profile if columns provided
    if (incomingColumns && incomingColumns.length > 0) {
      const profilePrediction = await predictOptimalProfile(tenant, profileKey, incomingColumns);
      if (profilePrediction) {
        prediction.profiles = [profilePrediction];
      }
    }

    // Generate preventative actions
    const actions = generatePreventativeActions(prediction);
    prediction.preventativeActions = actions;

    // Calculate overall risk
    const criticalCount = [
      ...(schemaDrift.filter(d => d.confidence >= 0.9 && d.timeframe === "immediate")),
      ...(failures.filter(f => f.confidence >= 0.9 && f.timeframe === "immediate")),
      ...(errorSpikes.filter(e => e.confidence >= 0.9 && e.increasePercentage > 50))
    ].length;

    const highCount = [
      ...(schemaDrift.filter(d => d.confidence >= 0.8)),
      ...(failures.filter(f => f.confidence >= 0.8)),
      ...(bottlenecks.filter(b => b.confidence >= 0.8)),
      ...(errorSpikes.filter(e => e.confidence >= 0.8))
    ].length;

    if (criticalCount > 0) {
      prediction.overallRisk = "critical";
    } else if (highCount >= 3) {
      prediction.overallRisk = "high";
    } else if (highCount >= 1) {
      prediction.overallRisk = "medium";
    }

    // UOI: Emit prediction risk signal
    if (prediction.overallRisk === "critical" || prediction.overallRisk === "high") {
      emitAnalyticsSignal("prediction_risk", prediction.overallRisk === "critical" ? 9 : 8, {
        model: "ppo",
        riskScore: prediction.overallRisk === "critical" ? 0.9 : 0.7,
        context: {
          pipelineId,
          tenant,
          criticalCount,
          highCount
        }
      });
    }

    // UOI: Emit model drift signal if schema drift detected
    if (schemaDrift.length > 0) {
      const highConfidenceDrift = schemaDrift.filter(d => d.confidence >= 0.8);
      if (highConfidenceDrift.length > 0) {
        emitAnalyticsSignal("model_drift", 6, {
          model: "schema_drift_predictor",
          driftAmount: highConfidenceDrift.length / schemaDrift.length
        });
      }
    }

    // UOI: Emit trend detected signals
    if (errorSpikes.length > 0) {
      const significantSpikes = errorSpikes.filter(e => e.increasePercentage > 30);
      significantSpikes.forEach(spike => {
        emitAnalyticsSignal("trend_detected", 4, {
          metric: "error_spike",
          direction: "increasing",
          magnitude: spike.increasePercentage
        });
      });
    }

    // UOI: Emit anomaly signals for tenant issues
    if (tenantIssues && tenantIssues.length > 0) {
      tenantIssues.forEach(issue => {
        emitAnalyticsSignal("anomaly", 7, {
          metric: "tenant_health",
          value: issue.confidence,
          expected: "normal"
        });
      });
    }

    // Generate summary
    const summary = generatePredictionSummary(prediction);
    prediction.summary = summary;

  } catch (error: any) {
    console.error("[PPO] Prediction cycle failed:", error);
    prediction.summary = "Prediction cycle encountered an error (see logs)";
    
    // UOI: Emit model error signal
    emitAnalyticsSignal("model_error", 9, {
      model: "ppo",
      error: error.message || "Prediction cycle failed"
    });
  }

  return prediction;
}
