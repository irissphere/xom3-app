// UOI - Unified Operational Intelligence
// The binding layer

export * from "./contract";
export * from "./signals";
export * from "./governance";
export * from "./orchestrator";
export * from "./optimizer";
export * from "./router";
export * from "./explain";
export * from "./event-loop";
export * from "./heartbeat";
export * from "./init";
export * from "./federation";
export * from "./continuous-optimization";
export * from "./evolution";
export * from "./self-tuning-governance";
export * from "./adaptive-thresholds";
export * from "./generative-patterns";
export * from "./directive-effectiveness";
export * from "./genesis";
export * from "./handlers";

// Memory exports (only what actually exists)
export { 
  remember, 
  getRecentSignals,
  rememberPattern,
  recall,
  getMemoriesByType,
  getRecurringPatterns,
  recordLongTermPattern,
  clearOldMemories
} from "./memory";

// Sovereign exports (non-conflicting)
export {
  activateSovereign,
  deactivateSovereign,
  getSovereignState,
  isSovereignActive,
  createGlobalRule,
  updateGlobalRule,
  deleteGlobalRule,
  getAllGlobalRules,
  optimizeGlobally
} from "./sovereign";

// Main entry point (avoid duplicate exports)
export { uoiHeartbeat } from "./heartbeat";
export { startUoiEventLoop, stopUoiEventLoop, getEventLoopStatus, getHeartbeatLog } from "./event-loop";
export { ensureUoiStarted, ensureHandlersInitialized, isUoiRunning, getUoiStartInfo } from "./init";
export { initializeDirectiveHandlers, getPipelineState, isPipelinePaused } from "./handlers";
export { emitSignal, onSignal, getPendingSignals, getSignalQueueState, flushSignals, normalizeSignal } from "./signals";
export { createDirective, onDirective, getPendingDirectives, getDirectiveQueueState, flushDirectives, executeDirectiveNow, processOneCycle } from "./orchestrator";
export { evaluateRules, getAllRules, UoiRules } from "./governance";
// remember and getRecentSignals already exported above in Memory exports
export { analyzeSignals } from "./optimizer";
export { routeDecision } from "./router";
export { explain } from "./explain";
export { 
  activateGenesis, 
  deactivateGenesis, 
  getGenesisState, 
  isGenesisActive,
  runGenesisCycle,
  approveProposal,
  rejectProposal,
  markProposalImplemented,
  getPendingProposals,
  getUnresolvedGaps
} from "./genesis";
