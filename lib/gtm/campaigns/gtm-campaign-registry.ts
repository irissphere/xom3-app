import type { GtmCampaign } from "./gtm-campaign-types";

const HOUR = 60 * 60 * 1000;

export const gtmCampaigns: GtmCampaign[] = [
  {
    id: "welcome",
    name: "Welcome Campaign",
    description: "New lead welcome: intro → value → invitation.",
    persona: "broadcast",
    cloneVoice: "operator_plain",
    epochTags: ["gtm", "operator"],
    entryTriggers: [{ eventType: "contactCreated", source: "leadGen" }],
    steps: [
      {
        stepId: "intro",
        offsetFromStartMs: 0,
        actionType: "outboundPost",
        platforms: ["twitter", "linkedin"],
        contentTemplateId: "welcome_intro",
      },
      {
        stepId: "value",
        offsetFromStartMs: 24 * HOUR,
        actionType: "outboundPost",
        platforms: ["linkedin"],
        contentTemplateId: "welcome_value",
      },
      {
        stepId: "invite",
        offsetFromStartMs: 72 * HOUR,
        actionType: "outboundPost",
        platforms: ["twitter", "linkedin"],
        contentTemplateId: "welcome_invite",
      },
    ],
  },
  {
    id: "launch",
    name: "Launch Campaign",
    description: "New product launch: announce → story → reminder.",
    persona: "broadcast",
    cloneVoice: "operator_plain",
    epochTags: ["gtm"],
    entryTriggers: [{ eventType: "productCreated", source: "manual" }],
    steps: [
      {
        stepId: "announce",
        offsetFromStartMs: 0,
        actionType: "outboundPost",
        platforms: ["twitter", "linkedin"],
        contentTemplateId: "launch_announce",
      },
      {
        stepId: "story",
        offsetFromStartMs: 24 * HOUR,
        actionType: "outboundPost",
        platforms: ["linkedin"],
        contentTemplateId: "launch_story",
      },
      {
        stepId: "reminder",
        offsetFromStartMs: 72 * HOUR,
        actionType: "outboundPost",
        platforms: ["twitter", "linkedin"],
        contentTemplateId: "launch_reminder",
      },
    ],
  },
];

export function getGtmCampaignById(id: string) {
  return gtmCampaigns.find((c) => c.id === id) || null;
}
