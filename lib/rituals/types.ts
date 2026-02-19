export type RitualTrigger =
  | {
      type: "event";
      sovereign?: "uoi" | "system" | "broadcast" | "hse" | "sync" | "cockpit" | string;
      eventType: string;
    }
  | {
      type: "schedule";
      cron: string;
    };

export type RitualStep =
  | {
      kind: "uoi.directive";
      params: {
        directiveType: string;
        target?: string;
        reason?: string;
        metadata?: Record<string, any>;
      };
    }
  | {
      kind: "broadcast.enqueue";
      params: {
        channel?: "slack" | "internal";
        priority?: "low" | "medium" | "high";
        title: string;
        body: string;
        metadata?: Record<string, any>;
      };
    }
  | {
      kind: "sovereign.sync";
      params?: {
        mode?: "pulse" | "broadcast-sync";
        payload?: Record<string, any>;
      };
    }
  | {
      kind: "custom";
      params: Record<string, any>;
    };

export type RitualDefinition = {
  key: string;
  name: string;
  description: string;
  triggers?: RitualTrigger[];
  steps: RitualStep[];
};

export type RitualStepRun = {
  index: number;
  kind: RitualStep["kind"];
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
};

export type RitualRun = {
  id: string;
  ritualKey: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  source?: {
    type: "operator" | "reflex" | "broadcast" | "system" | "hse" | "uoi" | "sync" | string;
    eventId?: string;
  };
  steps: RitualStepRun[];
};
