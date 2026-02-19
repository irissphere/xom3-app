export type CosCrew = {
  id: string;
  name: string;
  members: string[]; // lane identifiers: gtm.outbound, gtm.campaigns, rituals, hud, epochs, etc.
  persona: string;
  epochTags: string[];
};

export type CosSceneTrigger = {
  eventType: string;
  source?: string;
  filters?: Record<string, any>;
};

export type CosSceneStepType =
  | "startRitual"
  | "startCampaign"
  | "enqueueOutbound"
  | "setHudState"
  | "setEpoch"
  | "emitSignal"
  | "waitForDuration"
  | "waitForEvent"
  | "runSubscene";

export type CosSceneStep = {
  stepId: string;
  type: CosSceneStepType;
  params?: Record<string, any>;
  metadata?: Record<string, any>;
  conditions?: Record<string, any>;
};

export type CosScene = {
  id: string;
  name: string;
  description: string;
  crewId: string;
  triggers: CosSceneTrigger[];
  steps: CosSceneStep[];
  personaOverride?: string;
  epochOverride?: string;
};

export type CosSceneInstanceStatus = "pending" | "running" | "paused" | "completed" | "cancelled" | "failed";
export type CosStepStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export type CosSceneInstance = {
  instanceId: string;
  sceneId: string;
  crewId: string;
  status: CosSceneInstanceStatus;
  startedAt: number;
  completedAt?: number;
  currentStepIndex: number;
  context: {
    subject?: { type: string; id: string };
    trigger?: { eventType: string; source?: string; at: number; payload?: any };
    flags?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  steps: Array<{
    stepId: string;
    type: CosSceneStepType;
    status: CosStepStatus;
    startedAt?: number;
    completedAt?: number;
    error?: string;
    output?: any;
  }>;
  waitingFor?: { kind: "duration" | "event"; untilAt?: number; eventType?: string };
  lastError?: { at: number; message: string };
};
