/**
 * HI5 Performance Monitor Agent
 * Tracks system health, monitors performance metrics, and triggers optimizations
 * Ensures HI5 operates within performance and cost thresholds
 */

import { AgentExecutionResult, BaseAgent, AgentConfig } from '@/lib/agents/types';
import { SystemHealthMetrics, PerformanceBaseline } from './types';

interface PerformanceMonitorConfig extends AgentConfig {
  monitoring: {
    checkInterval: number; // minutes
    alertThresholds: {
      responseTime: number; // ms
      errorRate: number; // percentage
      uptime: number; // percentage
      queueDepth: number;
    };
    autoOptimization: boolean;
  };
  baselines: PerformanceBaseline;
  escalation: {
    warningThreshold: number; // consecutive failures
    criticalThreshold: number; // consecutive failures
    autoRestart: boolean;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  component: string;
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: string;
  resolved?: boolean;
}

export class Hi5PerformanceMonitorAgent extends BaseAgent {
  protected config: PerformanceMonitorConfig;
  private alerts: PerformanceAlert[] = [];
  private consecutiveFailures = 0;
  private lastCheckTime: number = Date.now();

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    super('hi5-performance-monitor', config);
    this.config = {
      monitoring: {
        checkInterval: 5, // 5 minutes
        alertThresholds: {
          responseTime: 3000, // 3 seconds
          errorRate: 5, // 5%
          uptime: 99, // 99%
          queueDepth: 100,
        },
        autoOptimization: true,
      },
      baselines: {
        targetMetrics: {
          maxMonthlyCost: 964,
          minLeadQuality: 7,
          maxResponseTime: 2000,
          minUptime: 99.5,
        },
        currentMetrics: {
          monthlyCost: 0,
          leadQuality: 0,
          responseTime: 0,
          uptime: 0,
        },
      },
      escalation: {
        warningThreshold: 3,
        criticalThreshold: 5,
        autoRestart: true,
      },
      ...config,
    } as PerformanceMonitorConfig;

    // Start monitoring loop
    this.startMonitoring();
  }

