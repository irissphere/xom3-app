import type { IntentSignal, OperatorIntent } from "./types";
import { inferIntent } from "./intentEngine";

export type OperatorIntentState = {
  intent: OperatorIntent;
  lastIntent: OperatorIntent | null;
  confidence: number;
  updatedAt: number;
};

const MAX_SIGNALS = 80;

let history: IntentSignal[] = [];
let state: OperatorIntentState = {
  intent: "idle",
  lastIntent: null,
  confidence: 0,
  updatedAt: Date.now(),
};

const subscribers: Set<(next: OperatorIntentState) => void> = new Set();

function emit(next: OperatorIntentState) {
  state = next;
  for (const fn of Array.from(subscribers)) {
    try {
      fn(state);
    } catch {
      // ignore
    }
  }
}

export function updateOperatorIntent(signal: IntentSignal) {
  const now = Date.now();
  history.push({ ...signal, at: typeof signal.at === "number" ? signal.at : now });
  if (history.length > MAX_SIGNALS) history = history.slice(-MAX_SIGNALS);

  const inferred = inferIntent({ now, history });
  const nextIntent = inferred.intent;
  const changed = nextIntent !== state.intent;

  emit({
    intent: nextIntent,
    lastIntent: changed ? state.intent : state.lastIntent,
    confidence: inferred.confidence,
    updatedAt: now,
  });

  if (typeof document !== "undefined") {
    document.body.dataset.operatorIntent = nextIntent;
  }
}

export function getOperatorIntent() {
  return state;
}

export function subscribeOperatorIntent(handler: (next: OperatorIntentState) => void): () => void {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}
