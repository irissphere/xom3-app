// Cockpit Agent API - Type Definitions
// TypeScript types for the Agent API contract

import { CockpitView, CockpitDecision } from "./types";

/**
 * Command Mode Types
 */
export type CommandMode = "direct" | "contextual" | "ritual" | "state_driven" | "autonomous";

/**
 * Agent Trigger Request
 */
export interface AgentTriggerRequest {
  // Core execution parameters
  action: string;
  mode?: CommandMode;
  
  // Execution context
  context?: {
    view?: CockpitView;
    state?: string;
    ritual?: string;
    signal?: string;
    tenant?: string;
  };
  
  // Agent-specific payload
  payload?: Record<string, any>;
  
  // Execution options
  options?: {
    timeout?: number;
    priority?: "low" | "medium" | "high" | "critical";
    retry?: RetryConfig;
    async?: boolean;
    waitForCompletion?: boolean;
  };
  
  // Metadata
  metadata?: {
    source?: string;
    correlationId?: string;
    tags?: string[];
  };
}

/**
 * Retry Configuration
 */
export interface RetryConfig {
  enabled: boolean;
  maxAttempts?: number;
  backoffStrategy?: "fixed" | "exponential" | "linear";
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  retryableErrors?: string[];
}

/**
 * Agent Status
 */
export type AgentStatus = "idle" | "active" | "busy" | "error";

/**
 * Execution Status
 */
export type ExecutionStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "scheduled";

/**
 * Agent Trigger Response (Success)
 */
export interface AgentTriggerResponse {
  success: true;
  execution: {
    executionId: string;
    agentId: string;
    status: ExecutionStatus;
    result?: any;
    startedAt: string;
    completedAt?: string;
    duration?: number;
  };
  agent: {
    id: string;
    name: string;
    type: string;
    status: AgentStatus;
    load: number;
  };
  decisions?: CockpitDecision[];
  message: string;
  timestamp: string;
}

/**
 * Agent Trigger Async Response
 */
export interface AgentTriggerAsyncResponse {
  success: true;
  execution: {
    executionId: string;
    agentId: string;
    status: "pending" | "running";
    startedAt: string;
    estimatedCompletion?: string;
    statusUrl: string;
  };
  agent: {
    id: string;
    name: string;
    type: string;
    status: "active" | "busy";
  };
  message: string;
  timestamp: string;
}

/**
 * Agent Error Code
 */
export type AgentErrorCode =
  | "AGENT_NOT_FOUND"
  | "AGENT_DISABLED"
  | "AGENT_BUSY"
  | "INVALID_ACTION"
  | "INVALID_PAYLOAD"
  | "INVALID_CONTEXT"
  | "TIMEOUT"
  | "EXECUTION_FAILED"
  | "RATE_LIMITED"
  | "TENANT_MISMATCH"
  | "AUTHORIZATION_FAILED"
  | "DEPENDENCY_UNAVAILABLE"
  | "RESOURCE_EXHAUSTED"
  | "INTERNAL_ERROR";

/**
 * Agent Trigger Error Response
 */
export interface AgentTriggerErrorResponse {
  success: false;
  error: {
    code: AgentErrorCode;
    message: string;
    details?: Record<string, any>;
    executionId?: string;
    requestId?: string;
    retryable: boolean;
    retryAfter?: number;
  };
  agent?: {
    id: string;
    status: string;
  };
  timestamp: string;
}

/**
 * Execution Status Response
 */
export interface ExecutionStatusResponse {
  executionId: string;
  agentId: string;
  status: ExecutionStatus;
  progress?: number;
  result?: any;
  error?: {
    code: string;
    message: string;
  };
  startedAt: string;
  completedAt?: string;
  duration?: number;
  estimatedCompletion?: string;
}

/**
 * Agent Log Level
 */
export type AgentLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

/**
 * Agent Log Entry
 */
export interface AgentLogEntry {
  timestamp: string;
  level: AgentLogLevel;
  agentId: string;
  executionId?: string;
  requestId?: string;
  correlationId?: string;
  tenant?: string;
  userId?: string;
  message: string;
  context?: {
    action?: string;
    mode?: string;
    status?: string;
    duration?: number;
    error?: {
      code?: string;
      message?: string;
      stack?: string;
    };
    metrics?: {
      load?: number;
      latency?: number;
      throughput?: number;
    };
  };
  metadata?: Record<string, any>;
}

/**
 * Agent API Client Options
 */
export interface AgentAPIClientOptions {
  baseUrl?: string;
  defaultTimeout?: number;
  defaultRetry?: RetryConfig;
  headers?: Record<string, string>;
}

/**
 * Calculate backoff delay
 */
export function calculateBackoff(
  attempt: number,
  strategy: "fixed" | "exponential" | "linear",
  initialDelay: number,
  multiplier: number = 2,
  maxDelay: number = 30000
): number {
  let delay: number;

  switch (strategy) {
    case "fixed":
      delay = initialDelay;
      break;
    case "exponential":
      delay = initialDelay * Math.pow(multiplier, attempt);
      break;
    case "linear":
      delay = initialDelay * (1 + attempt * multiplier);
      break;
    default:
      delay = initialDelay;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AgentTriggerErrorResponse): boolean {
  return error.error.retryable;
}

/**
 * Get retry delay from error or calculate
 */
export function getRetryDelay(
  error: AgentTriggerErrorResponse,
  attempt: number,
  config: RetryConfig
): number {
  if (error.error.retryAfter) {
    return error.error.retryAfter * 1000; // Convert seconds to milliseconds
  }

  const strategy = config.backoffStrategy || "exponential";
  const initialDelay = config.initialDelay || 1000;
  const multiplier = config.multiplier || 2;
  const maxDelay = config.maxDelay || 30000;

  return calculateBackoff(attempt, strategy, initialDelay, multiplier, maxDelay);
}
