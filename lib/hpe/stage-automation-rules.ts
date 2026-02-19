// HPE Phase II - Strike 1: Stage Automation Rules Engine
// Defines automation profiles for each stage transition

export interface AutomationAction {
  type: 
    | "assign_task"
    | "close_task"
    | "send_notification"
    | "sync_airtable"
    | "log_compliance"
    | "trigger_workflow"
    | "emit_uoi_signal"
    | "update_hse_state"
    | "update_billing"
    | "update_commission";
  
  config: {
    // For assign_task
    taskName?: string;
    taskDescription?: string;
    assignee?: string; // "agent" | "system" | specific user ID
    
    // For close_task
    taskPattern?: string; // Pattern to match tasks to close
    
    // For send_notification
    notificationType?: "email" | "slack" | "sms";
    notificationTemplate?: string;
    recipients?: string[]; // "agent" | "client" | specific emails
    
    // For sync_airtable
    airtableTable?: string;
    airtableFields?: Record<string, any>;
    
    // For log_compliance
    complianceType?: string;
    complianceNotes?: string;
    
    // For trigger_workflow
    workflowId?: string;
    workflowParams?: Record<string, any>;
    
    // For emit_uoi_signal
    uoiSignalType?: string;
    uoiSignalPayload?: Record<string, any>;
    
    // For update_hse_state
    hseSubsystem?: string;
    hseMetric?: string;
    hseValue?: number;
    
    // For update_billing
    billingAction?: "create_invoice" | "update_subscription" | "sync_stripe";
    
    // For update_commission
    commissionAction?: "calculate" | "record" | "sync";
  };
  
  condition?: (context: StageTransitionContext) => boolean;
  priority?: number; // 1-10, higher = more important
}

export interface StageTransitionContext {
  clientId: string;
  clientName?: string;
  oldStage: string;
  newStage: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  clientData?: Record<string, any>;
}

export interface StageAutomationRule {
  fromStage: string;
  toStage: string;
  actions: AutomationAction[];
  enabled: boolean;
  description?: string;
}

/**
 * Default automation rules for healthcare pipeline
 */
