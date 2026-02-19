// Usage Analytics Engine - Behavior-Driven Optimization
// Tracks how the CRM is actually being used to enable self-improving UX
// Task 31: Enhanced Usage Analytics Engine

export type EventType = 
  | "page_view"
  | "click"
  | "hover"
  | "hesitation" // User hovers but doesn't click (indicates confusion)
  | "workflow_start"
  | "workflow_stage" // Individual stage within workflow
  | "workflow_complete"
  | "workflow_abandon" // User starts but doesn't complete
  | "action_taken"
  | "search"
  | "filter_applied"
  | "error_encountered"
  | "field_focus"
  | "field_blur"
  | "form_submit"
  | "form_abandon";

export interface UsageEvent {
  id: string;
  type: EventType;
  timestamp: string;
  userId?: string;
  sessionId: string;
  page?: string;
  component?: string;
  action?: string;
  duration?: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface UsageStats {
  pageViews: Record<string, number>;
  clickEvents: Record<string, number>;
  hoverEvents: Record<string, number>; // Component hovers
  hesitationEvents: Record<string, number>; // Hover but no click
  workflowDurations: Record<string, { count: number; total: number; average: number }>;
  workflowStageDurations: Record<string, Record<string, { count: number; total: number; average: number }>>; // workflow -> stage -> metrics
  workflowAbandonment: Record<string, { started: number; completed: number; abandoned: number; abandonmentRate: number }>;
  actionFrequency: Record<string, number>;
  searchQueries: string[];
  errorEncounters: Record<string, number>;
  userActivity: Record<string, { events: number; lastActive: string }>;
  agentActivity: Record<string, { events: number; workflowsCompleted: number; averageWorkflowTime: number }>; // Per-agent metrics
  bottlenecks: Array<{
    page: string;
    averageDuration: number;
    eventCount: number;
  }>;
  workflowBottlenecks: Array<{
    workflow: string;
    stage: string;
    averageDuration: number;
    eventCount: number;
  }>;
  highTrafficAreas: Array<{
    page: string;
    viewCount: number;
  }>;
  abandonmentPoints: Array<{
    page: string;
    workflow?: string;
    stage?: string;
    abandonmentCount: number;
    abandonmentRate: number;
  }>;
}

/**
 * Track a usage event
 */
export function trackEvent(
  type: EventType,
  data: {
    page?: string;
    component?: string;
    action?: string;
    duration?: number;
    metadata?: Record<string, any>;
  }
): UsageEvent {
  const event: UsageEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId: getUserId(),
    ...data,
  };

  // Store event
  storeEvent(event);

  return event;
}

/**
 * Get session ID (creates if doesn't exist)
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  
  let sessionId = sessionStorage.getItem("usage_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem("usage_session_id", sessionId);
  }
  return sessionId;
}

/**
 * Get user ID (from auth context or generate)
 */
function getUserId(): string | undefined {
  // Would get from auth context in production
  if (typeof window !== "undefined") {
    return localStorage.getItem("user_id") || undefined;
  }
  return undefined;
}

/**
 * Store usage event
 */
function storeEvent(event: UsageEvent): void {
  try {
    if (typeof window !== "undefined") {
      const events = getStoredEvents();
      events.push(event);
      
      // Keep only last 5000 events
      if (events.length > 5000) {
        events.shift();
      }
      
      localStorage.setItem("usage_events", JSON.stringify(events));
    }
  } catch (err) {
    console.error("[Usage Analytics] Failed to store event:", err);
  }
}

/**
 * Get stored events
 */
export function getStoredEvents(): UsageEvent[] {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("usage_events");
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (err) {
    console.error("[Usage Analytics] Failed to retrieve events:", err);
  }
  return [];
}

/**
 * Calculate usage statistics
 */
