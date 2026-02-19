// Credential Validator Agent
// Validates agent credentials and enforces sovereignty contract
// Part of the Vieron Cockpit credential governance system

import { PipelineAgent } from "../amp-ai/fao/types";

export interface CredentialStatus {
  credential: string;
  present: boolean;
  valid: boolean;
  format: "correct" | "incorrect" | "unknown";
  scope: string;
  lastValidated: string;
  expiresAt?: string;
  error?: string;
}

export interface AgentCredentialReport {
  agentId: string;
  agentName: string;
  state: "healthy" | "degraded" | "error" | "unknown";
  requiredCredentials: CredentialStatus[];
  optionalCredentials: CredentialStatus[];
  violations: CredentialViolation[];
  recommendations: string[];
  validatedAt: string;
}

export interface CredentialViolation {
  type: "missing_required" | "invalid_format" | "expired" | "scope_mismatch" | "security_risk";
  credential: string;
  severity: "critical" | "warning" | "info";
  message: string;
  remediation: string;
}

/**
 * Validate required credentials for an agent
 */
export function validateRequiredCredentials(agentId: string): CredentialStatus[] {
  const required: Array<{ name: string; format: RegExp; scope: string }> = [
    {
      name: "AIRTABLE_API_KEY",
      format: /^pat[a-zA-Z0-9]{14,}$/,
      scope: "Read/write agent data, error logs, execution state"
    },
    {
      name: "AIRTABLE_USHA_BASE_ID",
      format: /^app[a-zA-Z0-9]{14,}$/,
      scope: "Target Airtable base for operations"
    }
  ];

  return required.map(cred => {
    const value = process.env[cred.name];
    const present = !!value;
    const valid = present && cred.format.test(value || "");
    
    return {
      credential: cred.name,
      present,
      valid,
      format: present ? (valid ? "correct" : "incorrect") : "unknown",
      scope: cred.scope,
      lastValidated: new Date().toISOString(),
      error: !present 
        ? `Required credential missing: ${cred.name}`
        : !valid 
        ? `Invalid format for ${cred.name}`
        : undefined
    };
  });
}

/**
 * Validate optional credentials for an agent
 */
export function validateOptionalCredentials(agentId: string): CredentialStatus[] {
  const optional: Array<{ name: string; format: RegExp; scope: string; dependsOn?: string }> = [
    {
      name: "N8N_API_KEY",
      format: /^[a-zA-Z0-9]{32,}$/,
      scope: "Workflow chaining",
      dependsOn: undefined
    },
    {
      name: "N8N_BASE_URL",
      format: /^https:\/\/[a-zA-Z0-9.-]+$/,
      scope: "Required if N8N_API_KEY is present",
      dependsOn: "N8N_API_KEY"
    },
    {
      name: "SLACK_BOT_TOKEN",
      format: /^xoxb-[a-zA-Z0-9-]+$/,
      scope: "Notifications"
    },
    {
      name: "STRIPE_SECRET_KEY",
      format: /^sk_(test|live)_[a-zA-Z0-9]+$/,
      scope: "Billing automation"
    },
    {
      name: "TWITTER_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "Twitter platform posting"
    },
    {
      name: "INSTAGRAM_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "Instagram platform posting"
    },
    {
      name: "YOUTUBE_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "YouTube platform posting"
    },
    {
      name: "LINKEDIN_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "LinkedIn platform posting"
    },
    {
      name: "FACEBOOK_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "Facebook platform posting"
    },
    {
      name: "TIKTOK_ACCESS_TOKEN",
      format: /^[a-zA-Z0-9-]+$/,
      scope: "TikTok platform posting"
    }
  ];

  return optional.map(cred => {
    const value = process.env[cred.name];
    const present = !!value;
    
    // Check dependency
    if (cred.dependsOn) {
      const depValue = process.env[cred.dependsOn];
      if (depValue && !present) {
        return {
          credential: cred.name,
          present: false,
          valid: false,
          format: "unknown",
          scope: cred.scope,
          lastValidated: new Date().toISOString(),
          error: `${cred.dependsOn} is present but ${cred.name} is missing`
        };
      }
    }
    
    const valid = !present || cred.format.test(value || "");
    
    return {
      credential: cred.name,
      present,
      valid: present ? valid : true, // Missing optional is valid
      format: present ? (valid ? "correct" : "incorrect") : "unknown",
      scope: cred.scope,
      lastValidated: new Date().toISOString(),
      error: present && !valid ? `Invalid format for ${cred.name}` : undefined
    };
  });
}

/**
 * Generate credential violations report
 */
