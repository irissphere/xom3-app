// STRIKE 9: Predictive Explanations (The Oracle Layer)
// Generates human-readable explanations for all predictions

import { PredictionExplanation, PPOPrediction } from "./types";

/**
 * Explain a prediction
 */
export function explainPrediction(
  predictionType: string,
  prediction: any,
  confidence: number,
  basis: string,
  timeframe: string
): PredictionExplanation {
  let explanation = "";
  let recommendedAction = "";

  switch (predictionType) {
    case "schema_drift":
      explanation = `Based on ${basis}, column '${prediction.column}' is ${prediction.type === "new_column" ? "likely to be added" : prediction.type === "missing_column" ? "likely to be removed" : "drifting toward a new type"}`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "failure":
      explanation = `Based on ${basis}, column '${prediction.column || "unknown"}' is likely to fail with ${prediction.failureType} errors. Historical pattern shows ${prediction.historicalPattern.trend} trend with ${prediction.historicalPattern.frequency} occurrences.`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "bottleneck":
      explanation = `Based on ${basis}, workflow '${prediction.workflowName}' will experience a ${prediction.bottleneckType} bottleneck. Current metrics: ${(prediction.currentMetrics.avgExecutionTime / 1000).toFixed(1)}s avg execution, ${(prediction.currentMetrics.failureRate * 100).toFixed(1)}% failure rate.`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "error_spike":
      explanation = `Based on ${basis}, error rate will spike by ${prediction.increasePercentage.toFixed(1)}% (from ${(prediction.currentErrorRate * 100).toFixed(1)}% to ${(prediction.predictedErrorRate * 100).toFixed(1)}%) due to ${prediction.source}.`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "profile":
      explanation = `Based on ${basis}, profile '${prediction.suggestedProfile}' is now a better match (${(prediction.confidence * 100).toFixed(0)}% confidence) than current profile '${prediction.currentProfile}'. ${prediction.driftDetected ? "Drift detected." : ""}`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "throughput":
      explanation = `Based on ${basis}, pipeline will process ${prediction.predictedRows} rows in ${(prediction.predictedTotalTime / 1000 / 60).toFixed(1)} minutes at ${prediction.predictedRowsPerSecond.toFixed(1)} rows/second.`;
      recommendedAction = prediction.recommendedAction;
      break;

    case "tenant_issue":
      explanation = `Based on ${basis}, tenant '${prediction.tenant}' will experience ${prediction.issueType} issues. Indicators: ${prediction.indicators.join(", ")}.`;
      recommendedAction = prediction.recommendedAction;
      break;

    default:
      explanation = `Prediction: ${JSON.stringify(prediction)}`;
      recommendedAction = "Review prediction details";
  }

  return {
    predictionType,
    prediction,
    confidence,
    basis,
    timeframe,
    explanation,
    recommendedAction
  };
}

/**
 * Generate comprehensive prediction summary
 */
export function generatePredictionSummary(predictions: PPOPrediction): string {
  const parts: string[] = [];

  // Overall risk assessment
  parts.push(`[PPO Oracle] Overall Risk: ${predictions.overallRisk.toUpperCase()}`);
  parts.push("");

  // Schema drift predictions
  if (predictions.schemaDrift && predictions.schemaDrift.length > 0) {
    parts.push("📊 Schema Drift Predictions:");
    predictions.schemaDrift.forEach(drift => {
      parts.push(`  • ${drift.description} (${(drift.confidence * 100).toFixed(0)}% confidence, ${drift.timeframe})`);
      parts.push(`    → ${drift.recommendedAction}`);
    });
    parts.push("");
  }

  // Failure predictions
  if (predictions.failures && predictions.failures.length > 0) {
    parts.push("⚠️ Failure Predictions:");
    predictions.failures.forEach(failure => {
      parts.push(`  • ${failure.description} (${(failure.confidence * 100).toFixed(0)}% confidence, ${failure.timeframe})`);
      parts.push(`    → ${failure.recommendedAction}`);
    });
    parts.push("");
  }

  // Bottleneck predictions
  if (predictions.bottlenecks && predictions.bottlenecks.length > 0) {
    parts.push("🚧 Bottleneck Predictions:");
    predictions.bottlenecks.forEach(bottleneck => {
      parts.push(`  • ${bottleneck.workflowName}: ${bottleneck.bottleneckType} bottleneck predicted at ${new Date(bottleneck.predictedTime).toLocaleString()} (${(bottleneck.confidence * 100).toFixed(0)}% confidence)`);
      parts.push(`    → ${bottleneck.recommendedAction}`);
    });
    parts.push("");
  }

  // Error spike predictions
  if (predictions.errorSpikes && predictions.errorSpikes.length > 0) {
    parts.push("📈 Error Spike Predictions:");
    predictions.errorSpikes.forEach(spike => {
      parts.push(`  • ${spike.description} (${(spike.confidence * 100).toFixed(0)}% confidence)`);
      parts.push(`    → ${spike.recommendedAction}`);
    });
    parts.push("");
  }

  // Profile predictions
  if (predictions.profiles && predictions.profiles.length > 0) {
    parts.push("🔀 Profile Predictions:");
    predictions.profiles.forEach(profile => {
      parts.push(`  • ${profile.reason} (${(profile.confidence * 100).toFixed(0)}% confidence)`);
      parts.push(`    → ${profile.recommendedAction}`);
    });
    parts.push("");
  }

  // Throughput predictions
  if (predictions.throughput && predictions.throughput.length > 0) {
    parts.push("⚡ Throughput Predictions:");
    predictions.throughput.forEach(throughput => {
      parts.push(`  • Pipeline ${throughput.pipelineId}: ${(throughput.predictedTotalTime / 1000 / 60).toFixed(1)} min for ${throughput.predictedRows} rows`);
      parts.push(`    → ${throughput.recommendedAction}`);
    });
    parts.push("");
  }

  // Tenant issue predictions
  if (predictions.tenantIssues && predictions.tenantIssues.length > 0) {
    parts.push("👤 Tenant Issue Predictions:");
    predictions.tenantIssues.forEach(issue => {
      parts.push(`  • ${issue.description} (${(issue.confidence * 100).toFixed(0)}% confidence, ${issue.timeframe})`);
      parts.push(`    → ${issue.recommendedAction}`);
    });
    parts.push("");
  }

  // Preventative actions
  if (predictions.preventativeActions && predictions.preventativeActions.length > 0) {
    const autoActions = predictions.preventativeActions.filter(a => a.autoTrigger);
    const manualActions = predictions.preventativeActions.filter(a => !a.autoTrigger);

    if (autoActions.length > 0) {
      parts.push("🤖 Auto-Triggered Preventative Actions:");
      autoActions.forEach(action => {
        parts.push(`  • ${action.reason} (${(action.confidence * 100).toFixed(0)}% confidence)`);
      });
      parts.push("");
    }

    if (manualActions.length > 0) {
      parts.push("👁️ Recommended Actions (Review Required):");
      manualActions.forEach(action => {
        parts.push(`  • ${action.reason} (${(action.confidence * 100).toFixed(0)}% confidence)`);
      });
      parts.push("");
    }
  }

  // Summary
  if (predictions.summary) {
    parts.push("📋 Summary:");
    parts.push(`  ${predictions.summary}`);
  }

  return parts.join("\n");
}