export function calculateUsageStats(events: UsageEvent[]): UsageStats {
  const stats: UsageStats = {
    pageViews: {},
    clickEvents: {},
    hoverEvents: {},
    hesitationEvents: {},
    workflowDurations: {},
    workflowStageDurations: {},
    workflowAbandonment: {},
    actionFrequency: {},
    searchQueries: [],
    errorEncounters: {},
    userActivity: {},
    agentActivity: {},
    bottlenecks: [],
    workflowBottlenecks: [],
    highTrafficAreas: [],
    abandonmentPoints: [],
  };

  const pageDurations: Record<string, number[]> = {};
  const pageViewCounts: Record<string, number> = {};
  const workflowStarts: Record<string, Set<string>> = {}; // workflow -> sessionIds
  const workflowCompletes: Record<string, Set<string>> = {}; // workflow -> sessionIds
  const workflowStageData: Record<string, Record<string, number[]>> = {}; // workflow -> stage -> durations
  const abandonmentData: Record<string, { count: number; total: number }> = {}; // page/workflow/stage -> abandonment

  for (const event of events) {
    // Page views
    if (event.type === "page_view" && event.page) {
      stats.pageViews[event.page] = (stats.pageViews[event.page] || 0) + 1;
      pageViewCounts[event.page] = (pageViewCounts[event.page] || 0) + 1;
      
      if (event.duration) {
        if (!pageDurations[event.page]) {
          pageDurations[event.page] = [];
        }
        pageDurations[event.page].push(event.duration);
      }
    }

    // Click events
    if (event.type === "click" && event.component) {
      const key = `${event.page || "unknown"}:${event.component}`;
      stats.clickEvents[key] = (stats.clickEvents[key] || 0) + 1;
    }

    // Hover events
    if (event.type === "hover" && event.component) {
      const key = `${event.page || "unknown"}:${event.component}`;
      stats.hoverEvents[key] = (stats.hoverEvents[key] || 0) + 1;
    }

    // Hesitation events (hover but no click)
    if (event.type === "hesitation" && event.component) {
      const key = `${event.page || "unknown"}:${event.component}`;
      stats.hesitationEvents[key] = (stats.hesitationEvents[key] || 0) + 1;
    }

    // Workflow starts
    if (event.type === "workflow_start" && event.action) {
      if (!workflowStarts[event.action]) {
        workflowStarts[event.action] = new Set();
      }
      if (event.sessionId) {
        workflowStarts[event.action].add(event.sessionId);
      }
    }

    // Workflow stage durations
    if (event.type === "workflow_stage" && event.action && event.metadata?.stage && event.duration) {
      if (!stats.workflowStageDurations[event.action]) {
        stats.workflowStageDurations[event.action] = {};
      }
      if (!stats.workflowStageDurations[event.action][event.metadata.stage]) {
        stats.workflowStageDurations[event.action][event.metadata.stage] = { count: 0, total: 0, average: 0 };
      }
      if (!workflowStageData[event.action]) {
        workflowStageData[event.action] = {};
      }
      if (!workflowStageData[event.action][event.metadata.stage]) {
        workflowStageData[event.action][event.metadata.stage] = [];
      }
      workflowStageData[event.action][event.metadata.stage].push(event.duration);
    }

    // Workflow completes
    if (event.type === "workflow_complete" && event.duration && event.action) {
      if (!stats.workflowDurations[event.action]) {
        stats.workflowDurations[event.action] = { count: 0, total: 0, average: 0 };
      }
      const wf = stats.workflowDurations[event.action];
      wf.count++;
      wf.total += event.duration;
      wf.average = wf.total / wf.count;

      if (!workflowCompletes[event.action]) {
        workflowCompletes[event.action] = new Set();
      }
      if (event.sessionId) {
        workflowCompletes[event.action].add(event.sessionId);
      }
    }

    // Workflow abandonment
    if (event.type === "workflow_abandon" && event.action) {
      const key = `workflow:${event.action}`;
      if (!abandonmentData[key]) {
        abandonmentData[key] = { count: 0, total: 0 };
      }
      abandonmentData[key].count++;
    }

    // Form abandonment
    if (event.type === "form_abandon" && event.page) {
      const key = `form:${event.page}`;
      if (!abandonmentData[key]) {
        abandonmentData[key] = { count: 0, total: 0 };
      }
      abandonmentData[key].count++;
    }

    // Action frequency
    if (event.type === "action_taken" && event.action) {
      stats.actionFrequency[event.action] = (stats.actionFrequency[event.action] || 0) + 1;
    }

    // Search queries
    if (event.type === "search" && event.metadata?.query) {
      stats.searchQueries.push(event.metadata.query);
    }

    // Error encounters
    if (event.type === "error_encountered" && event.page) {
      stats.errorEncounters[event.page] = (stats.errorEncounters[event.page] || 0) + 1;
    }

    // User activity
    if (event.userId) {
      if (!stats.userActivity[event.userId]) {
        stats.userActivity[event.userId] = { events: 0, lastActive: event.timestamp };
      }
      stats.userActivity[event.userId].events++;
      if (event.timestamp > stats.userActivity[event.userId].lastActive) {
        stats.userActivity[event.userId].lastActive = event.timestamp;
      }
    }

    // Agent activity (per-agent metrics)
    if (event.userId && (event.type === "workflow_complete" || event.type === "workflow_start")) {
      if (!stats.agentActivity[event.userId]) {
        stats.agentActivity[event.userId] = { events: 0, workflowsCompleted: 0, averageWorkflowTime: 0 };
      }
      stats.agentActivity[event.userId].events++;
      if (event.type === "workflow_complete") {
        stats.agentActivity[event.userId].workflowsCompleted++;
        // Update average workflow time
        const agent = stats.agentActivity[event.userId];
        if (event.duration) {
          const total = agent.averageWorkflowTime * (agent.workflowsCompleted - 1) + event.duration;
          agent.averageWorkflowTime = total / agent.workflowsCompleted;
        }
      }
    }
  }

  // Calculate workflow abandonment rates
  for (const [workflow, startedSessions] of Object.entries(workflowStarts)) {
    const completedSessions = workflowCompletes[workflow] || new Set();
    const abandoned = startedSessions.size - completedSessions.size;
    stats.workflowAbandonment[workflow] = {
      started: startedSessions.size,
      completed: completedSessions.size,
      abandoned,
      abandonmentRate: startedSessions.size > 0 ? abandoned / startedSessions.size : 0,
    };
  }

  // Calculate workflow stage durations
  for (const [workflow, stages] of Object.entries(workflowStageData)) {
    for (const [stage, durations] of Object.entries(stages)) {
      if (durations.length > 0) {
        const average = durations.reduce((a, b) => a + b, 0) / durations.length;
        stats.workflowBottlenecks.push({
          workflow,
          stage,
          averageDuration: average,
          eventCount: durations.length,
        });
      }
    }
  }
  stats.workflowBottlenecks.sort((a, b) => b.averageDuration - a.averageDuration);

  // Calculate bottlenecks (pages with high average duration)
  for (const [page, durations] of Object.entries(pageDurations)) {
    if (durations.length > 0) {
      const average = durations.reduce((a, b) => a + b, 0) / durations.length;
      stats.bottlenecks.push({
        page,
        averageDuration: average,
        eventCount: durations.length,
      });
    }
  }
  stats.bottlenecks.sort((a, b) => b.averageDuration - a.averageDuration);

  // Calculate high traffic areas
  for (const [page, count] of Object.entries(pageViewCounts)) {
    stats.highTrafficAreas.push({ page, viewCount: count });
  }
  stats.highTrafficAreas.sort((a, b) => b.viewCount - a.viewCount);

  // Calculate abandonment points
  for (const [key, data] of Object.entries(abandonmentData)) {
    const [type, identifier] = key.split(":");
    if (type === "workflow") {
      const workflow = stats.workflowAbandonment[identifier];
      if (workflow) {
        stats.abandonmentPoints.push({
          page: identifier,
          workflow: identifier,
          abandonmentCount: data.count,
          abandonmentRate: workflow.abandonmentRate,
        });
      }
    } else if (type === "form") {
      stats.abandonmentPoints.push({
        page: identifier,
        abandonmentCount: data.count,
        abandonmentRate: data.total > 0 ? data.count / data.total : 0,
      });
    }
  }
  stats.abandonmentPoints.sort((a, b) => b.abandonmentRate - a.abandonmentRate);

  return stats;
}

