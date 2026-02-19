import type { GtmFunnel } from "./gtm-funnel-types";

export const gtmFunnels: GtmFunnel[] = [
  {
    id: "lead-intake",
    name: "Lead Intake Funnel",
    description: "Entry → captured → engaged → qualified → customer.",
    entityType: "contact",
    stages: [
      { stageId: "captured", name: "Lead Captured", order: 1 },
      { stageId: "engaged", name: "Engaged", order: 2 },
      { stageId: "qualified", name: "Qualified", order: 3 },
      { stageId: "customer", name: "Customer", order: 4 },
    ],
    mappedEvents: [
      { eventType: "contactCreated", toStageId: "captured" },
      { eventType: "formSubmitted", toStageId: "engaged" },
      { eventType: "callBooked", toStageId: "qualified" },
      { eventType: "orderCreated", toStageId: "customer" },
      { eventType: "outboundSent", toStageId: "engaged" },
    ],
  },
];

export function getGtmFunnelById(id: string) {
  return gtmFunnels.find((f) => f.id === id) || null;
}
