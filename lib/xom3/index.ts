// XOM3 Core Exports
export * from './types';

// Consent Management
export { default as ConsentManager } from './consent-manager';
export { validateConsent, getConsentProfile } from './consent-validator';

// Data Flow
export { processDataFlow } from './data-flow-processor';

// Signals
export { emitConsentSignal, emitDataFlowSignal } from './signal-emitter';
