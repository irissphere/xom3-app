export type GtmFunnelEntityType = "contact" | "product" | "generic";

export type GtmFunnelEventType =
  | "contactCreated"
  | "formSubmitted"
  | "callBooked"
  | "orderCreated"
  | "outboundSent";

export type GtmFunnelStage = {
  stageId: string;
  name: string;
  order: number;
  criteria?: Record<string, any>;
};

export type GtmFunnelEventMap = {
  eventType: GtmFunnelEventType;
  toStageId: string;
};

export type GtmFunnel = {
  id: string;
  name: string;
  description: string;
  entityType: GtmFunnelEntityType;
  stages: GtmFunnelStage[];
  mappedEvents: GtmFunnelEventMap[];
};

export type GtmFunnelEntityState = {
  entityId: string;
  funnelId: string;
  stageId: string;
  enteredAt: number;
  sourceEvent: { eventType: GtmFunnelEventType; at: number; meta?: any };
  history: Array<{ stageId: string; enteredAt: number; eventType: GtmFunnelEventType }>;
};
