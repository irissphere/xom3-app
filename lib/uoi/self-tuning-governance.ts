// UOI Self-Tuning Governance - UOI rewrites its own rules
// Evolution mode: Governance rules adapt based on patterns

import { isEvolutionActive, recordRuleEvolution, applyRuleEvolution } from "./evolution";
import { getAllRules, getRule, setRuleEnabled } from "./governance";
import { getRecurringPatterns } from "./memory";
import { getGlobalRule, updateGlobalRule } from "./sovereign";
import { isSovereignActive } from "./sovereign";

export interface RuleProposal {
  ruleId: string;
  ruleName: string;
  currentValue: number | string;
  proposedValue: number | string;
  reason: string;
  confidence: number;
  basedOn: string[];
}

/**
 * Analyze rules for evolution opportunities
 * EVOLUTION MODE: Proposes rule adjustments based on patterns
 */
export function analyzeRulesForEvolution(): RuleProposal[] {
  if (!isEvolutionActive()) {
    return [];
  }
  
  const proposals: RuleProposal[] = [];
  const recurringPatterns = getRecurringPatterns(3); // Patterns that occur 3+ times
  
  // Analyze each rule
  const rules = getAllRules();
  
  rules.forEach(rule => {
    // Check if rule is related to recurring patterns
    const relatedPatterns = recurringPatterns.filter(p => 
      p.pattern.toLowerCase().includes(rule.name.toLowerCase()) ||
      rule.name.toLowerCase().includes(p.pattern.toLowerCase())
    );
    
    if (relatedPatterns.length > 0) {
      // Propose adjustment based on patterns
      const proposal = proposeRuleAdjustment(rule, relatedPatterns);
      if (proposal) {
        proposals.push(proposal);
      }
    }
  });
  
  // Also analyze global rules if sovereign mode is active
  if (isSovereignActive()) {
    const globalRuleDomains: Array<"error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit"> = [
      "error_budget",
      "throughput_floor",
      "drift_tolerance",
      "queue_limit"
    ];
    
    globalRuleDomains.forEach(domain => {
      const globalRule = getGlobalRule(domain);
      if (globalRule) {
        const relatedPatterns = recurringPatterns.filter(p => 
          p.pattern.toLowerCase().includes(domain) ||
          p.prediction.toLowerCase().includes(domain)
        );
        
        if (relatedPatterns.length > 0) {
          const proposal = proposeGlobalRuleAdjustment(domain, globalRule, relatedPatterns);
          if (proposal) {
            proposals.push(proposal);
          }
        }
      }
    });
  }
  
  return proposals;
}

/**
 * Propose rule adjustment based on patterns
 */
function proposeRuleAdjustment(rule: any, patterns: any[]): RuleProposal | null {
  // Analyze patterns to determine if threshold should be adjusted
  let adjustment = 0;
  let reason = "";
  const basedOn: string[] = [];
  
  patterns.forEach(pattern => {
    basedOn.push(pattern.pattern);
    
    // If pattern predicts failures and rule is error-related, tighten threshold
    if (pattern.prediction.includes("failure") || pattern.prediction.includes("error")) {
      if (rule.id.includes("error") || rule.id.includes("threshold")) {
        adjustment -= 0.05; // Tighten by 5%
        reason = `Recurring failure pattern detected (${pattern.frequency} occurrences). Tightening threshold to prevent failures.`;
      }
    }
    
    // If pattern shows high frequency but no failures, can relax threshold slightly
    if (pattern.frequency > 10 && !pattern.prediction.includes("failure")) {
      if (rule.id.includes("queue") || rule.id.includes("throughput")) {
        adjustment += 0.02; // Relax by 2%
        reason = `High-frequency pattern (${pattern.frequency} occurrences) with no failures. Slightly relaxing threshold for efficiency.`;
      }
    }
  });
  
  if (Math.abs(adjustment) < 0.01) {
    return null; // No significant adjustment needed
  }
  
  const currentValue = typeof rule.threshold === "number" ? rule.threshold : parseFloat(rule.threshold) || 0;
  const proposedValue = Math.max(0, Math.min(1, currentValue + adjustment));
  
  if (Math.abs(proposedValue - currentValue) < 0.01) {
    return null; // Change too small
  }
  
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    currentValue,
    proposedValue,
    reason: reason || `Pattern-based adjustment: ${adjustment > 0 ? "relax" : "tighten"} threshold`,
    confidence: Math.min(0.9, patterns.length * 0.15), // Higher confidence with more patterns
    basedOn,
  };
}

/**
 * Propose global rule adjustment
 */
function proposeGlobalRuleAdjustment(
  domain: "error_budget" | "throughput_floor" | "drift_tolerance" | "queue_limit",
  globalRule: any,
  patterns: any[]
): RuleProposal | null {
  let adjustment = 0;
  let reason = "";
  const basedOn: string[] = [];
  
  patterns.forEach(pattern => {
    basedOn.push(pattern.pattern);
    
    if (pattern.prediction.includes("failure") || pattern.prediction.includes("error")) {
      if (domain === "error_budget") {
        adjustment -= 0.01; // Tighten error budget
        reason = `Recurring error pattern. Tightening global error budget.`;
      } else if (domain === "drift_tolerance") {
        adjustment -= 0.05; // Tighten drift tolerance
        reason = `Recurring drift pattern. Tightening global drift tolerance.`;
      }
    }
  });
  
  if (Math.abs(adjustment) < 0.01) {
    return null;
  }
  
  const currentValue = typeof globalRule.value === "number" ? globalRule.value : parseFloat(globalRule.value) || 0;
  const proposedValue = Math.max(0, Math.min(1, currentValue + adjustment));
  
  if (Math.abs(proposedValue - currentValue) < 0.01) {
    return null;
  }
  
  return {
    ruleId: globalRule.id,
    ruleName: globalRule.name,
    currentValue,
    proposedValue,
    reason: reason || `Pattern-based global rule adjustment`,
    confidence: Math.min(0.9, patterns.length * 0.15),
    basedOn,
  };
}

/**
 * Apply rule evolution proposals
 */
export async function applyRuleEvolutions(proposals: RuleProposal[]): Promise<number> {
  if (!isEvolutionActive() || proposals.length === 0) {
    return 0;
  }
  
  let applied = 0;
  
  for (const proposal of proposals) {
    // Only apply high-confidence proposals
    if (proposal.confidence < 0.6) {
      continue;
    }
    
    try {
      // Record evolution
      const evolution = recordRuleEvolution(
        proposal.ruleId,
        proposal.ruleName,
        proposal.currentValue,
        proposal.proposedValue,
        proposal.reason,
        proposal.confidence
      );
      
      // Apply the evolution
      if (isSovereignActive() && proposal.ruleId.includes("global")) {
        // Update global rule
        const domain = proposal.ruleId.split("-")[1] as any;
        updateGlobalRule(domain, proposal.proposedValue);
      } else {
        // Update local rule (would need rule update function)
        // For now, we just record the evolution
      }
      
      applyRuleEvolution(evolution.id);
      applied++;
    } catch (error) {
      console.error(`[UOI] Failed to apply rule evolution ${proposal.ruleId}:`, error);
    }
  }
  
  return applied;
}
