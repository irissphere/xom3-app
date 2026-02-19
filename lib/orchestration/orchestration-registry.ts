import type { OrchestrationTrigger } from "./orchestration-types";

export function getDefaultOrchestrationTriggers(): OrchestrationTrigger[] {
  return [
    // 3.1 CRM → GTM
    {
      triggerId: "crm.lead.created→gtm.welcome",
      source: "crm",
      eventType: "intakecrm.lead.created",
      enabled: true,
      actions: [
        { type: "start_campaign", campaignId: "welcome" },
        { type: "enqueue_outbound", templateId: "welcome_message" },
        { type: "emit_signal", signalType: "orchestration.crm_to_gtm.started" },
      ],
    },

    // 3.2 CRM → Social
    {
      triggerId: "crm.task.completed→social.operator_in_action",
      source: "crm",
      eventType: "intakecrm.task.completed",
      enabled: true,
      actions: [
        { type: "enqueue_social", platform: "twitter", templateId: "operator_in_action" },
        { type: "emit_signal", signalType: "orchestration.crm_to_social.started" },
      ],
    },

    // 3.3 GTM → CRM
    {
      triggerId: "gtm.outbound.sent→crm.working",
      source: "gtm",
      eventType: "gtm.outbound.sent",
      enabled: true,
      actions: [
        { type: "update_lead_posture", posture: "working" },
        { type: "append_crm_timeline", timelineType: "gtm.outbound.sent" },
      ],
    },

    // 3.4 Social → CRM
    {
      triggerId: "social.post.sent→crm.timeline",
      source: "social",
      eventType: "social.post.sent",
      enabled: true,
      actions: [
        { type: "append_crm_timeline", timelineType: "social.post.sent" },
        { type: "emit_signal", signalType: "orchestration.social_to_crm.completed" },
      ],
    },

    // 3.5 Revenue Loop → GTM
    {
      triggerId: "revenue.loop.triggered→gtm.micro",
      source: "revenue-loop",
      eventType: "revenue.loop.triggered",
      enabled: true,
      actions: [
        { type: "enqueue_outbound", templateId: "revenue_loop_nudge" },
        { type: "start_campaign", campaignId: "welcome" },
      ],
    },

    // 3.6 CRM → COS
    {
      triggerId: "crm.lead.closed→cos.win_scene",
      source: "crm",
      eventType: "intakecrm.lead.closed",
      enabled: true,
      actions: [
        { type: "start_scene", sceneId: "win_scene" },
        { type: "emit_signal", signalType: "orchestration.crm_to_cos.started" },
      ],
    },
  ];
}
