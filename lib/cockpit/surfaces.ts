// Unified Cockpit - Surface Engine
// The operator interface layer that aggregates all engine data into 5 primary views

import {
  CockpitView,
  SystemView,
  OperationsView,
  ExecutiveView,
  AgentView,
  RitualView,
  CockpitEngine,
  CockpitSignal,
  CockpitLoop,
  OperationTask,
  OperationLead,
  OperationOrder,
  OperationPost,
  OperationAd,
  CockpitAnomaly,
  RevenueMetrics,
  LTVMetrics,
  ROASMetrics,
  PipelineMetrics,
  PressureMetrics,
  AgentStatus,
  AgentTask,
  AgentScript,
  AgentPerformance,
  AgentBottleneck,
  CockpitRitual,
  RitualSchedule,
  RitualStatus,
} from "./types";

/**
 * Surface Engine - Aggregates data from all engines into unified views
 */
export class CockpitSurfaceEngine {
  /**
   * Build System View - The entire organism on one screen
   */
  async buildSystemView(): Promise<SystemView> {
    // Aggregate all engines
    const engines: CockpitEngine[] = await this.getEngines();
    
    // Aggregate all signals
    const signals: CockpitSignal[] = await this.getSignals();
    
    // Build loops from engine connections
    const loops: CockpitLoop[] = await this.getLoops(engines);
    
    // Calculate overall health
    const health = this.calculateSystemHealth(engines);
    
    return {
      engines,
      signals,
      loops,
      health,
    };
  }

  /**
   * Build Operations View - What's happening right now
   */
  async buildOperationsView(): Promise<OperationsView> {
    // Aggregate tasks from all sources
    const tasks: OperationTask[] = await this.getTasks();
    
    // Aggregate leads
    const leads: OperationLead[] = await this.getLeads();
    
    // Aggregate orders
    const orders: OperationOrder[] = await this.getOrders();
    
    // Aggregate posts
    const posts: OperationPost[] = await this.getPosts();
    
    // Aggregate ads
    const ads: OperationAd[] = await this.getAds();
    
    // Aggregate anomalies
    const anomalies: CockpitAnomaly[] = await this.getAnomalies();
    
    return {
      tasks,
      leads,
      orders,
      posts,
      ads,
      anomalies,
    };
  }

  /**
   * Build Executive View - High-level intelligence
   */
  async buildExecutiveView(): Promise<ExecutiveView> {
    // Aggregate revenue metrics
    const revenue: RevenueMetrics = await this.getRevenueMetrics();
    
    // Aggregate trends
    const trends = await this.getTrends();
    
    // Aggregate LTV metrics
    const ltv: LTVMetrics = await this.getLTVMetrics();
    
    // Aggregate ROAS metrics
    const roas: ROASMetrics = await this.getROASMetrics();
    
    // Aggregate pipeline metrics
    const pipeline: PipelineMetrics = await this.getPipelineMetrics();
    
    // Aggregate pressure metrics
    const pressure: PressureMetrics = await this.getPressureMetrics();
    
    return {
      revenue,
      trends,
      ltv,
      roas,
      pipeline,
      pressure,
    };
  }

  /**
   * Build Agent View - Multi-agent command center
   */
  async buildAgentView(): Promise<AgentView> {
    // Aggregate agent statuses
    const agents: AgentStatus[] = await this.getAgents();
    
    // Aggregate agent tasks
    const tasks: AgentTask[] = await this.getAgentTasks();
    
    // Aggregate scripts
    const scripts: AgentScript[] = await this.getScripts();
    
    // Calculate performance
    const performance: AgentPerformance = await this.getAgentPerformance(tasks);
    
    // Detect bottlenecks
    const bottlenecks: AgentBottleneck[] = await this.getBottlenecks(agents, tasks);
    
    return {
      agents,
      tasks,
      scripts,
      performance,
      bottlenecks,
    };
  }

  /**
   * Build Ritual View - The ritual layer
   */
  async buildRitualView(): Promise<RitualView> {
    // Get all rituals
    const rituals: CockpitRitual[] = await this.getRituals();
    
    // Get schedule
    const schedule: RitualSchedule = await this.getRitualSchedule();
    
    // Get current status
    const status: RitualStatus = await this.getRitualStatus(rituals);
    
    return {
      rituals,
      schedule,
      status,
    };
  }

  // ========== PRIVATE AGGREGATION METHODS ==========

