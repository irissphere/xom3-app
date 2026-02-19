// System Heartbeat Monitor - Operational Pulse
// Real-time view of system health and vital signs

export interface HeartbeatMetric {
  name: string;
  value: number;
  unit: string;
  status: "healthy" | "warning" | "critical";
  threshold?: {
    warning: number;
    critical: number;
  };
  timestamp: string;
}

export interface SystemHeartbeat {
  timestamp: string;
  uptime: number; // Seconds
  status: "healthy" | "degraded" | "critical";
  metrics: {
    apiLatency: HeartbeatMetric;
    webhookActivity: HeartbeatMetric;
    automationQueueLength: HeartbeatMetric;
    errorRate: HeartbeatMetric;
    databaseReadLoad: HeartbeatMetric;
    databaseWriteLoad: HeartbeatMetric;
    activeConnections: HeartbeatMetric;
    memoryUsage: HeartbeatMetric;
  };
  subsystems: {
    api: "healthy" | "degraded" | "down";
    database: "healthy" | "degraded" | "down";
    workflows: "healthy" | "degraded" | "down";
    automation: "healthy" | "degraded" | "down";
    webhooks: "healthy" | "degraded" | "down";
  };
}

/**
 * Calculate metric status based on value and thresholds
 */
function calculateStatus(
  value: number,
  threshold?: { warning: number; critical: number }
): "healthy" | "warning" | "critical" {
  if (!threshold) return "healthy";
  
  if (value >= threshold.critical) return "critical";
  if (value >= threshold.warning) return "warning";
  return "healthy";
}

/**
 * Collect system heartbeat metrics
 */