/**
 * Get top actions by frequency
 */
export function getTopActions(stats: UsageStats, limit: number = 10): Array<{ action: string; count: number }> {
  return Object.entries(stats.actionFrequency)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get slowest workflows
 */
export function getSlowestWorkflows(stats: UsageStats, limit: number = 10): Array<{ workflow: string; average: number }> {
  return Object.entries(stats.workflowDurations)
    .map(([workflow, data]) => ({ workflow, average: data.average }))
    .sort((a, b) => b.average - a.average)
    .slice(0, limit);
}

/**
 * Track workflow stage (Task 33: Workflow Completion Metrics)
 */
export function trackWorkflowStage(
  workflow: string,
  stage: string,
  duration: number,
  metadata?: Record<string, any>
): UsageEvent {
  return trackEvent("workflow_stage", {
    action: workflow,
    duration,
    metadata: {
      stage,
      ...metadata,
    },
  });
}

/**
 * Track hesitation (hover but no click - indicates confusion)
 */
export function trackHesitation(
  page: string,
  component: string,
  hoverDuration: number
): UsageEvent {
  // If hover duration > 2 seconds without click, it's a hesitation
  if (hoverDuration > 2000) {
    return trackEvent("hesitation", {
      page,
      component,
      duration: hoverDuration,
    });
  }
  return trackEvent("hover", {
    page,
    component,
    duration: hoverDuration,
  });
}

/**
 * Track workflow abandonment (Task 34: Abandonment Tracking)
 */
export function trackWorkflowAbandonment(
  workflow: string,
  stage?: string,
  reason?: string
): UsageEvent {
  return trackEvent("workflow_abandon", {
    action: workflow,
    metadata: {
      stage,
      reason,
    },
  });
}

/**
 * Track form abandonment
 */
export function trackFormAbandonment(
  page: string,
  formId: string,
  fieldsCompleted: number,
  totalFields: number
): UsageEvent {
  return trackEvent("form_abandon", {
    page,
    component: formId,
    metadata: {
      fieldsCompleted,
      totalFields,
      completionRate: totalFields > 0 ? fieldsCompleted / totalFields : 0,
    },
  });
}

/**
 * Get workflow completion metrics per agent (Task 33)
 */
export function getAgentWorkflowMetrics(
  stats: UsageStats,
  agentId: string
): {
  workflowsCompleted: number;
  averageWorkflowTime: number;
  totalEvents: number;
} | null {
  const agent = stats.agentActivity[agentId];
  if (!agent) return null;
  
  return {
    workflowsCompleted: agent.workflowsCompleted,
    averageWorkflowTime: agent.averageWorkflowTime,
    totalEvents: agent.events,
  };
}

/**
 * Get workflow stage durations (Task 33)
 */
export function getWorkflowStageDurations(
  stats: UsageStats,
  workflow: string
): Record<string, { count: number; total: number; average: number }> {
  return stats.workflowStageDurations[workflow] || {};
}

/**
 * Get abandonment points (Task 34)
 */
export function getAbandonmentPoints(
  stats: UsageStats,
  limit: number = 10
): Array<{
  page?: string;
  workflow?: string;
  stage?: string;
  abandonmentCount: number;
  abandonmentRate: number;
}> {
  return stats.abandonmentPoints.slice(0, limit);
}

/**
 * Get workflow abandonment rates (Task 34)
 */
export function getWorkflowAbandonmentRates(
  stats: UsageStats
): Record<string, {
  started: number;
  completed: number;
  abandoned: number;
  abandonmentRate: number;
}> {
  return stats.workflowAbandonment;
}

/**
 * Get hesitation hotspots (components with high hesitation rates)
 */
export function getHesitationHotspots(
  stats: UsageStats,
  limit: number = 10
): Array<{ component: string; hesitationCount: number; clickCount: number; hesitationRate: number }> {
  const hotspots: Array<{ component: string; hesitationCount: number; clickCount: number; hesitationRate: number }> = [];
  
  // Combine click and hesitation events by component
  const componentData: Record<string, { clicks: number; hesitations: number }> = {};
  
  for (const [key, count] of Object.entries(stats.clickEvents)) {
    const component = key.split(":")[1] || key;
    if (!componentData[component]) {
      componentData[component] = { clicks: 0, hesitations: 0 };
    }
    componentData[component].clicks += count;
  }
  
  for (const [key, count] of Object.entries(stats.hesitationEvents)) {
    const component = key.split(":")[1] || key;
    if (!componentData[component]) {
      componentData[component] = { clicks: 0, hesitations: 0 };
    }
    componentData[component].hesitations += count;
  }
  
  for (const [component, data] of Object.entries(componentData)) {
    const total = data.clicks + data.hesitations;
    if (total > 0) {
      hotspots.push({
        component,
        hesitationCount: data.hesitations,
        clickCount: data.clicks,
        hesitationRate: data.hesitations / total,
      });
    }
  }
  
  return hotspots
    .sort((a, b) => b.hesitationRate - a.hesitationRate)
    .slice(0, limit);
}
