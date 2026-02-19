// HSE Directives - Receive and process directives from UOI

import { GlobalState } from "./types";
import { getGlobalState, updateGlobalState } from "./state";
import { synthesizeGlobalState } from "./synthesizer";
import { emitStateSignal } from "./signals";

export type HSEDirective =
  | { type: "STABILIZE_STATE"; payload: { targetAreas: string[]; priority: string } }
  | { type: "REDUCE_PRESSURE"; payload: { areas: string[]; reductionTarget: number } }
  | { type: "INCREASE_CAPACITY"; payload: { areas: string[]; capacityTarget: number } }
  | { type: "REBALANCE_SUBSYSTEMS"; payload: { subsystems: string[]; targetDistribution: Record<string, number> } }
  | { type: "ENTER_PROTECTIVE_MODE"; payload: { reason: string; duration: number; safeguards: string[] } };

const directiveHandlers: Map<string, (directive: HSEDirective) => Promise<void>> = new Map();

/**
 * Receive directive from UOI
 */
export async function receiveDirective(directive: HSEDirective): Promise<void> {
  const promises = Array.from(directiveHandlers.values()).map(handler => handler(directive));
  await Promise.allSettled(promises);
  
  // Process directive
  await processDirective(directive);
}

/**
 * Register directive handler
 */
export function onDirective(handler: (directive: HSEDirective) => Promise<void>): () => void {
  const id = Math.random().toString(36).substr(2, 9);
  directiveHandlers.set(id, handler);
  
  return () => {
    directiveHandlers.delete(id);
  };
}

/**
 * Process directive
 */
export async function processDirective(directive: HSEDirective): Promise<void> {
  const state = getGlobalState();
  if (!state) return;
  
  switch (directive.type) {
    case "STABILIZE_STATE":
      await stabilizeState(directive.payload.targetAreas, directive.payload.priority);
      break;
    case "REDUCE_PRESSURE":
      await reducePressure(directive.payload.areas, directive.payload.reductionTarget);
      break;
    case "INCREASE_CAPACITY":
      await increaseCapacity(directive.payload.areas, directive.payload.capacityTarget);
      break;
    case "REBALANCE_SUBSYSTEMS":
      await rebalanceSubsystems(directive.payload.subsystems, directive.payload.targetDistribution);
      break;
    case "ENTER_PROTECTIVE_MODE":
      await enterProtectiveMode(directive.payload.reason, directive.payload.duration, directive.payload.safeguards);
      break;
  }
}

async function stabilizeState(targetAreas: string[], priority: string): Promise<void> {
  // Emit signal that stabilization is needed
  emitStateSignal({
    type: "state_update",
    payload: {
      state: getGlobalState()!,
      changes: [`stabilization_requested:${targetAreas.join(",")}`],
    },
  });
}

async function reducePressure(areas: string[], reductionTarget: number): Promise<void> {
  // Emit signal that pressure reduction is needed
  emitStateSignal({
    type: "state_update",
    payload: {
      state: getGlobalState()!,
      changes: [`pressure_reduction_requested:${areas.join(",")}:${reductionTarget}`],
    },
  });
}

async function increaseCapacity(areas: string[], capacityTarget: number): Promise<void> {
  // Emit signal that capacity increase is needed
  emitStateSignal({
    type: "state_update",
    payload: {
      state: getGlobalState()!,
      changes: [`capacity_increase_requested:${areas.join(",")}:${capacityTarget}`],
    },
  });
}

async function rebalanceSubsystems(subsystems: string[], targetDistribution: Record<string, number>): Promise<void> {
  // Emit signal that rebalancing is needed
  emitStateSignal({
    type: "state_update",
    payload: {
      state: getGlobalState()!,
      changes: [`rebalancing_requested:${subsystems.join(",")}`],
    },
  });
}

async function enterProtectiveMode(reason: string, duration: number, safeguards: string[]): Promise<void> {
  // Emit signal that protective mode is needed
  emitStateSignal({
    type: "state_risk",
    payload: {
      risk: 1.0,
      level: "critical",
      recommendations: [`enter_protective_mode:${reason}:${duration}`, ...safeguards],
    },
  });
}
