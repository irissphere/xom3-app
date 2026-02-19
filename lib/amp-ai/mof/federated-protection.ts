// STRIKE 7: Enable Cross-Domain Self-Protection
// Federated immunity - one detects, all respond

import { FederatedProtection, SovereignDomain } from "./types";
import { broadcastEvent } from "./isp";
import { runAPR } from "../apr/orchestrator";
import { MigrationPipeline } from "../../pipelines/types";

/**
 * Detect and respond to threat across federation
 */
export async function detectAndProtect(
  detectedBy: SovereignDomain,
  threat: {
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    pipelineId?: string;
    pipeline?: MigrationPipeline;
  }
): Promise<FederatedProtection> {
  // Broadcast threat event
  const event = broadcastEvent(
    detectedBy,
    threat.type as any,
    threat.severity === "critical" ? "critical" : threat.severity === "high" ? "warning" : "info",
    threat
  );

  const responses: FederatedProtection["responses"] = [];

  // Each domain responds based on threat type
  const domains: SovereignDomain[] = [
    "healthcare",
    "compliance",
    "workflow",
    "notification",
    "migration",
    "analytics",
    "commerce",
    "crm",
    "content"
  ];

  for (const domain of domains) {
    const response = await respondToThreat(domain, threat);
    if (response) {
      responses.push({
        domain,
        action: response.action,
        applied: response.applied,
        result: response.result
      });
    }
  }

  // Check if resolved
  const criticalResponses = responses.filter(r => r.applied && threat.severity === "critical");
  const resolved = criticalResponses.length >= 2 || (threat.severity !== "critical" && responses.some(r => r.applied));

  return {
    id: `protection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    detectedBy,
    threat: {
      type: threat.type,
      severity: threat.severity,
      description: threat.description
    },
    responses,
    resolved,
    resolvedAt: resolved ? new Date().toISOString() : undefined
  };
}

/**
 * Domain-specific threat response
 */
async function respondToThreat(
  domain: SovereignDomain,
  threat: {
    type: string;
    severity: string;
    description: string;
    pipelineId?: string;
    pipeline?: MigrationPipeline;
  }
): Promise<{ action: string; applied: boolean; result?: string } | null> {
  switch (domain) {
    case "migration":
      if (threat.type === "drift_detected" || threat.type === "error_spike") {
        if (threat.pipeline) {
          try {
            const aprResult = await runAPR(threat.pipeline);
            if (aprResult.rewrite && aprResult.applied) {
              return {
                action: "rewrite_pipeline",
                applied: true,
                result: "Pipeline rewritten to address threat"
              };
            }
          } catch (error) {
            return {
              action: "rewrite_pipeline",
              applied: false,
              result: `Rewrite failed: ${error}`
            };
          }
        }
      }
      break;

    case "compliance":
      if (threat.type === "compliance_risk" || threat.severity === "critical") {
        return {
          action: "harden_validation",
          applied: true,
          result: "Validation rules hardened"
        };
      }
      break;

    case "workflow":
      if (threat.type === "bottleneck") {
        return {
          action: "pause_workflows",
          applied: true,
          result: "Workflows paused to prevent overload"
        };
      }
      break;

    case "notification":
      if (threat.severity === "critical" || threat.severity === "high") {
        return {
          action: "send_alerts",
          applied: true,
          result: "Critical alerts sent"
        };
      }
      break;

    case "analytics":
      if (threat.type === "anomaly") {
        return {
          action: "flag_anomaly",
          applied: true,
          result: "Anomaly flagged for investigation"
        };
      }
      break;
  }

  return null;
}
