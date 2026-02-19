export type OrchestrationTriggerSource = "crm" | "gtm" | "social" | "revenue-loop";

export type ConditionOperator = "equals" | "not_equals" | "exists" | "in" | "contains";

export type Condition = {
  path: string; // dot-path into payload/context e.g. "leadId" or "payload.leadId"
  operator: ConditionOperator;
  value?: any;
};

export type OrchestrationAction =
  | { type: "start_campaign"; campaignId: string }
  | { type: "enqueue_outbound"; templateId: string }
  | { type: "enqueue_social"; platform: string; templateId: string }
  | { type: "update_lead_posture"; posture: string }
  | { type: "append_crm_timeline"; timelineType: string }
  | { type: "start_ritual"; ritualId: string }
  | { type: "start_scene"; sceneId: string }
  | { type: "start_graph"; graphId: string }
  | { type: "emit_signal"; signalType: string };

export type OrchestrationTrigger = {
  triggerId: string;
  source: OrchestrationTriggerSource;
  eventType: string;
  conditions?: Condition[];
  actions: OrchestrationAction[];
  enabled: boolean;
};

export type OrchestrationEvent = {
  tenantId: string;
  source: OrchestrationTriggerSource;
  eventType: string;
  timestamp: string; // ISO
  payload: any;
  raw?: any;
};
