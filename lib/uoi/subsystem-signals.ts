// UOI Subsystem Signal Emitters
// Helper functions for subsystems to emit signals to UOI

import { emitSignal } from "./signals";

/**
 * Emit a pipeline execution signal
 */
export function emitPipelineSignal(
  pipelineId: string,
  status: "started" | "completed" | "failed",
  metrics?: {
    duration?: number;
    recordsProcessed?: number;
    errorsCount?: number;
  }
): void {
  const errorRate = metrics?.recordsProcessed 
    ? (metrics.errorsCount || 0) / metrics.recordsProcessed 
    : 0;
  
  emitSignal({
    id: `pipeline-${pipelineId}-${Date.now()}`,
    source: "amp",
    type: status === "failed" ? "error" : "metric",
    payload: {
      pipelineId,
      status,
      duration: metrics?.duration,
      recordsProcessed: metrics?.recordsProcessed,
      errorsCount: metrics?.errorsCount,
      errorRate,
    },
    timestamp: new Date().toISOString(),
    priority: status === "failed" ? "high" : "medium",
  });
}

/**
 * Emit a workflow execution signal
 */
export function emitWorkflowSignal(
  workflowId: string,
  workflowName: string,
  status: "started" | "completed" | "failed" | "waiting",
  executionId?: string
): void {
  emitSignal({
    id: `workflow-${workflowId}-${Date.now()}`,
    source: "workflow",
    type: status === "failed" ? "error" : "event",
    payload: {
      workflowId,
      workflowName,
      status,
      executionId,
    },
    timestamp: new Date().toISOString(),
    priority: status === "failed" ? "high" : "low",
  });
}

/**
 * Emit a compliance check signal
 */
export function emitComplianceSignal(
  checkId: string,
  checkType: string,
  passed: boolean,
  violations?: string[]
): void {
  emitSignal({
    id: `compliance-${checkId}-${Date.now()}`,
    source: "compliance",
    type: passed ? "event" : "anomaly",
    payload: {
      checkId,
      checkType,
      passed,
      violations: violations || [],
      violationCount: violations?.length || 0,
    },
    timestamp: new Date().toISOString(),
    priority: passed ? "low" : "high",
  });
}

/**
 * Emit a tenant activity signal
 */
export function emitTenantSignal(
  tenantId: string,
  activity: string,
  metrics?: Record<string, number>
): void {
  emitSignal({
    id: `tenant-${tenantId}-${Date.now()}`,
    source: "tenant",
    type: "metric",
    payload: {
      tenantId,
      activity,
      metrics: metrics || {},
    },
    timestamp: new Date().toISOString(),
    priority: "low",
  });
}

/**
 * Emit a drift detection signal
 */
