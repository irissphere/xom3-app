// UOI Initializer - Auto-starts the loop once on server

import { startUoiEventLoop } from "./event-loop";
import { initializeHSEUOILoop } from "@/lib/hse/uoi-integration";
import { initializeDirectiveHandlers } from "./handlers";
import { initializeSovereignInterlinking } from "@/lib/orchestration/sovereign-interlinking";

let started = false;
let handlersInitialized = false;
let startedAt: string | null = null;

/**
 * Ensure UOI is started (idempotent)
 */
export function ensureUoiStarted() {
  if (started) return;
  started = true;
  startedAt = new Date().toISOString();
  
  // Initialize directive handlers first
  if (!handlersInitialized) {
    initializeDirectiveHandlers();
    handlersInitialized = true;
  }
  
  startUoiEventLoop(5000); // 5s heartbeat
  initializeHSEUOILoop(); // Initialize HSE ↔ UOI feedback loop
  initializeSovereignInterlinking(); // Cross-sovereign reflex layer
  
  console.log("[UOI] System fully initialized with handlers");
}

/**
 * Initialize handlers only (without starting event loop)
 * Useful for testing or manual control
 */
export function ensureHandlersInitialized() {
  if (handlersInitialized) return;
  initializeDirectiveHandlers();
  handlersInitialized = true;
}

/**
 * Check if UOI is running
 */
export function isUoiRunning(): boolean {
  return started;
}

export function getUoiStartInfo(): { started: boolean; startedAt: string | null } {
  return { started, startedAt };
}
