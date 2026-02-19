// HSE - Hyperstate Engine
// Real-time global state synthesizer - the cockpit's central nervous system

export * from "./state";
export * from "./synthesizer";
export * from "./vectors";
export * from "./query";
export * from "./signals";
export * from "./directives";
export * from "./uoi-integration";
export * from "./history-store";
export * from "./lineage";
export * from "./lineage-types";

// Main exports
export { synthesizeGlobalState, updateState } from "./synthesizer";
export { getGlobalState, initializeGlobalState, updateGlobalState, isHSEInitialized } from "./state";
export { queryState, queryVector, queryHistory } from "./query";
export { emitStateSignal, onStateSignal } from "./signals";
export { receiveDirective, processDirective } from "./directives";
export { sendHSEStateToUOI, receiveUOIDirective, initializeHSEUOILoop } from "./uoi-integration";
export { subscribeToHseEvents, broadcastHseEvent, getListenerCount } from "./stream";
export { pushHistory, getHistory, getAllHistory, getHistoryByType } from "./history-store";
export {
  initializeLineageMode,
  recordLineageEvent,
  getLineageState,
  isLineageModeActive,
  recordGenesisCycle,
  recordSubsystemBirth,
  recordOverride,
  recordStabilityPeriod,
  recordRecovery,
  getLineageThreads,
  getOperatorGlyphs,
} from "./lineage";
export {
  initializeInheritanceMode,
  getInheritanceState,
  isInheritanceModeActive,
  getOperatorSignature,
  recordOperatorDecision,
  recordOperatorOverride,
  recordAnomalyResponse,
  recordPostureTransition,
  recordGenesisCycle as recordInheritanceGenesisCycle,
  createSubsystemInheritance,
  updateSubsystemGeneticProfile,
  encodeArchitecturalStyle,
  transmitArchitecturalStyle,
  updateCrestLineageMemory,
  predictOperatorAction,
  getInheritedTraits,
} from "./inheritance";
export * from "./inheritance-types";
export {
  executeDepartureProtocol,
  handleOperatorReturn,
  getDepartureState,
  isAutonomousModeActive,
  sealDepartureState,
  activateAutonomousProgressMode,
  preInitializeSuccessionMode,
  preInitializeDirectiveEvolution,
  preInitializeCrestEvolution,
  prepareReturnBriefing,
} from "./departure";
export * from "./departure";
export * from "./hyperstate-map";
export * from "./transition-engine";
export * from "./behavior-layer";
export * from "./hyperstate-timeline";
export * from "./recovery-routines";
export * from "./analytics-gatekeeper";
export * from "./behavior-executor";
export * from "./hyperstate-prediction";
