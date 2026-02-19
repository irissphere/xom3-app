export type OperatorIntent =
  | "build"
  | "debug"
  | "demo"
  | "gtm"
  | "ritual"
  | "analysis"
  | "navigation"
  | "idle";

export interface IntentSignal {
  type: OperatorIntent;
  weight: number;
  at?: number;
  source?: string;
}