  async execute(input: {
    checkType: 'health' | 'performance' | 'alerts' | 'baseline' | 'optimize';
    component?: string;
    manualTrigger?: boolean;
  }): Promise<AgentExecutionResult> {

    const startTime = Date.now();
    const executionId = `perf-monitor-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    try {
      let result: any;

      switch (input.checkType) {
        case 'health':
          result = await this.checkSystemHealth();
          break;

        case 'performance':
          result = await this.checkPerformance(input.component);
          break;

        case 'alerts':
          result = await this.getActiveAlerts();
          break;

        case 'baseline':
          result = await this.checkBaselineCompliance();
          break;

        case 'optimize':
          result = await this.triggerOptimization(input.manualTrigger || false);
          break;
      }

      // Check for alerts after any execution
      const newAlerts = await this.checkForAlerts(result);
      if (newAlerts.length > 0) {
        this.alerts.push(...newAlerts);
      }

      // Auto-escalate if needed
      await this.checkEscalation();

      return {
        success: true,
        data: {
          executionId,
          checkType: input.checkType,
          result,
          alerts: newAlerts,
          totalActiveAlerts: this.alerts.filter(a => !a.resolved).length,
        },
        metadata: {
          executionId,
          duration: Date.now() - startTime,
          agentId: this.id,
          sovereign: 'agents-sovereign'
        }
      };

    } catch (error) {
      this.consecutiveFailures++;
      return {
        success: false,
        errors: [{
          field: 'monitoring',
          message: `Performance monitoring failed: ${error.message}`
        }],
        metadata: {
          executionId,
          duration: Date.now() - startTime,
          agentId: this.id,
          sovereign: 'agents-sovereign'
        }
      };
    }
  }

  private async checkSystemHealth(): Promise<SystemHealthMetrics> {
    // Implementation would check actual system metrics
    return {
      uptime: 99.7,
      averageResponseTime: 1200,
      errorRate: 0.02,
      activeWorkflows: 12,
      queueDepth: 15
    };
  }

  private async checkPerformance(component?: string): Promise<{
    component: string;
    metrics: Record<string, number>;
    status: 'healthy' | 'warning' | 'critical';
  }> {
    const health = await this.checkSystemHealth();

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let issues = 0;

    if (health.averageResponseTime > this.config.monitoring.alertThresholds.responseTime) {
      status = 'warning';
      issues++;
    }

    if (health.errorRate > this.config.monitoring.alertThresholds.errorRate / 100) {
      status = issues > 0 ? 'critical' : 'warning';
      issues++;
    }

    if (health.uptime < this.config.monitoring.alertThresholds.uptime) {
      status = 'critical';
      issues++;
    }

    return {
      component: component || 'system',
      metrics: {
        uptime: health.uptime,
        responseTime: health.averageResponseTime,
        errorRate: health.errorRate,
        queueDepth: health.queueDepth,
        activeWorkflows: health.activeWorkflows,
      },
      status
    };
  }

  private async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return this.alerts.filter(alert => !alert.resolved);
  }

  private async checkBaselineCompliance(): Promise<{
    compliant: boolean;
    violations: Array<{ metric: string; current: number; target: number }>;
    score: number;
  }> {
    const currentMetrics = await this.checkSystemHealth();
    const violations = [];
    let compliant = true;

    // Check response time
    if (currentMetrics.averageResponseTime > this.config.baselines.targetMetrics.maxResponseTime) {
      violations.push({
        metric: 'responseTime',
        current: currentMetrics.averageResponseTime,
        target: this.config.baselines.targetMetrics.maxResponseTime
      });
      compliant = false;
    }

    // Check uptime
    if (currentMetrics.uptime < this.config.baselines.targetMetrics.minUptime) {
      violations.push({
        metric: 'uptime',
        current: currentMetrics.uptime,
        target: this.config.baselines.targetMetrics.minUptime
      });
      compliant = false;
    }

    const score = violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length * 25));

    return { compliant, violations, score };
  }

  private async triggerOptimization(manual: boolean): Promise<{
    optimizations: string[];
    expectedImpact: number;
  }> {
    const optimizations = [];
    let expectedImpact = 0;

    // Performance-based optimizations
    const performance = await this.checkPerformance();

    if (performance.status === 'warning' || performance.status === 'critical') {
      optimizations.push('Increased cache TTL for high-latency requests');
      expectedImpact += 15;
    }

    if (performance.metrics.queueDepth > this.config.monitoring.alertThresholds.queueDepth) {
      optimizations.push('Enabled request batching to reduce queue depth');
      expectedImpact += 20;
    }

    if (performance.metrics.errorRate > this.config.monitoring.alertThresholds.errorRate / 100) {
      optimizations.push('Activated error recovery protocols');
      expectedImpact += 10;
    }

    // Cost-based optimizations (if integrated with cost agent)
    if (!manual && this.config.monitoring.autoOptimization) {
      optimizations.push('Auto-triggered performance optimization');
    }

    return { optimizations, expectedImpact };
  }

  private async checkForAlerts(result: any): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    // Check response time
    if (result.averageResponseTime > this.config.monitoring.alertThresholds.responseTime) {
      alerts.push({
        id: `alert-${Date.now()}-resptime`,
        type: 'warning',
        component: 'api',
        metric: 'responseTime',
        value: result.averageResponseTime,
        threshold: this.config.monitoring.alertThresholds.responseTime,
        message: `Response time (${result.averageResponseTime}ms) exceeds threshold (${this.config.monitoring.alertThresholds.responseTime}ms)`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check error rate
    if (result.errorRate > this.config.monitoring.alertThresholds.errorRate / 100) {
      alerts.push({
        id: `alert-${Date.now()}-errorrate`,
        type: 'critical',
        component: 'system',
        metric: 'errorRate',
        value: result.errorRate * 100,
        threshold: this.config.monitoring.alertThresholds.errorRate,
        message: `Error rate (${(result.errorRate * 100).toFixed(1)}%) exceeds threshold (${this.config.monitoring.alertThresholds.errorRate}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check uptime
    if (result.uptime < this.config.monitoring.alertThresholds.uptime) {
      alerts.push({
        id: `alert-${Date.now()}-uptime`,
        type: 'critical',
        component: 'system',
        metric: 'uptime',
        value: result.uptime,
        threshold: this.config.monitoring.alertThresholds.uptime,
        message: `Uptime (${result.uptime}%) below threshold (${this.config.monitoring.alertThresholds.uptime}%)`,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  private async checkEscalation(): Promise<void> {
    const activeCriticalAlerts = this.alerts.filter(
      alert => !alert.resolved && alert.type === 'critical'
    ).length;

    if (activeCriticalAlerts >= this.config.escalation.criticalThreshold) {
      console.error('[HI5 Performance Monitor] CRITICAL: Multiple system failures detected');

      if (this.config.escalation.autoRestart) {
        await this.triggerEmergencyRestart();
      }
    } else if (activeCriticalAlerts >= this.config.escalation.warningThreshold) {
      console.warn('[HI5 Performance Monitor] WARNING: Escalating performance issues');
      await this.sendEscalationAlert();
    }
  }

  private async triggerEmergencyRestart(): Promise<void> {
    console.log('[HI5 Performance Monitor] Triggering emergency restart protocols');
    // Implementation would restart services, clear caches, etc.
  }

  private async sendEscalationAlert(): Promise<void> {
    console.log('[HI5 Performance Monitor] Sending escalation alert to operations team');
    // Implementation would send notifications
  }

  private startMonitoring(): void {
    setInterval(async () => {
      try {
        const now = Date.now();
        if (now - this.lastCheckTime > this.config.monitoring.checkInterval * 60 * 1000) {
          await this.execute({ checkType: 'health' });
          this.lastCheckTime = now;
        }
      } catch (error) {
        console.error('[HI5 Performance Monitor] Monitoring check failed:', error);
      }
    }, this.config.monitoring.checkInterval * 60 * 1000);
  }
}
