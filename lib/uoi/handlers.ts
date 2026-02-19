// UOI Directive Handlers - Execute directives from the intelligence system
// This is the "muscle" that carries out decisions made by UOI

import { UOIDirective } from "./contract";
import { onDirective } from "./orchestrator";
import { emitSignal } from "./signals";
import { enqueueBroadcast } from "@/lib/broadcast/broadcast-sovereign";
import { publish } from "@/lib/sovereigns/event-bus";

// Track pipeline states
const pipelineStates: Map<string, "running" | "paused"> = new Map();

// Handler registry
const handlers: Record<string, (directive: UOIDirective) => Promise<void>> = {
  /**
   * PAUSE_PIPELINE - Stop a pipeline from processing
   */
  PAUSE_PIPELINE: async (directive) => {
    const target = directive.target || "default";
    console.log(`[UOI-HANDLER] Pausing pipeline: ${target}`);
    
    pipelineStates.set(target, "paused");
    
    // Emit confirmation signal
    emitSignal({
      id: `pause-confirm-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "PAUSE_PIPELINE",
        target,
        success: true,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      priority: "high",
    });
    
    // Notify via console (could integrate with Slack/notifications later)
    console.log(`[UOI-HANDLER] Pipeline ${target} PAUSED due to: ${directive.reason}`);
  },

  /**
   * RESUME_PIPELINE - Resume a paused pipeline
   */
  RESUME_PIPELINE: async (directive) => {
    const target = directive.target || "default";
    console.log(`[UOI-HANDLER] Resuming pipeline: ${target}`);
    
    pipelineStates.set(target, "running");
    
    emitSignal({
      id: `resume-confirm-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "RESUME_PIPELINE",
        target,
        success: true,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      priority: "medium",
    });
    
    console.log(`[UOI-HANDLER] Pipeline ${target} RESUMED`);
  },

  /**
   * REWRITE_MAPPING - Trigger mapping recalibration
   */
  REWRITE_MAPPING: async (directive) => {
    const target = directive.target || "amp";
    console.log(`[UOI-HANDLER] Rewriting mapping for: ${target}`);
    
    // In a real implementation, this would trigger AMP-AI recalibration
    // For now, emit a signal that the mapping rewrite was requested
    emitSignal({
      id: `rewrite-mapping-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "REWRITE_MAPPING",
        target,
        requested: true,
        reason: directive.reason,
      },
      timestamp: new Date().toISOString(),
      priority: "high",
    });
    
    console.log(`[UOI-HANDLER] Mapping rewrite triggered for ${target}`);
  },

  /**
   * REBALANCE_WORKFLOW - Redistribute workflow load
   */
  REBALANCE_WORKFLOW: async (directive) => {
    const target = directive.target || "workflow";
    console.log(`[UOI-HANDLER] Rebalancing workflow: ${target}`);
    
    // In production, this would interface with n8n or the workflow engine
    // to redistribute queued executions across workers
    emitSignal({
      id: `rebalance-workflow-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "REBALANCE_WORKFLOW",
        target,
        requested: true,
        reason: directive.reason,
      },
      timestamp: new Date().toISOString(),
      priority: "high",
    });
    
    console.log(`[UOI-HANDLER] Workflow rebalance triggered for ${target}`);
  },

  /**
   * TRIGGER_ALERT - Send alert to operator
   */
  TRIGGER_ALERT: async (directive) => {
    const severity = directive.payload?.severity || "high";
    console.log(`[UOI-HANDLER] ALERT [${severity.toUpperCase()}]: ${directive.reason}`);
    
    // Create alert signal
    emitSignal({
      id: `alert-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "TRIGGER_ALERT",
        severity,
        message: directive.reason,
        target: directive.target,
        timestamp: new Date().toISOString(),
        requiresAttention: severity === "critical" || severity === "high",
      },
      timestamp: new Date().toISOString(),
      priority: severity === "critical" ? "critical" : "high",
    });
    
    // TODO: Integrate with Slack/email notifications
    // For now, log prominently
    if (severity === "critical") {
      console.error(`🚨 [CRITICAL ALERT] ${directive.reason}`);
    } else {
      console.warn(`⚠️ [ALERT] ${directive.reason}`);
    }
  },

  /**
   * OPTIMIZE_ORDER - Reorder processing priorities
   */
  OPTIMIZE_ORDER: async (directive) => {
    const target = directive.target || "amp";
    console.log(`[UOI-HANDLER] Optimizing order for: ${target}`);
    
    emitSignal({
      id: `optimize-order-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "OPTIMIZE_ORDER",
        target,
        requested: true,
        reason: directive.reason,
      },
      timestamp: new Date().toISOString(),
      priority: "medium",
    });
    
    console.log(`[UOI-HANDLER] Order optimization triggered for ${target}`);
  },

  /**
   * REQUEST_HUMAN_REVIEW - Flag for operator attention
   */
  REQUEST_HUMAN_REVIEW: async (directive) => {
    console.log(`[UOI-HANDLER] Human review requested: ${directive.reason}`);
    
    emitSignal({
      id: `human-review-${Date.now()}`,
      source: "uoi-handlers",
      type: "event",
      payload: {
        action: "REQUEST_HUMAN_REVIEW",
        target: directive.target,
        reason: directive.reason,
        context: directive.payload,
        requestedAt: new Date().toISOString(),
        status: "pending",
      },
      timestamp: new Date().toISOString(),
      priority: "high",
    });
    
    console.log(`👤 [HUMAN REVIEW REQUIRED] ${directive.reason}`);
    console.log(`   Target: ${directive.target}`);
    console.log(`   Context:`, JSON.stringify(directive.payload, null, 2));
  },
};