export const DEFAULT_STAGE_AUTOMATION_RULES: StageAutomationRule[] = [
  // Lead → Application Started
  {
    fromStage: "Lead",
    toStage: "Application Started",
    enabled: true,
    description: "When a lead starts an application",
    actions: [
      {
        type: "assign_task",
        priority: 8,
        config: {
          taskName: "Application Intake",
          taskDescription: "Complete application intake process for new client",
          assignee: "agent"
        }
      },
      {
        type: "send_notification",
        priority: 7,
        config: {
          notificationType: "email",
          notificationTemplate: "application_started",
          recipients: ["client"]
        }
      },
      {
        type: "log_compliance",
        priority: 6,
        config: {
          complianceType: "Application Started",
          complianceNotes: "Client entered application phase"
        }
      },
      {
        type: "emit_uoi_signal",
        priority: 5,
        config: {
          uoiSignalType: "application_started",
          uoiSignalPayload: {}
        }
      },
      {
        type: "sync_airtable",
        priority: 9,
        config: {
          airtableTable: "Clients",
          airtableFields: {
            "Status": "Application Started",
            "Application Start Date": "{{timestamp}}"
          }
        }
      }
    ]
  },
  
  // Application Started → Underwriting
  {
    fromStage: "Application Started",
    toStage: "Underwriting",
    enabled: true,
    description: "When application moves to underwriting",
    actions: [
      {
        type: "assign_task",
        priority: 8,
        config: {
          taskName: "Upload Documents",
          taskDescription: "Collect and verify required documents",
          assignee: "agent"
        }
      },
      {
        type: "close_task",
        priority: 7,
        config: {
          taskPattern: "Application Intake"
        }
      },
      {
        type: "send_notification",
        priority: 6,
        config: {
          notificationType: "email",
          notificationTemplate: "underwriting_started",
          recipients: ["agent", "client"]
        }
      },
      {
        type: "trigger_workflow",
        priority: 7,
        config: {
          workflowId: "underwriting-workflow",
          workflowParams: {}
        }
      },
      {
        type: "log_compliance",
        priority: 8,
        config: {
          complianceType: "Entered Underwriting",
          complianceNotes: "Client application entered underwriting review"
        }
      },
      {
        type: "emit_uoi_signal",
        priority: 5,
        config: {
          uoiSignalType: "underwriting_started",
          uoiSignalPayload: {}
        }
      },
      {
        type: "sync_airtable",
        priority: 9,
        config: {
          airtableTable: "Clients",
          airtableFields: {
            "Status": "Underwriting",
            "Underwriting Start Date": "{{timestamp}}"
          }
        }
      }
    ]
  },
  
  // Underwriting → Approved
  {
    fromStage: "Underwriting",
    toStage: "Approved",
    enabled: true,
    description: "When application is approved",
    actions: [
      {
        type: "assign_task",
        priority: 9,
        config: {
          taskName: "Prepare Policy Delivery",
          taskDescription: "Prepare policy documents for delivery",
          assignee: "agent"
        }
      },
      {
        type: "close_task",
        priority: 7,
        config: {
          taskPattern: "Upload Documents"
        }
      },
      {
        type: "update_billing",
        priority: 8,
        config: {
          billingAction: "create_invoice"
        }
      },
      {
        type: "send_notification",
        priority: 9,
        config: {
          notificationType: "email",
          notificationTemplate: "application_approved",
          recipients: ["client", "agent"]
        }
      },
      {
        type: "log_compliance",
        priority: 9,
        config: {
          complianceType: "Approved by Carrier",
          complianceNotes: "Application approved, policy ready for delivery"
        }
      },
      {
        type: "emit_uoi_signal",
        priority: 6,
        config: {
          uoiSignalType: "application_approved",
          uoiSignalPayload: {}
        }
      },
      {
        type: "sync_airtable",
        priority: 9,
        config: {
          airtableTable: "Clients",
          airtableFields: {
            "Status": "Approved",
            "Approval Date": "{{timestamp}}"
          }
        }
      }
    ]
  },
  
  // Approved → Active
  {
    fromStage: "Approved",
    toStage: "Active",
    enabled: true,
    description: "When policy becomes active",
    actions: [
      {
        type: "close_task",
        priority: 8,
        config: {
          taskPattern: "Prepare Policy Delivery"
        }
      },
      {
        type: "update_commission",
        priority: 9,
        config: {
          commissionAction: "calculate"
        }
      },
      {
        type: "update_billing",
        priority: 8,
        config: {
          billingAction: "sync_stripe"
        }
      },
      {
        type: "send_notification",
        priority: 9,
        config: {
          notificationType: "email",
          notificationTemplate: "policy_activated",
          recipients: ["client"]
        }
      },
      {
        type: "log_compliance",
        priority: 9,
        config: {
          complianceType: "Policy Active",
          complianceNotes: "Policy is now active and in force"
        }
      },
      {
        type: "emit_uoi_signal",
        priority: 7,
        config: {
          uoiSignalType: "policy_activated",
          uoiSignalPayload: {}
        }
      },
      {
        type: "sync_airtable",
        priority: 9,
        config: {
          airtableTable: "Clients",
          airtableFields: {
            "Status": "Active",
            "Policy Active Date": "{{timestamp}}"
          }
        }
      }
    ]
  },
  
  // Any stage → Any stage (generic transition logging)
  {
    fromStage: "*",
    toStage: "*",
    enabled: true,
    description: "Generic transition logging for all stage changes",
    actions: [
      {
        type: "emit_uoi_signal",
        priority: 3,
        config: {
          uoiSignalType: "stage_transition",
          uoiSignalPayload: {}
        }
      },
      {
        type: "update_hse_state",
        priority: 4,
        config: {
          hseSubsystem: "hpe",
          hseMetric: "transition_count",
          hseValue: 1
        }
      }
    ]
  }
];

/**
 * Get automation rules for a specific stage transition
 */
export function getAutomationRules(
  fromStage: string,
  toStage: string,
  customRules: StageAutomationRule[] = []
): StageAutomationRule[] {
  const allRules = [...DEFAULT_STAGE_AUTOMATION_RULES, ...customRules];
  
  // Find exact match first
  const exactMatch = allRules.find(
    rule => rule.fromStage === fromStage && rule.toStage === toStage && rule.enabled
  );
  
  if (exactMatch) {
    return [exactMatch];
  }
  
  // Find wildcard match
  const wildcardMatch = allRules.find(
    rule => rule.fromStage === "*" && rule.toStage === "*" && rule.enabled
  );
  
  return wildcardMatch ? [wildcardMatch] : [];
}

/**
 * Get all actions for a stage transition, sorted by priority
 */
export function getAutomationActions(
  fromStage: string,
  toStage: string,
  context: StageTransitionContext,
  customRules: StageAutomationRule[] = []
): AutomationAction[] {
  const rules = getAutomationRules(fromStage, toStage, customRules);
  const allActions: AutomationAction[] = [];
  
  for (const rule of rules) {
    for (const action of rule.actions) {
      // Check condition if present
      if (action.condition && !action.condition(context)) {
        continue;
      }
      
      allActions.push(action);
    }
  }
  
  // Sort by priority (highest first)
  return allActions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}