export function emitDriftSignal(
  subsystem: string,
  driftType: "schema" | "mapping" | "config" | "threshold",
  severity: number, // 0-1
  details?: string
): void {
  emitSignal({
    id: `drift-${subsystem}-${Date.now()}`,
    source: subsystem,
    type: "drift",
    payload: {
      driftType,
      severity,
      details,
      detectedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    priority: severity > 0.7 ? "high" : severity > 0.4 ? "medium" : "low",
  });
}

/**
 * Emit an anomaly detection signal
 */
export function emitAnomalySignal(
  subsystem: string,
  anomalyType: string,
  description: string,
  context?: Record<string, any>
): void {
  emitSignal({
    id: `anomaly-${subsystem}-${Date.now()}`,
    source: subsystem,
    type: "anomaly",
    payload: {
      anomalyType,
      description,
      context: context || {},
      detectedAt: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
    priority: "high",
  });
}

/**
 * Emit an error signal
 */
export function emitErrorSignal(
  subsystem: string,
  errorType: string,
  message: string,
  stack?: string,
  context?: Record<string, any>
): void {
  emitSignal({
    id: `error-${subsystem}-${Date.now()}`,
    source: subsystem,
    type: "error",
    payload: {
      errorType,
      message,
      stack,
      context: context || {},
      errorRate: 1, // Single error
    },
    timestamp: new Date().toISOString(),
    priority: "critical",
  });
}

/**
 * Emit a metric signal
 */
export function emitMetricSignal(
  subsystem: string,
  metricName: string,
  value: number,
  unit?: string,
  tags?: Record<string, string>
): void {
  emitSignal({
    id: `metric-${subsystem}-${metricName}-${Date.now()}`,
    source: subsystem,
    type: "metric",
    payload: {
      metricName,
      value,
      unit,
      tags: tags || {},
    },
    timestamp: new Date().toISOString(),
    priority: "low",
  });
}

/**
 * Emit a pattern detection signal
 */
export function emitPatternSignal(
  subsystem: string,
  patternType: string,
  confidence: number,
  description: string,
  data?: Record<string, any>
): void {
  emitSignal({
    id: `pattern-${subsystem}-${Date.now()}`,
    source: subsystem,
    type: "pattern",
    payload: {
      patternType,
      confidence,
      description,
      data: data || {},
    },
    timestamp: new Date().toISOString(),
    priority: confidence > 0.8 ? "medium" : "low",
  });
}

/**
 * Emit a queue pressure signal
 */
export function emitQueuePressureSignal(
  subsystem: string,
  queueName: string,
  queueSize: number,
  maxSize: number
): void {
  const pressure = queueSize / maxSize;
  
  emitSignal({
    id: `queue-${subsystem}-${queueName}-${Date.now()}`,
    source: subsystem,
    type: "metric",
    payload: {
      queueName,
      queueSize,
      maxSize,
      pressure,
      workflowQueue: queueSize, // For governance rules
    },
    timestamp: new Date().toISOString(),
    priority: pressure > 0.8 ? "high" : pressure > 0.5 ? "medium" : "low",
  });
}

/**
 * Emit a throughput signal
 */
export function emitThroughputSignal(
  subsystem: string,
  currentThroughput: number,
  expectedThroughput: number
): void {
  const drop = (expectedThroughput - currentThroughput) / expectedThroughput;
  
  emitSignal({
    id: `throughput-${subsystem}-${Date.now()}`,
    source: subsystem,
    type: "metric",
    payload: {
      currentThroughput,
      expectedThroughput,
      throughputDrop: Math.max(0, drop), // For governance rules
    },
    timestamp: new Date().toISOString(),
    priority: drop > 0.3 ? "high" : drop > 0.1 ? "medium" : "low",
  });
}

/**
 * Create a subsystem emitter with pre-configured source
 */
export function createSubsystemEmitter(subsystem: string) {
  return {
    pipeline: (pipelineId: string, status: "started" | "completed" | "failed", metrics?: any) =>
      emitPipelineSignal(pipelineId, status, metrics),
    workflow: (workflowId: string, name: string, status: any, executionId?: string) =>
      emitWorkflowSignal(workflowId, name, status, executionId),
    compliance: (checkId: string, checkType: string, passed: boolean, violations?: string[]) =>
      emitComplianceSignal(checkId, checkType, passed, violations),
    drift: (driftType: any, severity: number, details?: string) =>
      emitDriftSignal(subsystem, driftType, severity, details),
    anomaly: (anomalyType: string, description: string, context?: any) =>
      emitAnomalySignal(subsystem, anomalyType, description, context),
    error: (errorType: string, message: string, stack?: string, context?: any) =>
      emitErrorSignal(subsystem, errorType, message, stack, context),
    metric: (metricName: string, value: number, unit?: string, tags?: any) =>
      emitMetricSignal(subsystem, metricName, value, unit, tags),
    pattern: (patternType: string, confidence: number, description: string, data?: any) =>
      emitPatternSignal(subsystem, patternType, confidence, description, data),
    queuePressure: (queueName: string, queueSize: number, maxSize: number) =>
      emitQueuePressureSignal(subsystem, queueName, queueSize, maxSize),
    throughput: (current: number, expected: number) =>
      emitThroughputSignal(subsystem, current, expected),
  };
}

// Pre-configured emitters for common subsystems
export const ampSignals = createSubsystemEmitter("amp");
export const workflowSignals = createSubsystemEmitter("workflow");
export const complianceSignals = createSubsystemEmitter("compliance");
export const analyticsSignals = createSubsystemEmitter("analytics");
export const notificationSignals = createSubsystemEmitter("notification");
export const tenantSignals = createSubsystemEmitter("tenant");
export const broadcastSignals = createSubsystemEmitter("broadcast");
export const commerceSignals = createSubsystemEmitter("commerce");
export const healthcareSignals = createSubsystemEmitter("healthcare");