export function detectViolations(
  required: CredentialStatus[],
  optional: CredentialStatus[]
): CredentialViolation[] {
  const violations: CredentialViolation[] = [];

  // Check required credentials
  required.forEach(cred => {
    if (!cred.present) {
      violations.push({
        type: "missing_required",
        credential: cred.credential,
        severity: "critical",
        message: `Required credential ${cred.credential} is missing`,
        remediation: `Add ${cred.credential} to environment variables`
      });
    } else if (!cred.valid) {
      violations.push({
        type: "invalid_format",
        credential: cred.credential,
        severity: "critical",
        message: `Credential ${cred.credential} has invalid format`,
        remediation: `Verify ${cred.credential} format matches expected pattern`
      });
    }
  });

  // Check optional credentials
  optional.forEach(cred => {
    if (cred.present && !cred.valid) {
      violations.push({
        type: "invalid_format",
        credential: cred.credential,
        severity: "warning",
        message: `Optional credential ${cred.credential} has invalid format`,
        remediation: `Verify ${cred.credential} format or remove if not needed`
      });
    }
  });

  // Check for security risks (exposed in logs, etc.)
  // This would be implemented by checking log files, error messages, etc.
  
  return violations;
}

/**
 * Generate recommendations based on credential status
 */
export function generateRecommendations(
  required: CredentialStatus[],
  optional: CredentialStatus[],
  violations: CredentialViolation[]
): string[] {
  const recommendations: string[] = [];

  // Critical violations
  const critical = violations.filter(v => v.severity === "critical");
  if (critical.length > 0) {
    recommendations.push(
      `URGENT: ${critical.length} critical credential violation(s) detected. Agent cannot operate.`
    );
  }

  // Missing optional credentials that might be needed
  const missingOptional = optional.filter(c => !c.present);
  if (missingOptional.length > 0) {
    recommendations.push(
      `Consider adding optional credentials: ${missingOptional.map(c => c.credential).join(", ")}`
    );
  }

  // Format issues
  const formatIssues = [...required, ...optional].filter(c => c.present && !c.valid);
  if (formatIssues.length > 0) {
    recommendations.push(
      `Verify format for: ${formatIssues.map(c => c.credential).join(", ")}`
    );
  }

  // Rotation reminders
  const oldCredentials = [...required, ...optional].filter(c => {
    if (!c.lastValidated) return false;
    const daysSinceValidation = 
      (Date.now() - new Date(c.lastValidated).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceValidation > 80; // Warn at 80 days
  });

  if (oldCredentials.length > 0) {
    recommendations.push(
      `Credentials approaching 90-day rotation: ${oldCredentials.map(c => c.credential).join(", ")}`
    );
  }

  return recommendations;
}

/**
 * Validate agent credentials and generate full report
 */
export function validateAgentCredentials(
  agentId: string,
  agentName: string
): AgentCredentialReport {
  const required = validateRequiredCredentials(agentId);
  const optional = validateOptionalCredentials(agentId);
  const violations = detectViolations(required, optional);
  const recommendations = generateRecommendations(required, optional, violations);

  // Determine agent state
  let state: "healthy" | "degraded" | "error" | "unknown" = "healthy";
  
  const criticalViolations = violations.filter(v => v.severity === "critical");
  if (criticalViolations.length > 0) {
    state = "error";
  } else if (violations.length > 0) {
    state = "degraded";
  } else {
    const missingOptional = optional.filter(c => !c.present);
    if (missingOptional.length > 0) {
      state = "degraded"; // Reduced functionality
    } else {
      state = "healthy";
    }
  }

  return {
    agentId,
    agentName,
    state,
    requiredCredentials: required,
    optionalCredentials: optional,
    violations,
    recommendations,
    validatedAt: new Date().toISOString()
  };
}

/**
 * Validate all agents in the system
 */
export async function validateAllAgents(): Promise<AgentCredentialReport[]> {
  // This would query all agents from the system
  // For now, return validation for current agent context
  const agentId = process.env.AGENT_ID || "default-agent";
  const agentName = process.env.AGENT_NAME || "Default Agent";
  
  return [validateAgentCredentials(agentId, agentName)];
}

/**
 * Check if agent can initialize (all required credentials present and valid)
 */
export function canAgentInitialize(agentId: string): {
  canInitialize: boolean;
  reason?: string;
} {
  const required = validateRequiredCredentials(agentId);
  const missing = required.filter(c => !c.present);
  const invalid = required.filter(c => c.present && !c.valid);

  if (missing.length > 0) {
    return {
      canInitialize: false,
      reason: `Missing required credentials: ${missing.map(c => c.credential).join(", ")}`
    };
  }

  if (invalid.length > 0) {
    return {
      canInitialize: false,
      reason: `Invalid credential format: ${invalid.map(c => c.credential).join(", ")}`
    };
  }

  return { canInitialize: true };
}
