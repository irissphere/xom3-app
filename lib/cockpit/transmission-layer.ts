// Unified Cockpit - Transmission Layer (STRIKE 15)
// The broadcast nervous system that allows EXOM3 to communicate outward
// AKV: Clean, surgical, zero drift

import {
  CockpitSignal,
  CockpitState,
  CockpitDecision,
} from "./types";
import { cockpitStateEngine } from "./state-engine";
import { cockpitPersonaLayer } from "./persona-layer";
import { cockpitIntegrationLayer } from "./integration-layer";
import { cockpitContinuityLayer } from "./continuity-layer";

/**
 * Transmission Channel Types
 * The 5 pathways through which EXOM3 speaks
 */
export type TransmissionChannel =
  | "operator" // Operator awareness
  | "agent" // Crew coordination
  | "system" // Organism transparency
  | "external" // External synchronization
  | "lineage"; // Legacy preservation

/**
 * Transmission Priority
 */
export type TransmissionPriority = "low" | "medium" | "high" | "critical";

/**
 * Transmission Message
 */
export interface TransmissionMessage {
  id: string;
  channel: TransmissionChannel;
  priority: TransmissionPriority;
  type: string;
  content: Record<string, any>;
  recipient?: string;
  timestamp: string;
  delivered: boolean;
  metadata?: Record<string, any>;
}

/**
 * Transmission Result
 */
export interface TransmissionResult {
  success: boolean;
  messageId: string;
  channel: TransmissionChannel;
  delivered: boolean;
  error?: string;
  timestamp: string;
}

/**
 * Operator Transmission Channel
 * Sends: alerts, state changes, ritual prompts, anomaly warnings, scaling opportunities, optimization cycles
 */
export class OperatorTransmissionChannel {
  private messageHistory: TransmissionMessage[] = [];
  private maxHistory = 500;