/**
 * Get pipeline state
 */
export function getPipelineState(pipelineId: string): "running" | "paused" {
  return pipelineStates.get(pipelineId) || "running";
}

/**
 * Check if pipeline is paused
 */
export function isPipelinePaused(pipelineId: string): boolean {
  return getPipelineState(pipelineId) === "paused";
}

/**
 * Initialize all directive handlers
 * Call this once during app startup
 */
export function initializeDirectiveHandlers(): () => void {
  console.log("[UOI-HANDLERS] Initializing directive handlers...");
  
  // Register the master handler that routes to specific handlers
  const unsubscribe = onDirective(async (directive) => {
    const handler = handlers[directive.type];
    
    if (handler) {
      try {
        // UOI → Broadcast: narrate intent (accepted/started)
        enqueueBroadcast({
          channel: "internal",
          priority: directive.type === "TRIGGER_ALERT" ? "high" : "medium",
          title: "UOI directive accepted",
          body: `${directive.type} → ${directive.target}\n${directive.reason}`,
          metadata: {
            interlink: true,
            origin: "uoi",
            phase: "accepted",
            directiveId: directive.id,
            directiveType: directive.type,
            target: directive.target,
            timestamp: directive.timestamp,
            payload: directive.payload,
          },
        });
        publish({
          sovereign: "uoi",
          type: "uoi.directive.accepted",
          severity: "info",
          payload: {
            directiveId: directive.id,
            directiveType: directive.type,
            target: directive.target,
            reason: directive.reason,
          },
          tags: ["interlink", "uoi", "directive"],
        });

        await handler(directive);
        console.log(`[UOI-HANDLERS] Directive ${directive.type} handled successfully`);

        // UOI → Broadcast: narrate completion
        enqueueBroadcast({
          channel: "internal",
          priority: "low",
          title: "UOI directive completed",
          body: `${directive.type} → ${directive.target}`,
          metadata: {
            interlink: true,
            origin: "uoi",
            phase: "completed",
            directiveId: directive.id,
            directiveType: directive.type,
            target: directive.target,
          },
        });
        publish({
          sovereign: "uoi",
          type: "uoi.directive.completed",
          severity: "info",
          payload: { directiveId: directive.id, directiveType: directive.type, target: directive.target },
          tags: ["interlink", "uoi", "directive"],
        });
      } catch (error) {
        console.error(`[UOI-HANDLERS] Error handling directive ${directive.type}:`, error);
        
        // Emit error signal
        emitSignal({
          id: `handler-error-${Date.now()}`,
          source: "uoi-handlers",
          type: "error",
          payload: {
            directive: directive.type,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          timestamp: new Date().toISOString(),
          priority: "high",
        });

        // UOI → Broadcast: narrate failure (escalate to Slack when configured)
        enqueueBroadcast({
          channel: "slack",
          priority: "high",
          title: "UOI directive failed",
          body: `${directive.type} → ${directive.target}\n${error instanceof Error ? error.message : "Unknown error"}`,
          metadata: {
            interlink: true,
            origin: "uoi",
            phase: "failed",
            directiveId: directive.id,
            directiveType: directive.type,
            target: directive.target,
          },
        });
        publish({
          sovereign: "uoi",
          type: "uoi.directive.failed",
          severity: "error",
          payload: {
            directiveId: directive.id,
            directiveType: directive.type,
            target: directive.target,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          tags: ["interlink", "uoi", "directive", "error"],
        });
      }
    } else {
      console.warn(`[UOI-HANDLERS] No handler for directive type: ${directive.type}`);
    }
  });
  
  console.log("[UOI-HANDLERS] All handlers registered");
  console.log(`[UOI-HANDLERS] Supported directives: ${Object.keys(handlers).join(", ")}`);
  
  return unsubscribe;
}

/**
 * Add custom handler for a directive type
 */
export function addHandler(
  type: string,
  handler: (directive: UOIDirective) => Promise<void>
): void {
  handlers[type] = handler;
  console.log(`[UOI-HANDLERS] Custom handler added for: ${type}`);
}

/**
 * Remove handler for a directive type
 */
export function removeHandler(type: string): void {
  delete handlers[type];
  console.log(`[UOI-HANDLERS] Handler removed for: ${type}`);
}
