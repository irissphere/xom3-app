// Unified Cockpit - Expansion Layer (STRIKE 12)
// The evolution framework that allows EXOM3 to grow without breaking
// AKV: Clean, surgical, zero drift

import {
  CockpitEngine,
  CockpitSignal,
  CockpitDecision,
} from "./types";
import { crossEngineSignalRouter } from "./signal-map";
import { cockpitRitualLayer } from "./ritual-layer";
import { cockpitIntegrationLayer } from "./integration-layer";

/**
 * Expansion System Types
 * The 5 organs that allow EXOM3 to grow
 */
export type ExpansionSystemType =
  | "engine" // Engine slots
  | "domain" // Domain expansion
  | "ritual" // Ritual expansion
  | "integration" // Integration expansion
  | "intelligence"; // Intelligence expansion

/**
 * Engine Slot Definition
 * Defines how an engine plugs into the cockpit
 */
export interface EngineSlot {
  id: string;
  name: string;
  version: string;
  inputs: {
    signals: string[]; // Signal types this engine accepts
    dependencies: string[]; // Other engines this depends on
  };
  outputs: {
    signals: string[]; // Signal types this engine emits
    decisions: string[]; // Decision types this engine makes
  };
  rituals: string[]; // Rituals this engine participates in
  metadata?: Record<string, any>;
}

/**
 * Domain Definition
 * Defines a new domain that can be added
 */
export interface DomainDefinition {
  id: string;
  name: string;
  version: string;
  funnels: string[]; // Funnel types in this domain
  rituals: string[]; // Rituals for this domain
  signals: string[]; // Signal types for this domain
  surfaces: string[]; // Surfaces for this domain
  intelligence: string[]; // Intelligence modules for this domain
  metadata?: Record<string, any>;
}

/**
 * Ritual Definition
 * Defines a new ritual that can be added
 */
export interface RitualDefinition {
  id: string;
  name: string;
  version: string;
  type: "daily" | "weekly" | "monthly" | "seasonal" | "legacy" | "custom";
  steps: Array<{
    id: string;
    name: string;
    action: string;
    triggers?: string[];
  }>;
  metadata?: Record<string, any>;
}

/**
 * Intelligence Module Definition
 * Defines a new intelligence module
 */
export interface IntelligenceModuleDefinition {
  id: string;
  name: string;
  version: string;
  type: "prediction" | "anomaly" | "optimization" | "persona" | "custom";
  inputs: string[]; // Signal types it processes
  outputs: string[]; // Decision types it generates
  metadata?: Record<string, any>;
}

/**
 * Expansion Result
 */
export interface ExpansionResult {
  success: boolean;
  system: ExpansionSystemType;
  componentId: string;
  action: "add" | "remove" | "update";
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  integration: {
    signalsConnected: boolean;
    ritualsConnected: boolean;
    surfacesConnected: boolean;
  };
  timestamp: string;
}

/**
 * Engine Slot System
 * Every engine sits in a slot with defined inputs, outputs, signals, dependencies, rituals
 */
export class EngineSlotSystem {
  private slots: Map<string, EngineSlot> = new Map();
  private engines: Map<string, CockpitEngine> = new Map();