  /**
   * Transmit to operator
   */
  async transmit(
    type: "alert" | "state_change" | "ritual_prompt" | "anomaly_warning" | "scaling_opportunity" | "optimization_cycle",
    content: Record<string, any>,
    priority: TransmissionPriority = "medium"
  ): Promise<TransmissionResult> {
    const message: TransmissionMessage = {
      id: `transmission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: "operator",
      priority,
      type,
      content,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    try {
      // Generate persona-appropriate message
      const personaExpression = cockpitPersonaLayer.generatePersonalizedMessage(
        `${type}: ${JSON.stringify(content)}`,
        { state: content.state }
      );

      // Add persona expression to content
      message.content.personaExpression = personaExpression;

      // Mark as delivered (would actually send to UI/notifications)
      message.delivered = true;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      return {
        success: true,
        messageId: message.id,
        channel: "operator",
        delivered: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: message.id,
        channel: "operator",
        delivered: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 50): TransmissionMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

/**
 * Agent Transmission Channel
 * Sends: tasks, scripts, load balancing signals, performance feedback, anomaly assignments
 */
export class AgentTransmissionChannel {
  private messageHistory: TransmissionMessage[] = [];
  private maxHistory = 500;

  /**
   * Transmit to agent
   */
  async transmit(
    type: "task" | "script" | "load_balance" | "performance_feedback" | "anomaly_assignment",
    content: Record<string, any>,
    agentId?: string,
    priority: TransmissionPriority = "medium"
  ): Promise<TransmissionResult> {
    const message: TransmissionMessage = {
      id: `transmission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: "agent",
      priority,
      type,
      content,
      recipient: agentId,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    try {
      // Mark as delivered (would actually send to agent system)
      message.delivered = true;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      return {
        success: true,
        messageId: message.id,
        channel: "agent",
        delivered: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: message.id,
        channel: "agent",
        delivered: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 50): TransmissionMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

/**
 * System Transmission Channel
 * Sends: engine logs, state transitions, error reports, recovery events, optimization results
 */
export class SystemTransmissionChannel {
  private messageHistory: TransmissionMessage[] = [];
  private maxHistory = 1000;

  /**
   * Transmit to system
   */
  async transmit(
    type: "engine_log" | "state_transition" | "error_report" | "recovery_event" | "optimization_result",
    content: Record<string, any>,
    priority: TransmissionPriority = "low"
  ): Promise<TransmissionResult> {
    const message: TransmissionMessage = {
      id: `transmission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: "system",
      priority,
      type,
      content,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    try {
      // Mark as delivered (would actually log to system logs)
      message.delivered = true;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      return {
        success: true,
        messageId: message.id,
        channel: "system",
        delivered: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: message.id,
        channel: "system",
        delivered: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 100): TransmissionMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

/**
 * External Transmission Channel
 * Sends: API calls, webhooks, automation triggers, posting signals, ad adjustments, CRM updates
 */
export class ExternalTransmissionChannel {
  private messageHistory: TransmissionMessage[] = [];
  private maxHistory = 500;

  /**
   * Transmit to external system
   */
  async transmit(
    type: "api_call" | "webhook" | "automation_trigger" | "posting_signal" | "ad_adjustment" | "crm_update",
    content: Record<string, any>,
    integrationId?: string,
    priority: TransmissionPriority = "medium"
  ): Promise<TransmissionResult> {
    const message: TransmissionMessage = {
      id: `transmission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: "external",
      priority,
      type,
      content,
      recipient: integrationId,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    try {
      // Delegate to integration layer for actual transmission
      if (integrationId) {
        await cockpitIntegrationLayer.sendAction(integrationId, type, content);
      }

      message.delivered = true;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      return {
        success: true,
        messageId: message.id,
        channel: "external",
        delivered: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: message.id,
        channel: "external",
        delivered: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 50): TransmissionMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

/**
 * Lineage Transmission Channel
 * Sends: crest updates, codex entries, ritual logs, evolution notes, mythic markers
 */
export class LineageTransmissionChannel {
  private messageHistory: TransmissionMessage[] = [];
  private maxHistory = 200;

  /**
   * Transmit to lineage
   */
  async transmit(
    type: "crest_update" | "codex_entry" | "ritual_log" | "evolution_note" | "mythic_marker",
    content: Record<string, any>,
    priority: TransmissionPriority = "low"
  ): Promise<TransmissionResult> {
    const message: TransmissionMessage = {
      id: `transmission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: "lineage",
      priority,
      type,
      content,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    try {
      // Preserve in lineage
      const lineageId = cockpitContinuityLayer.preserveLineage(
        type === "crest_update" ? "crest" :
        type === "codex_entry" ? "codex" :
        type === "ritual_log" ? "ritual" :
        type === "evolution_note" ? "evolution" :
        "mythos",
        content
      );

      message.content.lineageId = lineageId;
      message.delivered = true;

      this.messageHistory.push(message);
      if (this.messageHistory.length > this.maxHistory) {
        this.messageHistory.shift();
      }

      return {
        success: true,
        messageId: message.id,
        channel: "lineage",
        delivered: true,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: message.id,
        channel: "lineage",
        delivered: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get message history
   */
  getHistory(limit: number = 50): TransmissionMessage[] {
    return this.messageHistory.slice(-limit);
  }
}

/**
 * Cockpit Transmission Layer
 * Main orchestrator for all transmission channels
 */
export class CockpitTransmissionLayer {
  private operatorChannel: OperatorTransmissionChannel;
  private agentChannel: AgentTransmissionChannel;
  private systemChannel: SystemTransmissionChannel;
  private externalChannel: ExternalTransmissionChannel;
  private lineageChannel: LineageTransmissionChannel;

  constructor() {
    this.operatorChannel = new OperatorTransmissionChannel();
    this.agentChannel = new AgentTransmissionChannel();
    this.systemChannel = new SystemTransmissionChannel();
    this.externalChannel = new ExternalTransmissionChannel();
    this.lineageChannel = new LineageTransmissionChannel();
  }

  /**
   * Broadcast - transmit to multiple channels
   */
  async broadcast(
    channels: TransmissionChannel[],
    type: string,
    content: Record<string, any>,
    priority: TransmissionPriority = "medium"
  ): Promise<TransmissionResult[]> {
    const results: TransmissionResult[] = [];

    for (const channel of channels) {
      let result: TransmissionResult;

      switch (channel) {
        case "operator":
          result = await this.operatorChannel.transmit(type as any, content, priority);
          break;
        case "agent":
          result = await this.agentChannel.transmit(type as any, content, undefined, priority);
          break;
        case "system":
          result = await this.systemChannel.transmit(type as any, content, priority);
          break;
        case "external":
          result = await this.externalChannel.transmit(type as any, content, undefined, priority);
          break;
        case "lineage":
          result = await this.lineageChannel.transmit(type as any, content, priority);
          break;
        default:
          result = {
            success: false,
            messageId: "unknown",
            channel,
            delivered: false,
            error: `Unknown channel: ${channel}`,
            timestamp: new Date().toISOString(),
          };
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Transmit to specific channel
   */
  async transmit(
    channel: TransmissionChannel,
    type: string,
    content: Record<string, any>,
    options?: {
      priority?: TransmissionPriority;
      recipient?: string;
      integrationId?: string;
    }
  ): Promise<TransmissionResult> {
    const priority = options?.priority || "medium";

    switch (channel) {
      case "operator":
        return await this.operatorChannel.transmit(type as any, content, priority);
      case "agent":
        return await this.agentChannel.transmit(type as any, content, options?.recipient, priority);
      case "system":
        return await this.systemChannel.transmit(type as any, content, priority);
      case "external":
        return await this.externalChannel.transmit(type as any, content, options?.integrationId, priority);
      case "lineage":
        return await this.lineageChannel.transmit(type as any, content, priority);
      default:
        return {
          success: false,
          messageId: "unknown",
          channel,
          delivered: false,
          error: `Unknown channel: ${channel}`,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Get transmission history
   */
  getHistory(channel?: TransmissionChannel, limit: number = 50): TransmissionMessage[] {
    if (channel) {
      switch (channel) {
        case "operator":
          return this.operatorChannel.getHistory(limit);
        case "agent":
          return this.agentChannel.getHistory(limit);
        case "system":
          return this.systemChannel.getHistory(limit);
        case "external":
          return this.externalChannel.getHistory(limit);
        case "lineage":
          return this.lineageChannel.getHistory(limit);
        default:
          return [];
      }
    }

    // Return all channels
    return [
      ...this.operatorChannel.getHistory(limit),
      ...this.agentChannel.getHistory(limit),
      ...this.systemChannel.getHistory(limit),
      ...this.externalChannel.getHistory(limit),
      ...this.lineageChannel.getHistory(limit),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get transmission status
   */
  getStatus(): {
    operator: { messages: number; delivered: number };
    agent: { messages: number; delivered: number };
    system: { messages: number; delivered: number };
    external: { messages: number; delivered: number };
    lineage: { messages: number; delivered: number };
  } {
    const operatorHistory = this.operatorChannel.getHistory(1000);
    const agentHistory = this.agentChannel.getHistory(1000);
    const systemHistory = this.systemChannel.getHistory(1000);
    const externalHistory = this.externalChannel.getHistory(1000);
    const lineageHistory = this.lineageChannel.getHistory(1000);

    return {
      operator: {
        messages: operatorHistory.length,
        delivered: operatorHistory.filter((m) => m.delivered).length,
      },
      agent: {
        messages: agentHistory.length,
        delivered: agentHistory.filter((m) => m.delivered).length,
      },
      system: {
        messages: systemHistory.length,
        delivered: systemHistory.filter((m) => m.delivered).length,
      },
      external: {
        messages: externalHistory.length,
        delivered: externalHistory.filter((m) => m.delivered).length,
      },
      lineage: {
        messages: lineageHistory.length,
        delivered: lineageHistory.filter((m) => m.delivered).length,
      },
    };
  }
}

// Export singleton instance
export const cockpitTransmissionLayer = new CockpitTransmissionLayer();
