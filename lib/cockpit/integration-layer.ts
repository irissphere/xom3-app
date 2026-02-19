// Unified Cockpit - Integration Layer (STRIKE 11)
// The external nervous system that connects EXOM3 to the outside world
// AKV: Clean, surgical, zero drift

import {
  CockpitSignal,
  CockpitDecision,
} from "./types";
import { crossEngineSignalRouter } from "./signal-map";
import { cockpitIntelligenceEngine } from "./intelligence";

/**
 * Integration Channel Types
 * The 5 pathways that connect EXOM3 to the outside world
 */
export type IntegrationChannel =
  | "intake" // Data intake
  | "output" // Action output
  | "sync" // Synchronization
  | "protection" // Protection and fallback
  | "expansion"; // Expansion and growth

/**
 * Integration Type
 */
export type IntegrationType =
  | "api" // REST API
  | "webhook" // Webhook
  | "database" // Database connection
  | "stream" // Data stream
  | "oauth" // OAuth connection
  | "sdk"; // SDK integration

/**
 * Integration Status
 */
export type IntegrationStatus = "active" | "inactive" | "error" | "rate_limited" | "authenticating";

/**
 * Integration
 */
export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  channel: IntegrationChannel;
  system: string; // e.g., "shopify", "stripe", "meta", "tiktok"
  status: IntegrationStatus;
  config: {
    endpoint?: string;
    apiKey?: string;
    credentials?: Record<string, any>;
    rateLimit?: number;
    retryPolicy?: {
      maxRetries: number;
      backoffMs: number;
    };
  };
  lastSync?: string;
  lastError?: string;
  metadata?: Record<string, any>;
}

/**
 * Integration Result
 */
export interface IntegrationResult {
  success: boolean;
  integrationId: string;
  channel: IntegrationChannel;
  action: string;
  data?: any;
  error?: string;
  retries?: number;
  duration: number; // milliseconds
  timestamp: string;
}

/**
 * Data Intake Channel
 * Pulls in: analytics, revenue, leads, orders, engagement, trends, signals
 */
export class DataIntakeChannel {
  private integrations: Map<string, Integration> = new Map();

  /**
   * Register integration
   */
  registerIntegration(integration: Integration): void {
    this.integrations.set(integration.id, integration);
  }

