import { inferPosture, type OperatorPosture } from "./postureEngine";

export interface OperatorState {
  posture: OperatorPosture;
  lastRitual?: string;
  nextRitual?: string;
  activeLane?: string;
  activeRitual?: string | null;
  view?: string;
}

let state: OperatorState = {
  posture: "build",
};

const subscribers: Set<(next: OperatorState) => void> = new Set();

export function updateOperatorState(context: any) {
  const next: OperatorState = {
    ...state,
    posture: inferPosture({ ...state, ...context }),
  };

  if (typeof context?.lastRitual === "string") next.lastRitual = context.lastRitual;
  if (typeof context?.nextRitual === "string") next.nextRitual = context.nextRitual;
  if (typeof context?.activeLane === "string") next.activeLane = context.activeLane;
  if (typeof context?.view === "string") next.view = context.view;

  if (context?.activeRitual === null) next.activeRitual = null;
  if (typeof context?.activeRitual === "string") next.activeRitual = context.activeRitual;

  state = next;
  for (const handler of Array.from(subscribers)) {
    try {
      handler(state);
    } catch {
      // ignore subscriber errors
    }
  }
}

export function getOperatorState() {
  return state;
}

export function subscribeOperatorState(handler: (next: OperatorState) => void): () => void {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}
