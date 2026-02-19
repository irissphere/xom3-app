// STRIKE 2: Define Rewrite Triggers
// Determines when APR should rewrite pipelines

import { RewriteTrigger, RewriteSuggestion } from "./types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Check if schema drift should trigger rewrite
 */
export async function checkSchemaDriftTrigger(
  pipelineId: string,
  tenant: string
): Promise<RewriteSuggestion | null> {
  try {
    const signalsTable = base("AMP Evolution Signals");
    const driftSignals = await signalsTable.select({
      filterByFormula: `AND({Type} = "drift", {PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (driftSignals.length >= 3) {
      const newColumns = driftSignals.filter(s => {
        const metadata = JSON.parse((s.get("Metadata") as string) || "{}");
        return metadata.driftType === "new_column";
      }).length;

      if (newColumns >= 2) {
        return {
          trigger: "schema_drift",
          changes: [{
            type: "add_stage",
            stage: "ai_detect",
            position: 1,
            reason: `${newColumns} new columns detected. Add AI detection stage to handle schema changes.`,
            confidence: 0.8
          }],
          confidence: 0.8,
          reason: "Schema drift detected with new columns",
          impact: "high",
          explanation: `Detected ${newColumns} new columns in recent runs. Pipeline should add AI detection stage to handle schema changes automatically.`
        };
      }
    }

    return null;
  } catch (error) {
    console.error("[APR] Failed to check schema drift trigger:", error);
    return null;
  }
}

/**
 * Check if repeated errors should trigger rewrite
 */
export async function checkRepeatedErrorsTrigger(
  pipelineId: string,
  tenant: string
): Promise<RewriteSuggestion | null> {
  try {
    const errorTable = base("AMP Errors");
    const errors = await errorTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 100,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (errors.length < 10) {
      return null;
    }

    // Analyze error patterns
    const errorTypes: Record<string, number> = {};
    errors.forEach(record => {
      const errorMsg = (record.get("ErrorMessage") as string || "").toLowerCase();
      let errorType = "unknown";
      
      if (errorMsg.includes("missing") || errorMsg.includes("required")) {
        errorType = "missing_field";
      } else if (errorMsg.includes("invalid") || errorMsg.includes("format")) {
        errorType = "invalid_format";
      } else if (errorMsg.includes("email")) {
        errorType = "email_validation";
      } else if (errorMsg.includes("phone")) {
        errorType = "phone_validation";
      }

      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    // Check if we need pre-clean stage
    const formatErrors = (errorTypes["invalid_format"] || 0) + 
                        (errorTypes["email_validation"] || 0) + 
                        (errorTypes["phone_validation"] || 0);

    if (formatErrors >= 20) {
      return {
        trigger: "repeated_errors",
        changes: [{
          type: "add_stage",
          stage: "pre_clean",
          position: 1,
          reason: `${formatErrors} format errors detected. Add pre-clean stage to normalize data.`,
          confidence: 0.85
        }],
        confidence: 0.85,
        reason: "Repeated format errors detected",
        impact: "high",
        explanation: `Detected ${formatErrors} format validation errors. Pipeline should add pre-clean stage before transformation to normalize data.`
      };
    }

    // Check if we need fallback logic
    const missingFieldErrors = errorTypes["missing_field"] || 0;
    if (missingFieldErrors >= 15) {
      return {
        trigger: "repeated_errors",
        changes: [{
          type: "modify_stage",
          stage: "transform",
          reason: `${missingFieldErrors} missing field errors. Add fallback logic to handle missing fields.`,
          confidence: 0.8
        }],
        confidence: 0.8,
        reason: "Repeated missing field errors",
        impact: "medium",
        explanation: `Detected ${missingFieldErrors} missing field errors. Pipeline should add fallback logic to handle missing required fields.`
      };
    }

    return null;
  } catch (error) {
    console.error("[APR] Failed to check repeated errors trigger:", error);
    return null;
  }
}

/**
 * Check if tenant behavior should trigger rewrite
 */
export async function checkTenantBehaviorTrigger(
  pipelineId: string,
  tenant: string
): Promise<RewriteSuggestion | null> {
  try {
    const signalsTable = base("AMP Evolution Signals");
    const overrides = await signalsTable.select({
      filterByFormula: `AND({Type} = "tenant_override", {PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (overrides.length >= 5) {
      return {
        trigger: "tenant_behavior",
        changes: [{
          type: "modify_stage",
          stage: "transform",
          reason: `${overrides.length} tenant overrides detected. Update transformation rules to match tenant behavior.`,
          confidence: 0.75
        }],
        confidence: 0.75,
        reason: "Tenant behavior patterns detected",
        impact: "medium",
        explanation: `Detected ${overrides.length} tenant-specific mapping overrides. Pipeline should update transformation rules to match tenant behavior.`
      };
    }

    return null;
  } catch (error) {
    console.error("[APR] Failed to check tenant behavior trigger:", error);
    return null;
  }
}

/**
 * Check if workflow bottleneck should trigger rewrite
 */
export async function checkWorkflowBottleneckTrigger(
  pipelineId: string,
  tenant: string
): Promise<RewriteSuggestion | null> {
  try {
    const historyTable = base("AMP History");
    const records = await historyTable.select({
      filterByFormula: `AND({PipelineID} = "${pipelineId}", {Tenant} = "${tenant}")`,
      maxRecords: 20,
      sort: [{ field: "Timestamp", direction: "desc" }]
    }).all();

    if (records.length < 5) {
      return null;
    }

    const executionTimes = records.map(r => (r.get("ExecutionTime") as number) || 0);
    const recentAvg = executionTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const olderAvg = executionTimes.slice(5, 10).length > 0
      ? executionTimes.slice(5, 10).reduce((a, b) => a + b, 0) / 5
      : recentAvg;

    // If execution time increased significantly
    if (recentAvg > olderAvg * 1.5 && recentAvg > 10000) {
      return {
        trigger: "workflow_bottleneck",
        changes: [{
          type: "reorder_stage",
          stage: "validate",
          oldPosition: 2,
          newPosition: 1,
          reason: `Execution time increased from ${(olderAvg / 1000).toFixed(1)}s to ${(recentAvg / 1000).toFixed(1)}s. Reorder validation before transformation to fail fast.`,
          confidence: 0.7
        }],
        confidence: 0.7,
        reason: "Workflow bottleneck detected",
        impact: "medium",
        explanation: `Execution time increased significantly. Pipeline should reorder stages to validate before transformation for better performance.`
      };
    }

    return null;
  } catch (error) {
    console.error("[APR] Failed to check workflow bottleneck trigger:", error);
    return null;
  }
}

/**
 * Check if PPO prediction should trigger rewrite
 */
export async function checkPPOPredictionTrigger(
  pipelineId: string,
  tenant: string,
  ppoPredictions: any
): Promise<RewriteSuggestion | null> {
  if (!ppoPredictions || !ppoPredictions.predictions) {
    return null;
  }

  const predictions = ppoPredictions.predictions;

  // Check for high-risk predictions
  if (predictions.overallRisk === "critical" || predictions.overallRisk === "high") {
    const changes: any[] = [];

    // Add pre-clean if failures predicted
    if (predictions.failures && predictions.failures.length > 0) {
      const highConfidenceFailures = predictions.failures.filter((f: any) => f.confidence >= 0.8);
      if (highConfidenceFailures.length > 0) {
        changes.push({
          type: "add_stage",
          stage: "pre_clean",
          position: 1,
          reason: `PPO predicts ${highConfidenceFailures.length} failures. Add pre-clean stage.`,
          confidence: 0.85
        });
      }
    }

    // Add AI detection if schema drift predicted
    if (predictions.schemaDrift && predictions.schemaDrift.length > 0) {
      const highConfidenceDrift = predictions.schemaDrift.filter((d: any) => d.confidence >= 0.8);
      if (highConfidenceDrift.length > 0) {
        changes.push({
          type: "add_stage",
          stage: "ai_detect",
          position: 1,
          reason: `PPO predicts ${highConfidenceDrift.length} schema drifts. Add AI detection stage.`,
          confidence: 0.8
        });
      }
    }

    if (changes.length > 0) {
      return {
        trigger: "ppo_prediction",
        changes,
        confidence: 0.8,
        reason: "PPO predictions indicate high risk",
        impact: "high",
        explanation: `PPO predicts ${predictions.overallRisk} risk. Pipeline should be rewritten to prevent predicted issues.`
      };
    }
  }

  return null;
}

/**
 * Evaluate all rewrite triggers
 */
export async function evaluateRewriteTriggers(
  pipelineId: string,
  tenant: string,
  ppoPredictions?: any
): Promise<RewriteSuggestion[]> {
  const suggestions: RewriteSuggestion[] = [];

  const [
    schemaDrift,
    repeatedErrors,
    tenantBehavior,
    workflowBottleneck,
    ppoPrediction
  ] = await Promise.all([
    checkSchemaDriftTrigger(pipelineId, tenant),
    checkRepeatedErrorsTrigger(pipelineId, tenant),
    checkTenantBehaviorTrigger(pipelineId, tenant),
    checkWorkflowBottleneckTrigger(pipelineId, tenant),
    ppoPredictions ? checkPPOPredictionTrigger(pipelineId, tenant, ppoPredictions) : Promise.resolve(null)
  ]);

  if (schemaDrift) suggestions.push(schemaDrift);
  if (repeatedErrors) suggestions.push(repeatedErrors);
  if (tenantBehavior) suggestions.push(tenantBehavior);
  if (workflowBottleneck) suggestions.push(workflowBottleneck);
  if (ppoPrediction) suggestions.push(ppoPrediction);

  // Sort by confidence and impact
  return suggestions.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    if (impactOrder[b.impact] !== impactOrder[a.impact]) {
      return impactOrder[b.impact] - impactOrder[a.impact];
    }
    return b.confidence - a.confidence;
  });
}
