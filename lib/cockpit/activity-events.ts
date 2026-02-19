// Cockpit Activity Event Emitters
// Used by various subsystems to emit activity events

export type ActivityEventType = 
  | "pipeline"
  | "compliance"
  | "billing"
  | "interaction"
  | "automation"
  | "error"
  | "override"
  | "uoi_decision"
  | "hse_transition";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  severity: "info" | "warning" | "error" | "success";
  timestamp: string;
  title: string;
  description?: string;
  subsystem?: string;
  metadata?: Record<string, any>;
}

// In-memory event store (in production, use Redis or similar)
const eventStore: ActivityEvent[] = [];
const MAX_EVENTS = 1000;

function addEvent(event: Omit<ActivityEvent, "id" | "timestamp">) {
  const fullEvent: ActivityEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString()
  };
  
  eventStore.unshift(fullEvent);
  if (eventStore.length > MAX_EVENTS) {
    eventStore.pop();
  }
  
  return fullEvent;
}

// Export event store getter for route
export function getActivityEvents(since?: string, limit: number = 50, types?: ActivityEventType[]) {
  let events = [...eventStore];

  // Filter by timestamp if since provided
  if (since) {
    const sinceTime = new Date(since).getTime();
    events = events.filter(e => new Date(e.timestamp).getTime() > sinceTime);
  }

  // Filter by types if provided
  if (types && types.length > 0) {
    events = events.filter(e => types.includes(e.type));
  }

  // Limit results
  events = events.slice(0, limit);

  return {
    events,
    total: eventStore.length,
    latest: eventStore[0]?.timestamp || null
  };
}

// Listen for pipeline events (would be called from pipeline executor)
export function emitPipelineEvent(
  pipelineId: string,
  status: "started" | "success" | "error",
  details?: any
) {
  addEvent({
    type: "pipeline",
    severity: status === "error" ? "error" : status === "success" ? "success" : "info",
    title: `Pipeline ${status}: ${pipelineId}`,
    description: details?.message || `${status} execution`,
    subsystem: "amp",
    metadata: { pipelineId, ...details }
  });
}

// Listen for compliance events
export function emitComplianceEvent(
  action: string,
  severity: "info" | "warning" | "error",
  details?: any
) {
  addEvent({
    type: "compliance",
    severity,
    title: `Compliance: ${action}`,
    description: details?.message,
    subsystem: "compliance",
    metadata: details
  });
}

// Listen for billing events
export function emitBillingEvent(
  action: string,
  severity: "info" | "warning" | "error",
  details?: any
) {
  addEvent({
    type: "billing",
    severity,
    title: `Billing: ${action}`,
    description: details?.message,
    subsystem: "billing",
    metadata: details
  });
}

// Listen for automation events
export function emitAutomationEvent(
  automationId: string,
  status: "triggered" | "success" | "error",
  details?: any
) {
  addEvent({
    type: "automation",
    severity: status === "error" ? "error" : status === "success" ? "success" : "info",
    title: `Automation ${status}: ${automationId}`,
    description: details?.message,
    subsystem: "workflows",
    metadata: { automationId, ...details }
  });
}

// Listen for error events
export function emitErrorEvent(
  error: string,
  subsystem: string,
  details?: any
) {
  addEvent({
    type: "error",
    severity: "error",
    title: `Error in ${subsystem}`,
    description: error,
    subsystem,
    metadata: details
  });
}

// Listen for UOI decisions
export function emitUoiDecisionEvent(
  decision: string,
  target: string,
  action: string,
  details?: any
) {
  addEvent({
    type: "uoi_decision",
    severity: decision === "NOOP" ? "info" : "warning",
    title: `UOI Decision: ${decision}`,
    description: `${target} → ${action}`,
    subsystem: "uoi",
    metadata: { decision, target, action, ...details }
  });
}

// Listen for HSE transitions
export function emitHseTransitionEvent(
  from: string,
  to: string,
  reason?: string
) {
  addEvent({
    type: "hse_transition",
    severity: to === "critical" ? "error" : to === "degraded" ? "warning" : "info",
    title: `HSE Transition: ${from} → ${to}`,
    description: reason,
    subsystem: "hse",
    metadata: { from, to, reason }
  });
}
