// Unified Cockpit - Main Exports
// The system that fuses all engines into one organism

export * from "./types";
export * from "./surfaces";
export { cockpitSurfaceEngine } from "./surfaces";
export * from "./intelligence";
export { cockpitIntelligenceEngine } from "./intelligence";
export * from "./signal-map";
export { crossEngineSignalRouter } from "./signal-map";
export * from "./ritual-layer";
export { cockpitRitualLayer } from "./ritual-layer";
export * from "./ui-flow";
export { uiFlowEngine } from "./ui-flow";
export type { StateUIConfig, StateConfig, StateTransition } from "./state-engine";
export { CockpitStateEngine, cockpitStateEngine } from "./state-engine";
export * from "./command-layer";
export { cockpitCommandLayer } from "./command-layer";
export * from "./memory-layer";
export { cockpitMemoryLayer } from "./memory-layer";
export * from "./persona-layer";
export { cockpitPersonaLayer } from "./persona-layer";
export * from "./integration-layer";
export { cockpitIntegrationLayer } from "./integration-layer";
export * from "./expansion-layer";
export { cockpitExpansionLayer } from "./expansion-layer";
export * from "./security-layer";
export { cockpitSecurityLayer } from "./security-layer";
export * from "./continuity-layer";
export { cockpitContinuityLayer } from "./continuity-layer";
export * from "./transmission-layer";
export { cockpitTransmissionLayer } from "./transmission-layer";
export * from "./evolution-protocol";
export { cockpitEvolutionProtocol } from "./evolution-protocol";
export * from "./finalization-layer";
export { cockpitFinalizationLayer } from "./finalization-layer";
export { supervisorAgent } from "./supervisor-agent";
export type {
  AgentHealth,
  WorkflowHealth,
  AgentFailure,
  Anomaly,
  GlobalState,
  GovernanceViolation,
  RestartAction,
  SupervisorConfig,
  LaneConfig,
  AlertPayload,
  FailureSeverity,
  EscalationLevel,
} from "./supervisor-agent/types";
export type { AgentStatus as SupervisorAgentStatus } from "./supervisor-agent/types";
