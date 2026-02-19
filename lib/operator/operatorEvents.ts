import { updateOperatorState } from "./operatorState";

export function onViewChange(view: string) {
  updateOperatorState({ view });
}

export function onRitualStart(ritualId: string) {
  updateOperatorState({ activeRitual: ritualId, lastRitual: ritualId });
}

export function onRitualEnd() {
  updateOperatorState({ activeRitual: null });
}

export function onLaneChange(lane: string) {
  updateOperatorState({ activeLane: lane });
}
