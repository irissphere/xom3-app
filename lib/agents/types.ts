/**
 * XOM3 Agent Types
 * Core type definitions for the agent system
 */

export interface AgentConfig {
  id?: string;
  sovereign?: string;
  enabled?: boolean;
  autoStart?: boolean;
  schedule?: string;
  [key: string]: any;
}

export interface AgentExecutionResult {
  success: boolean;
  data?: any;
  errors?: Array<{ field: string; message: string }>;
  warnings?: string[];
  metadata: {
    executionId: string;
    duration: number;
    agentId: string;
    sovereign: string;
  };
}

export abstract class BaseAgent {
  public readonly id: string;
  protected config: AgentConfig;

  constructor(id: string, config: Partial<AgentConfig> = {}) {
    this.id = id;
    this.config = {
      enabled: true,
      autoStart: false,
      ...config,
    };
  }

  abstract execute(input: any): Promise<AgentExecutionResult>;

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public isEnabled(): boolean {
    return this.config.enabled ?? true;
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      agentId: this.id,
      level,
      message,
      data
    };

    console.log(`[${level.toUpperCase()}] ${this.id}: ${message}`, data ? data : '');
  }
}