  private async getEngines(): Promise<CockpitEngine[]> {
    // Aggregate engines from all systems
    const engines: CockpitEngine[] = [
      {
        id: "broadcast",
        name: "Broadcast Engine",
        type: "broadcast",
        status: "healthy",
        health: 95,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "commerce",
        name: "Commerce Engine",
        type: "commerce",
        status: "healthy",
        health: 92,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "hse",
        name: "Hyperstate Engine",
        type: "hse",
        status: "healthy",
        health: 88,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "hpe",
        name: "Healthcare Pipeline Engine",
        type: "hpe",
        status: "healthy",
        health: 90,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "uoi",
        name: "Unified Operator Intelligence",
        type: "uoi",
        status: "healthy",
        health: 93,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "agent",
        name: "Agent Workflow Engine",
        type: "agent",
        status: "healthy",
        health: 87,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "optimization",
        name: "Optimization Engine",
        type: "optimization",
        status: "healthy",
        health: 91,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      {
        id: "revenue",
        name: "Revenue Engine",
        type: "revenue",
        status: "healthy",
        health: 94,
        metrics: {
          requests: 0,
          errors: 0,
          latency: 0,
          throughput: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
    ];

    // Integrate with actual engine health from HSE
    try {
      const { queryState } = await import("@/lib/hse");
      const hseState = queryState();
      
      if (hseState) {
        // Update engine health from HSE vectors
        const healthMapping: Record<string, string> = {
          broadcast: "broadcast",
          commerce: "commerce",
          hse: "hse",
          hpe: "healthcare",
          uoi: "uoi",
          agent: "agent",
        };
        
        engines.forEach(engine => {
          const subsystemKey = healthMapping[engine.id];
          const subsystemState = hseState.subsystems[subsystemKey];
          
          if (subsystemState) {
            engine.health = Math.round(subsystemState.health * 100);
            engine.status = engine.health >= 80 ? "healthy" : engine.health >= 50 ? "warning" : "critical";
            engine.metrics.lastUpdated = hseState.timestamp;
          }
        });
      }
    } catch (error) {
      // HSE not available, use defaults
    }

    return engines;
  }

  private async getSignals(): Promise<CockpitSignal[]> {
    // Aggregate signals from UOI
    try {
      const { getPendingSignals, getRecentSignals } = await import("@/lib/uoi");
      const pending = getPendingSignals();
      const recent = getRecentSignals(20);
      
      // Convert UOI signals to cockpit signals
      const signals: CockpitSignal[] = [...pending, ...recent].map(s => ({
        id: s.id,
        source: s.source,
        severity: s.priority === "critical" ? "critical" : s.priority === "high" ? "high" : s.priority === "medium" ? "medium" : "low",
        type: String(s.type),
        payload: (s.payload && typeof s.payload === "object") ? s.payload : { value: s.payload },
        timestamp: typeof s.timestamp === "string" ? Date.parse(s.timestamp) : (typeof s.timestamp === "number" ? s.timestamp : Date.now()),
        processed: false,
      }));
      
      return signals;
    } catch (error) {
      return [];
    }
  }

  private async getLoops(engines: CockpitEngine[]): Promise<CockpitLoop[]> {
    // Define the core loops of the system
    return [
      {
        id: "commerce-loop",
        name: "Commerce Loop",
        engines: ["commerce", "optimization", "revenue"],
        status: "active",
        lastCycle: new Date().toISOString(),
        cycleCount: 0,
      },
      {
        id: "broadcast-loop",
        name: "Broadcast Loop",
        engines: ["broadcast", "uoi", "optimization"],
        status: "active",
        lastCycle: new Date().toISOString(),
        cycleCount: 0,
      },
      {
        id: "pipeline-loop",
        name: "Pipeline Loop",
        engines: ["hpe", "agent", "uoi"],
        status: "active",
        lastCycle: new Date().toISOString(),
        cycleCount: 0,
      },
    ];
  }

  private calculateSystemHealth(engines: CockpitEngine[]): number {
    if (engines.length === 0) return 0;
    const totalHealth = engines.reduce((sum, engine) => sum + engine.health, 0);
    return Math.round(totalHealth / engines.length);
  }

  private async getTasks(): Promise<OperationTask[]> {
    // Tasks are sourced from domain lanes (e.g., agent/HPE) when configured.
    return [];
  }

  private async getLeads(): Promise<OperationLead[]> {
    // Leads are sourced from domain CRMs when configured.
    return [];
  }

  private async getOrders(): Promise<OperationOrder[]> {
    // Orders are sourced from Commerce when configured.
    return [];
  }

  private async getPosts(): Promise<OperationPost[]> {
    // Posts are sourced from Broadcast when configured.
    return [];
  }

  private async getAds(): Promise<OperationAd[]> {
    // Ads are sourced from Commerce when configured.
    return [];
  }

  private async getAnomalies(): Promise<CockpitAnomaly[]> {
    // Aggregate anomalies from HSE and UOI
    const anomalies: CockpitAnomaly[] = [];
    
    try {
      const { queryState } = await import("@/lib/hse");
      const state = queryState();
      
      if (state?.anomalies) {
        anomalies.push(...state.anomalies.map(a => ({
          id: a.id,
          type: "pattern" as const,
          source: a.affectedAreas?.[0] || "system",
          description: (a.patterns || []).join(", "),
          severity: a.severity as any,
          detectedAt: a.firstSeen,
          resolved: false,
        })));
      }
    } catch (error) {
      // HSE not available
    }
    
    return anomalies;
  }

  private async getRevenueMetrics(): Promise<RevenueMetrics> {
    // Revenue metrics are sourced from domain engines when configured.
    const healthcare = 0;
    const commerce = 0;
    const total = 0;
    const previousTotal = total * 0.95; // Simulated previous period
    const change = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
    
    return {
      total,
      healthcare,
      commerce,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      trend: change > 5 ? "rising" : change < -5 ? "falling" : "stable",
      change: Math.round(change * 100) / 100,
    };
  }

  private async getTrends() {
    // Trends are sourced from Broadcast/Commerce when configured.
    return [];
  }

  private async getLTVMetrics(): Promise<LTVMetrics> {
    // LTV is sourced from Commerce attribution when configured.
    return {
      average: 0,
      healthcare: 0,
      commerce: 0,
      trend: "stable",
    };
  }

  private async getROASMetrics(): Promise<ROASMetrics> {
    // ROAS is sourced from Commerce ad engine when configured.
    return {
      average: 0,
      byPlatform: {},
      trend: "stable",
    };
  }

  private async getPipelineMetrics(): Promise<PipelineMetrics> {
    // Pipeline metrics are sourced from HPE when configured.
    return {
      total: 0,
      active: 0,
      velocity: 0,
      conversion: 0,
      trend: "stable",
    };
  }

  private async getPressureMetrics(): Promise<PressureMetrics> {
    // Aggregate pressure from HSE
    try {
      const { queryState } = await import("@/lib/hse");
      const state = queryState();
      
      if (state?.vectors?.pressure) {
        const pressure = state.vectors.pressure;
        return {
          system: Math.round(pressure.aggregate_pressure * 100),
          operator: 0,
          engines: {},
          trend: pressure.aggregate_pressure > 0.7 ? "rising" : pressure.aggregate_pressure < 0.3 ? "falling" : "stable",
        };
      }
    } catch (error) {
      // HSE not available
    }
    
    return {
      system: 0,
      operator: 0,
      engines: {},
      trend: "stable",
    };
  }

  private async getAgents(): Promise<AgentStatus[]> {
    // Aggregate agent statuses from Agent Workflow
    const agents: AgentStatus[] = [];
    
    // Include health CRM agents
    try {
      const { getAllHealthAgents } = await import("@/modules/healthcare/agents/registry");
      const healthAgents = getAllHealthAgents();
      agents.push(...healthAgents);
    } catch (error) {
      // Health agents module not available, continue
    }

    // Include benefits CRM agents
    try {
      const { getAllBenefitsAgents } = await import("@/modules/benefits/agents/registry");
      const benefitsAgents = getAllBenefitsAgents();
      agents.push(...benefitsAgents);
    } catch (error) {
      // Benefits agents module not available, continue
    }
    
    return agents;
  }

  private async getAgentTasks(): Promise<AgentTask[]> {
    // Agent tasks are sourced from lane backends when configured.
    return [];
  }

  private async getScripts(): Promise<AgentScript[]> {
    // Agent scripts are sourced from lane backends when configured.
    return [];
  }

  private async getAgentPerformance(tasks: AgentTask[]): Promise<AgentPerformance> {
    // Calculate performance from tasks
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      totalTasks,
      completedTasks,
      successRate,
      averageLatency: 0,
      throughput: 0,
    };
  }

  private async getBottlenecks(
    agents: AgentStatus[],
    tasks: AgentTask[]
  ): Promise<AgentBottleneck[]> {
    // Detect bottlenecks
    const bottlenecks: AgentBottleneck[] = [];

    // Check for overloaded agents
    agents.forEach((agent) => {
      if (agent.load > 80) {
        bottlenecks.push({
          id: `bottleneck-${agent.id}`,
          agentId: agent.id,
          type: "overload",
          description: `Agent ${agent.name} is overloaded (${agent.load}% load)`,
          severity: agent.load > 90 ? "critical" : "high",
          detectedAt: new Date().toISOString(),
        });
      }
    });

    // Check for stuck tasks
    const stuckTasks = tasks.filter(
      (task) => task.status === "in_progress" && Date.now() - new Date(task.createdAt).getTime() > 3600000
    );
    if (stuckTasks.length > 0) {
      bottlenecks.push({
        id: "bottleneck-stuck-tasks",
        agentId: stuckTasks[0].agentId,
        type: "latency",
        description: `${stuckTasks.length} tasks stuck in progress`,
        severity: "high",
        detectedAt: new Date().toISOString(),
      });
    }

    return bottlenecks;
  }

  private async getRituals(): Promise<CockpitRitual[]> {
    // Define core rituals
    return [
      {
        id: "morning-activation",
        name: "Morning Activation",
        type: "morning",
        description: "Daily morning activation ritual",
        steps: [
          {
            id: "step-1",
            name: "System Health Check",
            action: "check_system_health",
            order: 1,
            required: true,
          },
          {
            id: "step-2",
            name: "Review Overnight Signals",
            action: "review_signals",
            order: 2,
            required: true,
          },
          {
            id: "step-3",
            name: "Activate Daily Operations",
            action: "activate_operations",
            order: 3,
            required: true,
          },
        ],
        enabled: true,
      },
      {
        id: "nightly-closure",
        name: "Nightly Closure",
        type: "nightly",
        description: "Daily nightly closure ritual",
        steps: [
          {
            id: "step-1",
            name: "Review Daily Performance",
            action: "review_performance",
            order: 1,
            required: true,
          },
          {
            id: "step-2",
            name: "Archive Completed Tasks",
            action: "archive_tasks",
            order: 2,
            required: true,
          },
          {
            id: "step-3",
            name: "Prepare Tomorrow's Queue",
            action: "prepare_queue",
            order: 3,
            required: true,
          },
        ],
        enabled: true,
      },
      {
        id: "weekly-ceremony",
        name: "Weekly Ceremony",
        type: "weekly",
        description: "Weekly optimization ceremony",
        steps: [
          {
            id: "step-1",
            name: "Review Weekly Metrics",
            action: "review_metrics",
            order: 1,
            required: true,
          },
          {
            id: "step-2",
            name: "Run Optimization Cycle",
            action: "run_optimization",
            order: 2,
            required: true,
          },
          {
            id: "step-3",
            name: "Plan Next Week",
            action: "plan_week",
            order: 3,
            required: true,
          },
        ],
        enabled: true,
      },
      {
        id: "optimization-cycle",
        name: "Optimization Cycle",
        type: "optimization",
        description: "Continuous optimization cycle",
        steps: [
          {
            id: "step-1",
            name: "Analyze Performance",
            action: "analyze_performance",
            order: 1,
            required: true,
          },
          {
            id: "step-2",
            name: "Generate Adjustments",
            action: "generate_adjustments",
            order: 2,
            required: true,
          },
          {
            id: "step-3",
            name: "Deploy Changes",
            action: "deploy_changes",
            order: 3,
            required: true,
          },
        ],
        enabled: true,
      },
    ];
  }

  private async getRitualSchedule(): Promise<RitualSchedule> {
    return {
      morning: "08:00",
      nightly: "22:00",
      weekly: "Monday 09:00",
      optimization: "hourly",
    };
  }

  private async getRitualStatus(rituals: CockpitRitual[]): Promise<RitualStatus> {
    // Determine current ritual status
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check if morning ritual should be active (8 AM)
    const morningRitual = rituals.find((r) => r.type === "morning");
    const isMorningTime = hour >= 8 && hour < 9;

    // Check if nightly ritual should be active (10 PM)
    const nightlyRitual = rituals.find((r) => r.type === "nightly");
    const isNightlyTime = hour >= 22 && hour < 23;

    // Check if weekly ritual should be active (Monday 9 AM)
    const weeklyRitual = rituals.find((r) => r.type === "weekly");
    const isWeeklyTime = day === 1 && hour >= 9 && hour < 10;

    let current: string | null = null;
    if (isMorningTime && morningRitual) current = morningRitual.id;
    else if (isNightlyTime && nightlyRitual) current = nightlyRitual.id;
    else if (isWeeklyTime && weeklyRitual) current = weeklyRitual.id;

    return {
      current,
      lastCompleted: null,
      nextScheduled: morningRitual?.id || null,
      inProgress: current !== null,
    };
  }
}

// Export singleton instance
export const cockpitSurfaceEngine = new CockpitSurfaceEngine();
