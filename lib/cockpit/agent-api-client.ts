// Cockpit Agent API Client
// Reference implementation for triggering agents

import {
  AgentTriggerRequest,
  AgentTriggerResponse,
  AgentTriggerAsyncResponse,
  AgentTriggerErrorResponse,
  ExecutionStatusResponse,
  AgentAPIClientOptions,
  RetryConfig,
  getRetryDelay,
  isRetryableError,
} from "./agent-api-types";

/**
 * Agent API Client
 */
export class AgentAPIClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetry: RetryConfig;
  private defaultHeaders: Record<string, string>;

  constructor(options: AgentAPIClientOptions = {}) {
    this.baseUrl = options.baseUrl || "/api/cockpit/agent";
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.defaultRetry = options.defaultRetry || {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: "exponential",
      initialDelay: 1000,
    };
    this.defaultHeaders = options.headers || {};
  }

  /**
   * Trigger an agent
   */
  async triggerAgent(
    agentId: string,
    request: AgentTriggerRequest
  ): Promise<AgentTriggerResponse | AgentTriggerAsyncResponse> {
    const url = `${this.baseUrl}/${agentId}/trigger`;
    const requestId = this.generateRequestId();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
        ...this.defaultHeaders,
      },
      body: JSON.stringify({
        ...request,
        options: {
          timeout: this.defaultTimeout,
          ...this.defaultRetry,
          ...request.options,
        },
      }),
    });

    if (!response.ok) {
      const error: AgentTriggerErrorResponse = await response.json();
      throw new AgentAPIError(error);
    }

    return await response.json();
  }

  /**
   * Trigger an agent with automatic retry
   */
  async triggerAgentWithRetry(
    agentId: string,
    request: AgentTriggerRequest
  ): Promise<AgentTriggerResponse | AgentTriggerAsyncResponse> {
    const retryConfig = request.options?.retry || this.defaultRetry;
    let lastError: AgentAPIError | null = null;
    let attempt = 0;
    const maxAttempts = retryConfig.maxAttempts || 3;

    while (attempt < maxAttempts) {
      try {
        return await this.triggerAgent(agentId, request);
      } catch (error) {
        if (!(error instanceof AgentAPIError)) {
          throw error;
        }

        lastError = error;

        if (!isRetryableError(error.errorResponse) || attempt >= maxAttempts - 1) {
          throw error;
        }

        const delay = getRetryDelay(error.errorResponse, attempt, retryConfig);
        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastError || new Error("Max retry attempts reached");
  }

  /**
   * Get execution status
   */
  async getExecutionStatus(
    agentId: string,
    executionId: string
  ): Promise<ExecutionStatusResponse> {
    const url = `${this.baseUrl}/${agentId}/execution/${executionId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.defaultHeaders,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AgentAPIError(error);
    }

    return await response.json();
  }

  /**
   * Wait for execution to complete
   */
  async waitForExecution(
    agentId: string,
    executionId: string,
    options: {
      pollInterval?: number;
      timeout?: number;
    } = {}
  ): Promise<ExecutionStatusResponse> {
    const pollInterval = options.pollInterval || 1000;
    const timeout = options.timeout || 300000; // 5 minutes default
    const startTime = Date.now();

    while (true) {
      const status = await this.getExecutionStatus(agentId, executionId);

      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "cancelled"
      ) {
        return status;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Execution status check timeout");
      }

      await this.sleep(pollInterval);
    }
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Agent API Error
 */
export class AgentAPIError extends Error {
  public errorResponse: AgentTriggerErrorResponse;

  constructor(errorResponse: AgentTriggerErrorResponse) {
    super(errorResponse.error.message);
    this.name = "AgentAPIError";
    this.errorResponse = errorResponse;
  }

  get code(): string {
    return this.errorResponse.error.code;
  }

  get retryable(): boolean {
    return this.errorResponse.error.retryable;
  }

  get retryAfter(): number | undefined {
    return this.errorResponse.error.retryAfter;
  }
}

// Export singleton instance
export const agentAPIClient = new AgentAPIClient();