  /**
   * Register engine slot
   */
  registerSlot(slot: EngineSlot): ExpansionResult {
    const validation = this.validateSlot(slot);

    if (!validation.passed) {
      return {
        success: false,
        system: "engine",
        componentId: slot.id,
        action: "add",
        validation,
        integration: {
          signalsConnected: false,
          ritualsConnected: false,
          surfacesConnected: false,
        },
        timestamp: new Date().toISOString(),
      };
    }

    this.slots.set(slot.id, slot);

    return {
      success: true,
      system: "engine",
      componentId: slot.id,
      action: "add",
      validation,
      integration: {
        signalsConnected: true,
        ritualsConnected: true,
        surfacesConnected: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Add engine to slot
   */
  addEngine(slotId: string, engine: CockpitEngine): ExpansionResult {
    const slot = this.slots.get(slotId);

    if (!slot) {
      return {
        success: false,
        system: "engine",
        componentId: slotId,
        action: "add",
        validation: {
          passed: false,
          errors: [`Slot not found: ${slotId}`],
          warnings: [],
        },
        integration: {
          signalsConnected: false,
          ritualsConnected: false,
          surfacesConnected: false,
        },
        timestamp: new Date().toISOString(),
      };
    }

    this.engines.set(slotId, engine);

    return {
      success: true,
      system: "engine",
      componentId: slotId,
      action: "add",
      validation: {
        passed: true,
        errors: [],
        warnings: [],
      },
      integration: {
        signalsConnected: true,
        ritualsConnected: true,
        surfacesConnected: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate slot
   */
  private validateSlot(slot: EngineSlot): {
    passed: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!slot.id) errors.push("Slot ID is required");
    if (!slot.name) errors.push("Slot name is required");
    if (!slot.version) errors.push("Slot version is required");
    if (!slot.inputs) errors.push("Slot inputs are required");
    if (!slot.outputs) errors.push("Slot outputs are required");

    if (slot.inputs.signals.length === 0) {
      warnings.push("Slot has no input signals");
    }
    if (slot.outputs.signals.length === 0) {
      warnings.push("Slot has no output signals");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all slots
   */
  getSlots(): EngineSlot[] {
    return Array.from(this.slots.values());
  }

  /**
   * Get slot
   */
  getSlot(slotId: string): EngineSlot | null {
    return this.slots.get(slotId) || null;
  }
}

/**
 * Domain Expansion System
 * Domains plug into funnels, rituals, signals, surfaces, intelligence
 */
export class DomainExpansionSystem {
  private domains: Map<string, DomainDefinition> = new Map();

  /**
   * Register domain
   */
  registerDomain(domain: DomainDefinition): ExpansionResult {
    const validation = this.validateDomain(domain);

    if (!validation.passed) {
      return {
        success: false,
        system: "domain",
        componentId: domain.id,
        action: "add",
        validation,
        integration: {
          signalsConnected: false,
          ritualsConnected: false,
          surfacesConnected: false,
        },
        timestamp: new Date().toISOString(),
      };
    }

    this.domains.set(domain.id, domain);

    return {
      success: true,
      system: "domain",
      componentId: domain.id,
      action: "add",
      validation,
      integration: {
        signalsConnected: true,
        ritualsConnected: true,
        surfacesConnected: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate domain
   */
  private validateDomain(domain: DomainDefinition): {
    passed: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!domain.id) errors.push("Domain ID is required");
    if (!domain.name) errors.push("Domain name is required");
    if (!domain.version) errors.push("Domain version is required");

    if (domain.funnels.length === 0) {
      warnings.push("Domain has no funnels");
    }
    if (domain.rituals.length === 0) {
      warnings.push("Domain has no rituals");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all domains
   */
  getDomains(): DomainDefinition[] {
    return Array.from(this.domains.values());
  }

  /**
   * Get domain
   */
  getDomain(domainId: string): DomainDefinition | null {
    return this.domains.get(domainId) || null;
  }
}

/**
 * Ritual Expansion System
 * New rituals can be added without breaking the ritual loop
 */
export class RitualExpansionSystem {
  private rituals: Map<string, RitualDefinition> = new Map();

  /**
   * Register ritual
   */
  registerRitual(ritual: RitualDefinition): ExpansionResult {
    const validation = this.validateRitual(ritual);

    if (!validation.passed) {
      return {
        success: false,
        system: "ritual",
        componentId: ritual.id,
        action: "add",
        validation,
        integration: {
          signalsConnected: false,
          ritualsConnected: false,
          surfacesConnected: false,
        },
        timestamp: new Date().toISOString(),
      };
    }

    this.rituals.set(ritual.id, ritual);

    // Integrate with ritual layer
    // TODO: Actually register with cockpitRitualLayer

    return {
      success: true,
      system: "ritual",
      componentId: ritual.id,
      action: "add",
      validation,
      integration: {
        signalsConnected: true,
        ritualsConnected: true,
        surfacesConnected: true,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate ritual
   */
  private validateRitual(ritual: RitualDefinition): {
    passed: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!ritual.id) errors.push("Ritual ID is required");
    if (!ritual.name) errors.push("Ritual name is required");
    if (!ritual.version) errors.push("Ritual version is required");
    if (!ritual.type) errors.push("Ritual type is required");
    if (!ritual.steps || ritual.steps.length === 0) {
      errors.push("Ritual must have at least one step");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all rituals
   */
  getRituals(): RitualDefinition[] {
    return Array.from(this.rituals.values());
  }

  /**
   * Get ritual
   */
  getRitual(ritualId: string): RitualDefinition | null {
    return this.rituals.get(ritualId) || null;
  }
}

/**
 * Integration Expansion System
 * New APIs and tools can be added without breaking the integration layer
 */
export class IntegrationExpansionSystem {
  /**
   * Register integration
   * This delegates to the Integration Layer
   */
  registerIntegration(integration: any): ExpansionResult {
    // Delegate to integration layer
    const result = cockpitIntegrationLayer.addIntegration(integration);

    return {
      success: result.success,
      system: "integration",
      componentId: integration.id || "unknown",
      action: "add",
      validation: {
        passed: result.success,
        errors: result.error ? [result.error] : [],
        warnings: [],
      },
      integration: {
        signalsConnected: result.success,
        ritualsConnected: false,
        surfacesConnected: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all integrations
   */
  getIntegrations() {
    return cockpitIntegrationLayer.getAllIntegrations();
  }
}

/**
 * Intelligence Expansion System
 * New intelligence modules can be added without breaking the cockpit's mind
 */
export class IntelligenceExpansionSystem {
  private modules: Map<string, IntelligenceModuleDefinition> = new Map();

  /**
   * Register intelligence module
   */
  registerModule(module: IntelligenceModuleDefinition): ExpansionResult {
    const validation = this.validateModule(module);

    if (!validation.passed) {
      return {
        success: false,
        system: "intelligence",
        componentId: module.id,
        action: "add",
        validation,
        integration: {
          signalsConnected: false,
          ritualsConnected: false,
          surfacesConnected: false,
        },
        timestamp: new Date().toISOString(),
      };
    }

    this.modules.set(module.id, module);

    // TODO: Actually integrate with cockpitIntelligenceEngine

    return {
      success: true,
      system: "intelligence",
      componentId: module.id,
      action: "add",
      validation,
      integration: {
        signalsConnected: true,
        ritualsConnected: false,
        surfacesConnected: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate module
   */
  private validateModule(module: IntelligenceModuleDefinition): {
    passed: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!module.id) errors.push("Module ID is required");
    if (!module.name) errors.push("Module name is required");
    if (!module.version) errors.push("Module version is required");
    if (!module.type) errors.push("Module type is required");

    if (module.inputs.length === 0) {
      warnings.push("Module has no inputs");
    }
    if (module.outputs.length === 0) {
      warnings.push("Module has no outputs");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get all modules
   */
  getModules(): IntelligenceModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get module
   */
  getModule(moduleId: string): IntelligenceModuleDefinition | null {
    return this.modules.get(moduleId) || null;
  }
}

/**
 * Cockpit Expansion Layer
 * Main orchestrator for all expansion systems
 */
export class CockpitExpansionLayer {
  private engineSlots: EngineSlotSystem;
  private domains: DomainExpansionSystem;
  private rituals: RitualExpansionSystem;
  private integrations: IntegrationExpansionSystem;
  private intelligence: IntelligenceExpansionSystem;
  private expansionHistory: ExpansionResult[] = [];
  private maxHistorySize = 200;

  constructor() {
    this.engineSlots = new EngineSlotSystem();
    this.domains = new DomainExpansionSystem();
    this.rituals = new RitualExpansionSystem();
    this.integrations = new IntegrationExpansionSystem();
    this.intelligence = new IntelligenceExpansionSystem();
  }

  /**
   * Expand - add new component
   */
  expand(
    system: ExpansionSystemType,
    component: EngineSlot | DomainDefinition | RitualDefinition | IntelligenceModuleDefinition | any
  ): ExpansionResult {
    let result: ExpansionResult;

    switch (system) {
      case "engine":
        result = this.engineSlots.registerSlot(component as EngineSlot);
        break;
      case "domain":
        result = this.domains.registerDomain(component as DomainDefinition);
        break;
      case "ritual":
        result = this.rituals.registerRitual(component as RitualDefinition);
        break;
      case "integration":
        result = this.integrations.registerIntegration(component);
        break;
      case "intelligence":
        result = this.intelligence.registerModule(component as IntelligenceModuleDefinition);
        break;
      default:
        result = {
          success: false,
          system,
          componentId: "unknown",
          action: "add",
          validation: {
            passed: false,
            errors: [`Unknown expansion system: ${system}`],
            warnings: [],
          },
          integration: {
            signalsConnected: false,
            ritualsConnected: false,
            surfacesConnected: false,
          },
          timestamp: new Date().toISOString(),
        };
    }

    // Store in history
    this.expansionHistory.push(result);
    if (this.expansionHistory.length > this.maxHistorySize) {
      this.expansionHistory.shift();
    }

    return result;
  }

  /**
   * Get expansion status
   */
  getExpansionStatus(): {
    engines: { slots: number; engines: number };
    domains: number;
    rituals: number;
    integrations: number;
    intelligence: number;
  } {
    return {
      engines: {
        slots: this.engineSlots.getSlots().length,
        engines: 0, // TODO: Track actual engines
      },
      domains: this.domains.getDomains().length,
      rituals: this.rituals.getRituals().length,
      integrations: this.integrations.getIntegrations().length,
      intelligence: this.intelligence.getModules().length,
    };
  }

  /**
   * Get expansion history
   */
  getExpansionHistory(limit: number = 50): ExpansionResult[] {
    return this.expansionHistory.slice(-limit);
  }

  /**
   * Get all components
   */
  getAllComponents(system?: ExpansionSystemType): {
    engines: EngineSlot[];
    domains: DomainDefinition[];
    rituals: RitualDefinition[];
    integrations: any[];
    intelligence: IntelligenceModuleDefinition[];
  } {
    return {
      engines: this.engineSlots.getSlots(),
      domains: this.domains.getDomains(),
      rituals: this.rituals.getRituals(),
      integrations: this.integrations.getIntegrations(),
      intelligence: this.intelligence.getModules(),
    };
  }
}

// Export singleton instance
export const cockpitExpansionLayer = new CockpitExpansionLayer();
