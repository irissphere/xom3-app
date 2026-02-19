// Compliance Executor
// Executes compliance checks with UOI signal integration

import { emitComplianceSignal } from "@/lib/uoi/compliance-signal";

export interface ComplianceCheckResult {
  ruleId: string;
  tenantId: string;
  pass: boolean;
  details?: string;
  error?: string;
}

// Simple in-memory queue for compliance checks (in production, use a proper queue)
let complianceQueue: Array<{ ruleId: string; tenantId: string; data: any }> = [];

/**
 * Run a compliance check with full UOI signal integration
 * 
 * @param ruleId - The compliance rule identifier
 * @param tenantId - The tenant identifier
 * @param data - Data to check against the rule
 * @param evaluateRule - The actual rule evaluation function
 * @returns Compliance check result
 */
export async function runComplianceCheck(
  ruleId: string,
  tenantId: string,
  data: any,
  evaluateRule: (ruleId: string, data: any) => Promise<{ pass: boolean; details?: string }>
): Promise<ComplianceCheckResult> {
  try {
    // UOI: Check for queue pressure
    if (complianceQueue.length > 10) {
      emitComplianceSignal("queue_pressure", 5, {
        queueSize: complianceQueue.length
      });
    }

    const result = await evaluateRule(ruleId, data);

    if (!result.pass) {
      emitComplianceSignal("rule_violation", 8, {
        ruleId,
        tenantId,
        details: result.details
      });
    } else {
      emitComplianceSignal("rule_pass", 1, {
        ruleId,
        tenantId
      });
    }

    return {
      ruleId,
      tenantId,
      pass: result.pass,
      details: result.details
    };
  } catch (error: any) {
    emitComplianceSignal("compliance_error", 9, {
      ruleId,
      tenantId,
      error: error.message || "Compliance check failed"
    });

    return {
      ruleId,
      tenantId,
      pass: false,
      error: error.message || "Compliance check failed"
    };
  }
}

/**
 * Use a compliance override (when a rule is bypassed with authorization)
 * 
 * @param ruleId - The rule being overridden
 * @param tenantId - The tenant identifier
 * @param reason - Reason for the override
 * @param authorizedBy - Who authorized the override
 */
export function useComplianceOverride(
  ruleId: string,
  tenantId: string,
  reason: string,
  authorizedBy: string
): void {
  emitComplianceSignal("override_used", 6, {
    ruleId,
    tenantId,
    reason,
    authorizedBy
  });
}

/**
 * Get current compliance queue size
 */
export function getComplianceQueueSize(): number {
  return complianceQueue.length;
}
