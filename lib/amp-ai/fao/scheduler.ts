// STRIKE 3: Autonomous Scheduling
// Decides when pipelines should run, pause, accelerate, retry, back off

import { AutonomousSchedule } from "./types";
import type { PipelineAgent } from "./types";
import Airtable from "airtable";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY || "MISSING_AIRTABLE_API_KEY" })
  .base(process.env.AIRTABLE_USHA_BASE_ID || "");

/**
 * Determine autonomous schedule for pipeline
 */
export async function determineSchedule(
  agent: PipelineAgent,
  context: {
    load?: number;
    drift?: boolean;
    errors?: number;
    predictions?: any;
    currentTime?: Date;
  }
): Promise<AutonomousSchedule> {
  const factors: Array<{ factor: string; impact: "positive" | "negative" | "neutral"; description: string }> = [];
  let schedule: "immediate" | "delayed" | "paused" | "accelerated" | "backoff" = "immediate";
  let reason = "Normal execution schedule";
  let confidence = 0.7;

  // Agent paused → do not schedule runs.
  if (agent.state === "paused") {
    schedule = "paused";
    reason = "Agent is paused";
    confidence = 0.95;
    factors.push({
      factor: "Agent State",
      impact: "neutral",
      description: "Agent is paused; no runs will be scheduled",
    });
  }

  // Check load
  const load = context.load || 0;
  if (schedule !== "paused" && load > 0.8) {
    schedule = "backoff";
    reason = "High system load detected, backing off";
    confidence = 0.9;
    factors.push({
      factor: "System Load",
      impact: "negative",
      description: `Load at ${(load * 100).toFixed(0)}%, above 80% threshold`
    });
  } else if (schedule !== "paused" && load > 0.6) {
    schedule = "delayed";
    reason = "Moderate system load detected, delaying execution";
    confidence = 0.75;
    factors.push({
      factor: "System Load",
      impact: "neutral",
      description: `Load at ${(load * 100).toFixed(0)}%, delaying to reduce contention`,
    });
  } else if (schedule !== "paused" && load < 0.3) {
    schedule = "accelerated";
    reason = "Low system load, accelerating execution";
    confidence = 0.8;
    factors.push({
      factor: "System Load",
      impact: "positive",
      description: `Load at ${(load * 100).toFixed(0)}%, below 30% threshold`
    });
  }

  // Check drift
  if (context.drift) {
    schedule = "immediate";
    reason = "Schema drift detected, immediate execution needed";
    confidence = 0.85;
    factors.push({
      factor: "Schema Drift",
      impact: "negative",
      description: "Schema changes detected, need immediate response"
    });
  }

  // Check errors
  const errorRate = context.errors || 0;
  if (errorRate > 0.3) {
    schedule = "backoff";
    reason = `High error rate (${(errorRate * 100).toFixed(1)}%), backing off`;
    confidence = 0.9;
    factors.push({
      factor: "Error Rate",
      impact: "negative",
      description: `Error rate at ${(errorRate * 100).toFixed(1)}%, above 30% threshold`
    });
  } else if (errorRate < 0.05 && schedule === "immediate") {
    schedule = "accelerated";
    reason = "Low error rate, accelerating execution";
    confidence = 0.75;
    factors.push({
      factor: "Error Rate",
      impact: "positive",
      description: `Error rate at ${(errorRate * 100).toFixed(1)}%, below 5% threshold`
    });
  }

  // Check predictions
  if (context.predictions) {
    const risk = context.predictions.overallRisk;
    if (risk === "critical" || risk === "high") {
      schedule = "immediate";
      reason = `High risk prediction (${risk}), immediate execution needed`;
      confidence = 0.85;
      factors.push({
        factor: "PPO Prediction",
        impact: "negative",
        description: `Predicted risk level: ${risk}`
      });
    }
  }

  // Calculate next run time
  const currentTime = context.currentTime || new Date();
  let nextRun: string | undefined;

  switch (schedule) {
    case "immediate":
      nextRun = currentTime.toISOString();
      break;
    case "accelerated":
      nextRun = new Date(currentTime.getTime() + 5 * 60 * 1000).toISOString(); // 5 min
      break;
    case "delayed":
      nextRun = new Date(currentTime.getTime() + 30 * 60 * 1000).toISOString(); // 30 min
      break;
    case "backoff":
      nextRun = new Date(currentTime.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour
      break;
    case "paused":
      nextRun = undefined;
      break;
  }

  return {
    pipelineId: agent.pipelineId,
    tenant: agent.tenant,
    nextRun,
    schedule,
    reason,
    confidence,
    factors
  };
}
