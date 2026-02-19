// Supervisor Agent - Default Configuration
// Default configuration for the Supervisor Agent

import { SupervisorConfig, LaneConfig } from "./types";

/**
 * Default supervisor configuration
 */
export const defaultSupervisorConfig: SupervisorConfig = {
  monitoringInterval: 30000, // 30 seconds
  heartbeatTimeout: 60000, // 60 seconds
  failureThreshold: 3, // 3 consecutive failures before restart
  restartCooldown: 60000, // 1 minute between restart attempts
  maxRestartAttempts: 3,
  anomalyDetectionEnabled: true,
  governanceEnforcementEnabled: true,
  slackAlertsEnabled: true,
  escalationEnabled: true,
  lanes: [
    {
      laneId: "lane1-social",
      laneName: "Lane 1: Social Automation",
      agents: [],
      workflows: [],
      priority: 5,
      governanceRules: ["min_success_rate", "max_error_rate"]
    },
    {
      laneId: "lane2-crm",
      laneName: "Lane 2: CRM & Onboarding",
      agents: [],
      workflows: [],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency"]
    },
    {
      laneId: "lane3-billing",
      laneName: "Lane 3: Billing & Monetization",
      agents: [],
      workflows: [],
      priority: 10,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    {
      laneId: "lane4-monitoring",
      laneName: "Lane 4: Monitoring & Audit",
      agents: [],
      workflows: [],
      priority: 9,
      governanceRules: ["min_success_rate", "max_error_rate", "heartbeat_required"]
    },
    {
      laneId: "lane5-content",
      laneName: "Lane 5: Content & Automation",
      agents: [],
      workflows: [],
      priority: 6,
      governanceRules: ["min_success_rate", "max_error_rate"]
    },
    // Health CRM Domain Lanes
    {
      laneId: "healthcrm-intake-triage",
      laneName: "Health Intake & Triage",
      agents: [],
      workflows: [],
      priority: 9,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "data_quality"]
    },
    {
      laneId: "healthcrm-followups-tasks",
      laneName: "Follow-Ups & Tasks",
      agents: [],
      workflows: [],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    {
      laneId: "healthcrm-eligibility-benefits",
      laneName: "Eligibility & Benefits Intelligence",
      agents: [],
      workflows: [],
      priority: 7,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency"]
    },
    {
      laneId: "healthcrm-workflow-automation",
      laneName: "Workflow Automation & Signals",
      agents: [],
      workflows: [],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    // Benefits CRM Domain Lanes
    {
      laneId: "benefitscrm-intake-triage",
      laneName: "Benefits Intake & Triage",
      agents: [],
      workflows: [],
      priority: 9,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "data_quality"]
    },
    {
      laneId: "benefitscrm-followups-tasks",
      laneName: "Follow-Ups & Tasks",
      agents: [],
      workflows: [],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    {
      laneId: "benefitscrm-eligibility-enrollment",
      laneName: "Eligibility & Enrollment Intelligence",
      agents: [],
      workflows: [],
      priority: 7,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency"]
    },
    {
      laneId: "benefitscrm-workflow-automation",
      laneName: "Workflow Automation & Signals",
      agents: [],
      workflows: [],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    // Benefits CRM Operational Lanes
    {
      laneId: "benefits-intake",
      laneName: "Benefits Intake Agent",
      agents: ["benefits-intake"],
      workflows: ["benefits-intake-workflow"],
      priority: 9,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "data_quality", "heartbeat_required"]
    },
    {
      laneId: "benefits-followup",
      laneName: "Benefits Follow-up Agent",
      agents: ["benefits-followup"],
      workflows: ["benefits-followup-workflow"],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    },
    // Health CRM Operational Lanes
    {
      laneId: "health-intake",
      laneName: "Health Intake Agent",
      agents: ["health-intake"],
      workflows: ["health-intake-workflow"],
      priority: 9,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "data_quality", "heartbeat_required"]
    },
    {
      laneId: "health-followup",
      laneName: "Health Follow-up Agent",
      agents: ["health-followup"],
      workflows: ["health-followup-workflow"],
      priority: 8,
      governanceRules: ["min_success_rate", "max_error_rate", "max_latency", "heartbeat_required"]
    }
  ]
};

/**
 * Create custom configuration
 */
export function createSupervisorConfig(overrides: Partial<SupervisorConfig>): SupervisorConfig {
  return {
    ...defaultSupervisorConfig,
    ...overrides,
    lanes: overrides.lanes || defaultSupervisorConfig.lanes
  };
}
