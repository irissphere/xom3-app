// Client Health Score Engine
// Predictive insight for renewal, lapse, cross-sell, churn risk

export interface HealthScoreFactors {
  renewalDateProximity: number; // Days until renewal (0-365+)
  numberOfPolicies: number;
  missedAppointments: number;
  underwritingIssues: number;
  communicationFrequency: number; // Interactions in last 30 days
  daysSinceLastContact: number;
  policyActive: boolean;
  premiumAmount?: number;
  applicationStatus?: string;
}

export interface HealthScoreResult {
  score: number; // 0-100
  level: "excellent" | "good" | "fair" | "poor" | "critical";
  color: string;
  riskFactors: string[];
  opportunities: string[];
  recommendations: string[];
  breakdown: {
    renewalRisk: number;
    engagementScore: number;
    policyHealth: number;
    communicationScore: number;
  };
}

/**
 * Calculate client health score based on multiple factors
 */
export function calculateHealthScore(factors: HealthScoreFactors): HealthScoreResult {
  const riskFactors: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  // 1. Renewal Risk (0-30 points)
  let renewalRisk = 30;
  if (factors.renewalDateProximity > 0) {
    if (factors.renewalDateProximity <= 30) {
      renewalRisk = 5; // High risk - renewal very soon
      riskFactors.push("Renewal due within 30 days");
      recommendations.push("Schedule renewal call immediately");
    } else if (factors.renewalDateProximity <= 60) {
      renewalRisk = 15; // Medium risk
      riskFactors.push("Renewal due within 60 days");
      recommendations.push("Initiate renewal conversation");
    } else if (factors.renewalDateProximity <= 90) {
      renewalRisk = 20; // Low-medium risk
      opportunities.push("Renewal opportunity in 60-90 days");
    } else {
      renewalRisk = 25; // Low risk
    }
  } else {
    renewalRisk = 10; // No renewal date set - risk
    riskFactors.push("No renewal date on record");
  }

  // 2. Engagement Score (0-25 points)
  let engagementScore = 25;
  if (factors.communicationFrequency >= 5) {
    engagementScore = 25; // Excellent engagement
  } else if (factors.communicationFrequency >= 3) {
    engagementScore = 20; // Good engagement
  } else if (factors.communicationFrequency >= 1) {
    engagementScore = 15; // Fair engagement
  } else {
    engagementScore = 5; // Poor engagement
    riskFactors.push("Low communication frequency");
    recommendations.push("Reach out to re-engage client");
  }

  // Days since last contact penalty
  if (factors.daysSinceLastContact > 90) {
    engagementScore = Math.max(0, engagementScore - 10);
    riskFactors.push("No contact in 90+ days");
    recommendations.push("Urgent re-engagement needed");
  } else if (factors.daysSinceLastContact > 60) {
    engagementScore = Math.max(0, engagementScore - 5);
    riskFactors.push("No contact in 60+ days");
  }

  // 3. Policy Health (0-25 points)
  let policyHealth = 25;
  if (factors.policyActive) {
    policyHealth = 25; // Active policy
    if (factors.numberOfPolicies > 1) {
      policyHealth = 25; // Multiple policies - excellent
      opportunities.push("Multiple policies - cross-sell potential");
    } else {
      policyHealth = 20; // Single policy
      opportunities.push("Cross-sell opportunity");
    }
  } else {
    policyHealth = 5; // No active policy
    riskFactors.push("No active policy");
    recommendations.push("Follow up on policy status");
  }

  // Missed appointments penalty
  if (factors.missedAppointments > 0) {
    policyHealth = Math.max(0, policyHealth - (factors.missedAppointments * 5));
    riskFactors.push(`${factors.missedAppointments} missed appointment(s)`);
    recommendations.push("Address appointment attendance");
  }

  // Underwriting issues penalty
  if (factors.underwritingIssues > 0) {
    policyHealth = Math.max(0, policyHealth - (factors.underwritingIssues * 8));
    riskFactors.push(`${factors.underwritingIssues} underwriting issue(s)`);
    recommendations.push("Resolve underwriting concerns");
  }

  // Application status
  if (factors.applicationStatus === "Pending" || factors.applicationStatus === "Under Review") {
    policyHealth = Math.max(0, policyHealth - 5);
    riskFactors.push("Application pending");
  }

  // 4. Communication Score (0-20 points)
  let communicationScore = 20;
  if (factors.communicationFrequency >= 4) {
    communicationScore = 20; // Excellent
  } else if (factors.communicationFrequency >= 2) {
    communicationScore = 15; // Good
  } else if (factors.communicationFrequency >= 1) {
    communicationScore = 10; // Fair
  } else {
    communicationScore = 5; // Poor
  }

  // Premium amount bonus (if high value)
  if (factors.premiumAmount && factors.premiumAmount > 500) {
    communicationScore = Math.min(20, communicationScore + 3);
    opportunities.push("High-value client - prioritize retention");
  }

  // Calculate total score
  const totalScore = renewalRisk + engagementScore + policyHealth + communicationScore;
  const score = Math.max(0, Math.min(100, totalScore));

  // Determine level and color
  let level: HealthScoreResult["level"];
  let color: string;

  if (score >= 80) {
    level = "excellent";
    color = "#4caf50"; // Green
  } else if (score >= 60) {
    level = "good";
    color = "#8bc34a"; // Light green
  } else if (score >= 40) {
    level = "fair";
    color = "#ffc107"; // Yellow
  } else if (score >= 20) {
    level = "poor";
    color = "#ff9800"; // Orange
  } else {
    level = "critical";
    color = "#f44336"; // Red
  }

  return {
    score,
    level,
    color,
    riskFactors,
    opportunities,
    recommendations,
    breakdown: {
      renewalRisk,
      engagementScore,
      policyHealth,
      communicationScore,
    },
  };
}

/**
 * Get health score explanation text
 */
export function getHealthScoreExplanation(result: HealthScoreResult): string {
  const { score, level } = result;
  
  const explanations: Record<HealthScoreResult["level"], string> = {
    excellent: "Client is highly engaged with active policies and strong communication. Low churn risk.",
    good: "Client is in good standing with minor areas for improvement. Moderate retention risk.",
    fair: "Client needs attention. Some risk factors present. Proactive engagement recommended.",
    poor: "Client is at risk. Multiple concerns present. Immediate action required.",
    critical: "Client is at high risk of churn. Urgent intervention needed.",
  };

  return explanations[level] || `Health score: ${score}/100 (${level})`;
}
