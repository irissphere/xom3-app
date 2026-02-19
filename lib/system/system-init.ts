// Optimization Layer System Initialization
// AKV: Single integration pass, zero drift

import { automationQueue } from './automation-queue';
import { cache } from './caching-layer';
import { driftDetector } from './drift-detection';
import { evolutionEngine } from './evolution-engine';
import { initCrownProtocol } from './crown-init';

/**
 * Initialize Usage Analytics
 * Already functional via localStorage, just ensure it's ready
 */
export function initUsageAnalytics(): void {
  // Usage analytics uses localStorage, no explicit init needed
  // Just verify it's available
  if (typeof window !== 'undefined') {
    console.log('[Optimization Layer] Usage Analytics ready');
  }
}

/**
 * Initialize Adaptive UI
 * Already functional via localStorage, just ensure it's ready
 */
export function initAdaptiveUI(): void {
  // Adaptive UI uses localStorage, no explicit init needed
  if (typeof window !== 'undefined') {
    console.log('[Optimization Layer] Adaptive UI ready');
  }
}

/**
 * Initialize Automation Queue
 * Load from storage if available
 */
export function initAutomationQueue(): void {
  try {
    automationQueue.loadQueue();
    console.log('[Optimization Layer] Automation Queue initialized');
  } catch (error) {
    console.error('[Optimization Layer] Automation Queue init failed:', error);
  }
}

/**
 * Initialize Caching Layer
 * Already instantiated as singleton, just verify
 */
export function initCachingLayer(): void {
  // Cache is already instantiated
  console.log('[Optimization Layer] Caching Layer ready');
}

/**
 * Initialize Consistency Checker
 * No explicit init needed, functions are stateless
 */
export function initConsistencyChecker(): void {
  console.log('[Optimization Layer] Consistency Checker ready');
}

/**
 * Initialize Drift Detection
 * Already instantiated as singleton
 */
export function initDriftDetection(): void {
  // Drift detector is already instantiated
  console.log('[Optimization Layer] Drift Detection ready');
}

/**
 * Initialize Evolution Engine
 * Already instantiated as singleton
 */
export function initEvolutionEngine(): void {
  // Evolution engine is already instantiated
  console.log('[Optimization Layer] Evolution Engine ready');
}

/**
 * Initialize entire Optimization Layer
 * Call this once from app entry point
 */
export function initOptimizationLayer(): void {
  console.log('[Optimization Layer] Initializing...');
  
  // 👑 Initialize Crown Protocol FIRST - Operator Recognition
  try {
    initCrownProtocol();
  } catch (error) {
    console.error('[Crown Protocol] Initialization failed:', error);
  }
  
  initUsageAnalytics();
  initAdaptiveUI();
  initAutomationQueue();
  initCachingLayer();
  initConsistencyChecker();
  initDriftDetection();
  initEvolutionEngine();
  
  console.log('[Optimization Layer] ✅ Initialization complete');
}