  /**
   * Intake data from external system
   */
  async intakeData(
    integrationId: string,
    dataType: "analytics" | "revenue" | "leads" | "orders" | "engagement" | "trends" | "signals",
    data: any
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const integration = this.integrations.get(integrationId);

    if (!integration) {
      return {
        success: false,
        integrationId,
        channel: "intake",
        action: "intake_data",
        error: `Integration not found: ${integrationId}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Normalize data based on type
      const normalized = this.normalizeData(dataType, data);

      // Create signal for cockpit
      const signal: CockpitSignal = {
        id: `signal-intake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: integration.system,
        type: dataType,
        severity: "medium",
        payload: normalized,
        timestamp: Date.now(),
        processed: false,
      };

      // Route signal through cockpit
      const decisions = await crossEngineSignalRouter.routeSignal(signal);

      return {
        success: true,
        integrationId,
        channel: "intake",
        action: "intake_data",
        data: normalized,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        integrationId,
        channel: "intake",
        action: "intake_data",
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private normalizeData(dataType: string, data: any): Record<string, any> {
    // Normalize data to cockpit format
    return {
      type: dataType,
      raw: data,
      normalized: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get registered integrations
   */
  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }
}

/**
 * Action Output Channel
 * Sends commands to: ad platforms, email systems, SMS systems, posting tools, automation tools, CRM workflows
 */
export class ActionOutputChannel {
  private integrations: Map<string, Integration> = new Map();

  /**
   * Register integration
   */
  registerIntegration(integration: Integration): void {
    this.integrations.set(integration.id, integration);
  }

  /**
   * Send action to external system
   */
  async sendAction(
    integrationId: string,
    action: string,
    payload: Record<string, any>
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const integration = this.integrations.get(integrationId);

    if (!integration) {
      return {
        success: false,
        integrationId,
        channel: "output",
        action,
        error: `Integration not found: ${integrationId}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Execute action based on integration type
      let result: any;

      switch (integration.type) {
        case "api":
          result = await this.executeAPIAction(integration, action, payload);
          break;
        case "webhook":
          result = await this.executeWebhookAction(integration, action, payload);
          break;
        case "database":
          result = await this.executeDatabaseAction(integration, action, payload);
          break;
        default:
          throw new Error(`Unsupported integration type: ${integration.type}`);
      }

      return {
        success: true,
        integrationId,
        channel: "output",
        action,
        data: result,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        integrationId,
        channel: "output",
        action,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async executeAPIAction(
    integration: Integration,
    action: string,
    payload: Record<string, any>
  ): Promise<any> {
    const { endpoint, apiKey, credentials } = integration.config;
    
    if (!endpoint) {
      throw new Error(`No endpoint configured for integration: ${integration.name}`);
    }
    
    // Build request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    
    if (credentials?.headerKey && credentials?.headerValue) {
      headers[credentials.headerKey] = credentials.headerValue;
    }
    
    // Execute API call
    const response = await fetch(`${endpoint}/${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  private async executeWebhookAction(
    integration: Integration,
    action: string,
    payload: Record<string, any>
  ): Promise<any> {
    const { endpoint } = integration.config;
    
    if (!endpoint) {
      throw new Error(`No webhook endpoint configured for integration: ${integration.name}`);
    }
    
    // Execute webhook call
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Integration-Action": action,
        "X-Integration-Source": "xom3-cockpit",
      },
      body: JSON.stringify({
        action,
        payload,
        timestamp: new Date().toISOString(),
        integration: integration.id,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
    }
    
    // Webhooks may not return JSON
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return await response.json();
    }
    
    return { success: true, action, statusCode: response.status };
  }

  private async executeDatabaseAction(
    integration: Integration,
    action: string,
    payload: Record<string, any>
  ): Promise<any> {
    // Database operations are handled through specific adapters
    // This is a placeholder for direct DB integrations (e.g., Supabase, Postgres)
    const { credentials } = integration.config;
    
    // For now, emit a signal that database action was requested
    // In production, this would route to the appropriate DB client
    console.log(`[INTEGRATION] Database action requested: ${action}`, {
      integration: integration.name,
      payload,
    });
    
    return { 
      executed: true, 
      action, 
      integration: integration.name,
      note: "Database actions route through appropriate adapters",
    };
  }

  /**
   * Get registered integrations
   */
  getIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }
}

/**
 * Sync Channel
 * Keeps: leads, orders, tasks, contacts, campaigns, funnels in sync across systems
 */
export class SyncChannel {
  private syncJobs: Map<string, {
    integrationId: string;
    syncType: string;
    lastSync: string;
    nextSync?: string;
    status: "active" | "paused" | "error";
  }> = new Map();

  /**
   * Register sync job
   */
  registerSyncJob(
    integrationId: string,
    syncType: "leads" | "orders" | "tasks" | "contacts" | "campaigns" | "funnels",
    schedule: string
  ): void {
    this.syncJobs.set(`${integrationId}-${syncType}`, {
      integrationId,
      syncType,
      lastSync: new Date().toISOString(),
      status: "active",
    });
  }

  /**
   * Execute sync
   */
  async executeSync(
    integrationId: string,
    syncType: string
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const jobKey = `${integrationId}-${syncType}`;
    const job = this.syncJobs.get(jobKey);

    if (!job) {
      return {
        success: false,
        integrationId,
        channel: "sync",
        action: "sync",
        error: `Sync job not found: ${jobKey}`,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      // Sync logic: pull from source, transform, push to target
      // This is orchestrated through the UOI signal system
      const { emitSignal } = await import("@/lib/uoi/signals");
      
      // Emit sync start signal
      emitSignal({
        source: "integration-layer",
        type: "event",
        payload: {
          action: "sync_start",
          integrationId,
          syncType,
        },
        priority: "medium",
      });
      
      // In production, this would:
      // 1. Pull data from source system
      // 2. Transform to cockpit format
      // 3. Push to target systems
      // 4. Record sync results
      
      // Update last sync
      job.lastSync = new Date().toISOString();
      this.syncJobs.set(jobKey, job);
      
      // Emit sync complete signal
      emitSignal({
        source: "integration-layer",
        type: "event",
        payload: {
          action: "sync_complete",
          integrationId,
          syncType,
          success: true,
        },
        priority: "low",
      });

      return {
        success: true,
        integrationId,
        channel: "sync",
        action: "sync",
        data: { syncType, synced: true, lastSync: job.lastSync },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      job.status = "error";
      this.syncJobs.set(jobKey, job);

      return {
        success: false,
        integrationId,
        channel: "sync",
        action: "sync",
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get sync jobs
   */
  getSyncJobs(): Array<{
    integrationId: string;
    syncType: string;
    lastSync: string;
    status: string;
  }> {
    return Array.from(this.syncJobs.values());
  }
}

/**
 * Protection Channel
 * Handles: rate limits, API failures, data corruption, authentication, fallback flows
 */
export class ProtectionChannel {
  private rateLimiters: Map<string, {
    count: number;
    resetAt: number;
    limit: number;
  }> = new Map();

  /**
   * Check rate limit
   */
  checkRateLimit(integrationId: string, limit: number = 100): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(integrationId);

    if (!limiter || now > limiter.resetAt) {
      this.rateLimiters.set(integrationId, {
        count: 1,
        resetAt: now + 60000, // Reset after 1 minute
        limit,
      });
      return true;
    }

    if (limiter.count >= limit) {
      return false; // Rate limited
    }

    limiter.count++;
    this.rateLimiters.set(integrationId, limiter);
    return true;
  }

  /**
   * Handle API failure with retry
   */
  async handleFailure(
    integrationId: string,
    action: () => Promise<any>,
    retryPolicy?: { maxRetries: number; backoffMs: number }
  ): Promise<IntegrationResult> {
    const startTime = Date.now();
    const maxRetries = retryPolicy?.maxRetries || 3;
    const backoffMs = retryPolicy?.backoffMs || 1000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await action();
        return {
          success: true,
          integrationId,
          channel: "protection",
          action: "handle_failure",
          data: result,
          retries: attempt,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, attempt)));
        }
      }
    }

    return {
      success: false,
      integrationId,
      channel: "protection",
      action: "handle_failure",
      error: lastError?.message || "Unknown error",
      retries: maxRetries,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate data integrity
   */
  validateData(data: any, schema?: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data) {
      errors.push("Data is null or undefined");
      return { valid: false, errors };
    }

    // Basic validation
    if (typeof data !== "object") {
      errors.push("Data must be an object");
      return { valid: false, errors };
    }

    // Schema validation if provided
    if (schema) {
      for (const [key, type] of Object.entries(schema)) {
        if (!(key in data)) {
          errors.push(`Missing required field: ${key}`);
        } else if (typeof data[key] !== type) {
          errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof data[key]}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Expansion Channel
 * Allows: new engines, new domains, new integrations, new rituals to be added without breaking the organism
 */
export class ExpansionChannel {
  private registeredIntegrations: Map<string, Integration> = new Map();
  private integrationTemplates: Map<string, Partial<Integration>> = new Map();

  /**
   * Register integration template
   */
  registerTemplate(name: string, template: Partial<Integration>): void {
    this.integrationTemplates.set(name, template);
  }

  /**
   * Add new integration
   */
  addIntegration(integration: Integration): IntegrationResult {
    const startTime = Date.now();

    try {
      // Validate integration
      if (!integration.id || !integration.name || !integration.type || !integration.channel) {
        return {
          success: false,
          integrationId: integration.id || "unknown",
          channel: "expansion",
          action: "add_integration",
          error: "Invalid integration: missing required fields",
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      // Register integration
      this.registeredIntegrations.set(integration.id, integration);

      return {
        success: true,
        integrationId: integration.id,
        channel: "expansion",
        action: "add_integration",
        data: integration,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        integrationId: integration.id || "unknown",
        channel: "expansion",
        action: "add_integration",
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Create integration from template
   */
  createFromTemplate(templateName: string, config: Partial<Integration>): IntegrationResult {
    const template = this.integrationTemplates.get(templateName);

    if (!template) {
      return {
        success: false,
        integrationId: "unknown",
        channel: "expansion",
        action: "create_from_template",
        error: `Template not found: ${templateName}`,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const integration: Integration = {
      id: `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || template.name || "New Integration",
      type: config.type || template.type || "api",
      channel: config.channel || template.channel || "intake",
      system: config.system || template.system || "unknown",
      status: "inactive",
      config: { ...template.config, ...config.config },
      metadata: { ...template.metadata, ...config.metadata },
    };

    return this.addIntegration(integration);
  }

  /**
   * Get registered integrations
   */
  getRegisteredIntegrations(): Integration[] {
    return Array.from(this.registeredIntegrations.values());
  }

  /**
   * Get templates
   */
  getTemplates(): Record<string, Partial<Integration>> {
    return Object.fromEntries(this.integrationTemplates);
  }
}

/**
 * Cockpit Integration Layer
 * Main orchestrator for all integration channels
 */
export class CockpitIntegrationLayer {
  private intakeChannel: DataIntakeChannel;
  private outputChannel: ActionOutputChannel;
  private syncChannel: SyncChannel;
  private protectionChannel: ProtectionChannel;
  private expansionChannel: ExpansionChannel;
  private integrationHistory: IntegrationResult[] = [];
  private maxHistorySize = 500;

  constructor() {
    this.intakeChannel = new DataIntakeChannel();
    this.outputChannel = new ActionOutputChannel();
    this.syncChannel = new SyncChannel();
    this.protectionChannel = new ProtectionChannel();
    this.expansionChannel = new ExpansionChannel();

    // Register common integration templates
    this.registerCommonTemplates();
  }

  /**
   * Register common integration templates
   */
  private registerCommonTemplates(): void {
    // Shopify template
    this.expansionChannel.registerTemplate("shopify", {
      name: "Shopify",
      type: "api",
      channel: "intake",
      system: "shopify",
      config: {
        endpoint: "https://{shop}.myshopify.com/admin/api/2024-01",
        rateLimit: 40,
      },
    });

    // Stripe template
    this.expansionChannel.registerTemplate("stripe", {
      name: "Stripe",
      type: "webhook",
      channel: "intake",
      system: "stripe",
      config: {
        rateLimit: 100,
      },
    });

    // Meta (Facebook/Instagram) template
    this.expansionChannel.registerTemplate("meta", {
      name: "Meta",
      type: "api",
      channel: "output",
      system: "meta",
      config: {
        endpoint: "https://graph.facebook.com/v18.0",
        rateLimit: 200,
      },
    });

    // TikTok template
    this.expansionChannel.registerTemplate("tiktok", {
      name: "TikTok",
      type: "api",
      channel: "output",
      system: "tiktok",
      config: {
        rateLimit: 100,
      },
    });

    // Google Analytics template
    this.expansionChannel.registerTemplate("google_analytics", {
      name: "Google Analytics",
      type: "api",
      channel: "intake",
      system: "google",
      config: {
        endpoint: "https://analyticsdata.googleapis.com/v1beta",
        rateLimit: 100,
      },
    });

    // Airtable template
    this.expansionChannel.registerTemplate("airtable", {
      name: "Airtable",
      type: "api",
      channel: "sync",
      system: "airtable",
      config: {
        endpoint: "https://api.airtable.com/v0",
        rateLimit: 5,
      },
    });

    // Commander template - Universal Intake
    this.expansionChannel.registerTemplate("commander", {
      name: "Xom3 Commander",
      type: "webhook",
      channel: "intake",
      system: "commander",
      config: {
        endpoint: "/api/commander/intake",
        rateLimit: 100,
      },
      metadata: {
        verticals: ["benefits", "health", "default"],
        description: "Universal intake layer for all xom3 verticals",
      },
    });

    // Commander n8n webhook template
    this.expansionChannel.registerTemplate("commander_n8n", {
      name: "Commander n8n Webhook",
      type: "webhook",
      channel: "output",
      system: "n8n",
      config: {
        endpoint: process.env.COMMANDER_N8N_INTAKE_WEBHOOK_URL || "",
        rateLimit: 50,
      },
      metadata: {
        workflow: "commander-intake-workflow",
        description: "Commander → n8n intake webhook",
      },
    });

    // Register Commander integration by default
    this.registerCommanderIntegration();
  }

  /**
   * Register Commander as the default intake integration
   */
  private registerCommanderIntegration(): void {
    const commanderIntegration: Integration = {
      id: "commander-intake",
      name: "Xom3 Commander",
      type: "webhook",
      channel: "intake",
      system: "commander",
      status: "active",
      config: {
        endpoint: "/api/commander/intake",
        rateLimit: 100,
      },
      metadata: {
        verticals: ["benefits", "health", "default"],
        primary: true,
      },
    };

    this.intakeChannel.registerIntegration(commanderIntegration);
  }

  /**
   * Intake data from external system
   */
  async intakeData(
    integrationId: string,
    dataType: "analytics" | "revenue" | "leads" | "orders" | "engagement" | "trends" | "signals",
    data: any
  ): Promise<IntegrationResult> {
    // Check rate limit
    if (!this.protectionChannel.checkRateLimit(integrationId)) {
      return {
        success: false,
        integrationId,
        channel: "intake",
        action: "intake_data",
        error: "Rate limit exceeded",
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate data
    const validation = this.protectionChannel.validateData(data);
    if (!validation.valid) {
      return {
        success: false,
        integrationId,
        channel: "intake",
        action: "intake_data",
        error: `Data validation failed: ${validation.errors.join(", ")}`,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Intake with retry
    const result = await this.protectionChannel.handleFailure(
      integrationId,
      async () => {
        return await this.intakeChannel.intakeData(integrationId, dataType, data);
      }
    );

    // Store in history
    this.integrationHistory.push(result);
    if (this.integrationHistory.length > this.maxHistorySize) {
      this.integrationHistory.shift();
    }

    return result;
  }

  /**
   * Send action to external system
   */
  async sendAction(
    integrationId: string,
    action: string,
    payload: Record<string, any>
  ): Promise<IntegrationResult> {
    // Check rate limit
    if (!this.protectionChannel.checkRateLimit(integrationId)) {
      return {
        success: false,
        integrationId,
        channel: "output",
        action,
        error: "Rate limit exceeded",
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate payload
    const validation = this.protectionChannel.validateData(payload);
    if (!validation.valid) {
      return {
        success: false,
        integrationId,
        channel: "output",
        action,
        error: `Payload validation failed: ${validation.errors.join(", ")}`,
        duration: 0,
        timestamp: new Date().toISOString(),
      };
    }

    // Send with retry
    const result = await this.protectionChannel.handleFailure(
      integrationId,
      async () => {
        return await this.outputChannel.sendAction(integrationId, action, payload);
      }
    );

    // Store in history
    this.integrationHistory.push(result);
    if (this.integrationHistory.length > this.maxHistorySize) {
      this.integrationHistory.shift();
    }

    return result;
  }

  /**
   * Execute sync
   */
  async executeSync(
    integrationId: string,
    syncType: "leads" | "orders" | "tasks" | "contacts" | "campaigns" | "funnels"
  ): Promise<IntegrationResult> {
    const result = await this.syncChannel.executeSync(integrationId, syncType);

    // Store in history
    this.integrationHistory.push(result);
    if (this.integrationHistory.length > this.maxHistorySize) {
      this.integrationHistory.shift();
    }

    return result;
  }

  /**
   * Add new integration
   */
  addIntegration(integration: Integration): IntegrationResult {
    const result = this.expansionChannel.addIntegration(integration);

    // Register in appropriate channel
    if (result.success && integration.channel === "intake") {
      this.intakeChannel.registerIntegration(integration);
    } else if (result.success && integration.channel === "output") {
      this.outputChannel.registerIntegration(integration);
    }

    return result;
  }

  /**
   * Get all integrations
   */
  getAllIntegrations(): Integration[] {
    const intake = this.intakeChannel.getIntegrations();
    const output = this.outputChannel.getIntegrations();
    const expansion = this.expansionChannel.getRegisteredIntegrations();

    // Merge and deduplicate
    const all = new Map<string, Integration>();
    [...intake, ...output, ...expansion].forEach((i) => all.set(i.id, i));

    return Array.from(all.values());
  }

  /**
   * Get integration history
   */
  getIntegrationHistory(limit: number = 50): IntegrationResult[] {
    return this.integrationHistory.slice(-limit);
  }

  /**
   * Get sync jobs
   */
  getSyncJobs() {
    return this.syncChannel.getSyncJobs();
  }

  /**
   * Get templates
   */
  getTemplates() {
    return this.expansionChannel.getTemplates();
  }

  /**
   * Create integration from template
   */
  createFromTemplate(templateName: string, config: Partial<Integration>): IntegrationResult {
    return this.expansionChannel.createFromTemplate(templateName, config);
  }
}

// Export singleton instance
export const cockpitIntegrationLayer = new CockpitIntegrationLayer();