export async function collectHeartbeat(): Promise<SystemHeartbeat> {
  const now = Date.now();
  const startTime = process.env.SYSTEM_START_TIME 
    ? parseInt(process.env.SYSTEM_START_TIME) 
    : now;
  const uptime = Math.floor((now - startTime) / 1000);

  // Collect API latency (simulated - would measure actual API calls)
  const apiLatency = await measureAPILatency();
  
  // Collect webhook activity (count webhooks in last minute)
  const webhookActivity = await measureWebhookActivity();
  
  // Collect automation queue length
  const automationQueueLength = await measureAutomationQueue();
  
  // Collect error rate (errors per minute)
  const errorRate = await measureErrorRate();
  
  // Collect database load (simulated)
  const databaseReadLoad = await measureDatabaseReadLoad();
  const databaseWriteLoad = await measureDatabaseWriteLoad();
  
  // Collect active connections (simulated)
  const activeConnections = await measureActiveConnections();
  
  // Collect memory usage
  const memoryUsage = await measureMemoryUsage();

  const metrics = {
    apiLatency: {
      name: "API Latency",
      value: apiLatency,
      unit: "ms",
      status: calculateStatus(apiLatency, { warning: 500, critical: 1000 }),
      threshold: { warning: 500, critical: 1000 },
      timestamp: new Date().toISOString(),
    },
    webhookActivity: {
      name: "Webhook Activity",
      value: webhookActivity,
      unit: "events/min",
      status: calculateStatus(webhookActivity, { warning: 50, critical: 100 }),
      threshold: { warning: 50, critical: 100 },
      timestamp: new Date().toISOString(),
    },
    automationQueueLength: {
      name: "Automation Queue",
      value: automationQueueLength,
      unit: "pending",
      status: calculateStatus(automationQueueLength, { warning: 20, critical: 50 }),
      threshold: { warning: 20, critical: 50 },
      timestamp: new Date().toISOString(),
    },
    errorRate: {
      name: "Error Rate",
      value: errorRate,
      unit: "errors/min",
      status: calculateStatus(errorRate, { warning: 5, critical: 10 }),
      threshold: { warning: 5, critical: 10 },
      timestamp: new Date().toISOString(),
    },
    databaseReadLoad: {
      name: "DB Read Load",
      value: databaseReadLoad,
      unit: "ops/sec",
      status: calculateStatus(databaseReadLoad, { warning: 50, critical: 100 }),
      threshold: { warning: 50, critical: 100 },
      timestamp: new Date().toISOString(),
    },
    databaseWriteLoad: {
      name: "DB Write Load",
      value: databaseWriteLoad,
      unit: "ops/sec",
      status: calculateStatus(databaseWriteLoad, { warning: 20, critical: 50 }),
      threshold: { warning: 20, critical: 50 },
      timestamp: new Date().toISOString(),
    },
    activeConnections: {
      name: "Active Connections",
      value: activeConnections,
      unit: "connections",
      status: calculateStatus(activeConnections, { warning: 100, critical: 200 }),
      threshold: { warning: 100, critical: 200 },
      timestamp: new Date().toISOString(),
    },
    memoryUsage: {
      name: "Memory Usage",
      value: memoryUsage,
      unit: "%",
      status: calculateStatus(memoryUsage, { warning: 80, critical: 95 }),
      threshold: { warning: 80, critical: 95 },
      timestamp: new Date().toISOString(),
    },
  };

  // Determine overall system status
  const criticalCount = Object.values(metrics).filter(m => m.status === "critical").length;
  const warningCount = Object.values(metrics).filter(m => m.status === "warning").length;
  
  let status: "healthy" | "degraded" | "critical";
  if (criticalCount > 0) {
    status = "critical";
  } else if (warningCount > 0) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  // Determine subsystem status
  const subsystems = {
    api: metrics.apiLatency.status === "critical" ? ("down" as const) :
         metrics.apiLatency.status === "warning" ? ("degraded" as const) : ("healthy" as const),
    database: (metrics.databaseReadLoad.status === "critical" || 
               metrics.databaseWriteLoad.status === "critical") ? ("down" as const) :
              (metrics.databaseReadLoad.status === "warning" || 
               metrics.databaseWriteLoad.status === "warning") ? ("degraded" as const) : ("healthy" as const),
    workflows: metrics.automationQueueLength.status === "critical" ? ("down" as const) :
               metrics.automationQueueLength.status === "warning" ? ("degraded" as const) : ("healthy" as const),
    automation: metrics.automationQueueLength.status === "critical" ? ("down" as const) :
                metrics.automationQueueLength.status === "warning" ? ("degraded" as const) : ("healthy" as const),
    webhooks: metrics.webhookActivity.status === "critical" ? ("down" as const) :
              metrics.webhookActivity.status === "warning" ? ("degraded" as const) : ("healthy" as const),
  };

  return {
    timestamp: new Date().toISOString(),
    uptime,
    status,
    metrics,
    subsystems,
  };
}

// Metric collection functions (simulated - would use actual monitoring in production)

async function measureAPILatency(): Promise<number> {
  // Simulate API latency measurement
  return Math.random() * 300 + 50; // 50-350ms
}

async function measureWebhookActivity(): Promise<number> {
  // Would count webhook events in last minute
  return Math.floor(Math.random() * 30); // 0-30 events/min
}

async function measureAutomationQueue(): Promise<number> {
  // Would count pending automation tasks
  return Math.floor(Math.random() * 15); // 0-15 pending
}

async function measureErrorRate(): Promise<number> {
  // Would count errors in last minute
  return Math.random() * 3; // 0-3 errors/min
}

async function measureDatabaseReadLoad(): Promise<number> {
  // Would measure actual DB read operations
  return Math.random() * 40 + 10; // 10-50 ops/sec
}

async function measureDatabaseWriteLoad(): Promise<number> {
  // Would measure actual DB write operations
  return Math.random() * 15 + 5; // 5-20 ops/sec
}

async function measureActiveConnections(): Promise<number> {
  // Would count active connections
  return Math.floor(Math.random() * 50 + 10); // 10-60 connections
}

async function measureMemoryUsage(): Promise<number> {
  // Would measure actual memory usage
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage();
    const total = usage.heapTotal;
    const used = usage.heapUsed;
    return Math.round((used / total) * 100);
  }
  return Math.random() * 30 + 40; // 40-70% (simulated)
}
