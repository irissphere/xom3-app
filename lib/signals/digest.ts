/**
 * Daily Digest Generator
 * Builds operator-grade daily briefing for automation health
 */

import { getBase } from "@/lib/airtable/client";
import { calculateHealthScore, evaluateGovernanceRules } from "@/lib/governance/rules";
import { loadLastState } from "./state";

export interface DailyDigest {
  date: string;
  healthScore: number;
  previousHealthScore: number | null;
  healthTrend: "improving" | "degrading" | "stable";
  totalExecutions: number;
  failures: number;
  failureRate: number;
  avgDuration: number;
  running: number;
  topIssues: Array<{
    type: string;
    workflowName: string;
    message: string;
    severity: "high" | "medium" | "low";
  }>;
  slowestWorkflows: Array<{
    workflowName: string;
    avgDuration: number;
  }>;
  recommendation: string;
  verdict: "healthy" | "watch" | "critical";
}

// Simplified analytics aggregation for digest
async function getAnalyticsForDigest(range: string) {
  try {
    const base = await getBase();

    let dateFilter: string | null = null;
    if (range !== "all") {
      const days = parseInt(range.replace("d", ""), 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      dateFilter = cutoffDate.toISOString();
    }

    let records: any[] = [];
    try {
      const queryOptions: any = {};
      try {
        queryOptions.sort = [{ field: "Triggered_At", direction: "desc" }];
      } catch {
        // Sort field might not exist
      }

      if (dateFilter) {
        queryOptions.filterByFormula = `IS_AFTER({Triggered_At}, '${dateFilter}')`;
      }

      const query = base("Workflow_Executions").select(queryOptions);
      const queryResult = await query.all();
      records = Array.from(queryResult);
    } catch (error: any) {
      if (error.message?.includes("NOT_FOUND") || error.message?.includes("does not exist")) {
        return null;
      }
      throw error;
    }

    if (records.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        running: 0,
        successRate: 0,
        failureRate: 0,
        avgDuration: 0,
        topFailingWorkflows: [],
        slowestWorkflows: []
      };
    }

    const executions = records.map((r: any) => {
      const workflowName = r.fields.Workflow_Name || 
                          r.fields["Workflow Name"] ||
                          r.fields["Workflow"] ||
                          r.fields.Name ||
                          "Unknown Workflow";

      const rawStatus = r.fields.Status || 
                       r.fields["Status"] ||
                       r.fields["Execution Status"] ||
                       "Unknown";
      
      let normalizedStatus: "Success" | "Failed" | "Running" = "Success";
      const statusLower = String(rawStatus).toLowerCase();
      if (statusLower.includes("fail") || statusLower.includes("error")) {
        normalizedStatus = "Failed";
      } else if (statusLower.includes("running") || statusLower.includes("pending") || statusLower.includes("in progress")) {
        normalizedStatus = "Running";
      } else if (statusLower.includes("success") || statusLower.includes("complete") || statusLower.includes("done")) {
        normalizedStatus = "Success";
      }

      const triggeredAt = r.fields.Triggered_At || 
                          r.fields["Triggered At"] ||
                          r.fields["Triggered_Time"] ||
                          r.fields["Created Time"] ||
                          r.fields["Date"] ||
                          r.createdTime ||
                          new Date().toISOString();

      const completedAt = r.fields.Completed_At || 
                         r.fields["Completed At"] ||
                         r.fields["Completed_Time"] ||
                         r.fields["Finished At"] ||
                         null;

      let duration: number | null = null;
      if (triggeredAt && completedAt) {
        const start = new Date(triggeredAt).getTime();
        const end = new Date(completedAt).getTime();
        if (!isNaN(start) && !isNaN(end)) {
          duration = Math.round((end - start) / 1000);
        }
      }

      return {
        id: r.id,
        workflowName,
        status: normalizedStatus,
        triggeredAt,
        duration
      };
    });

    const total = executions.length;
    const success = executions.filter(e => e.status === "Success").length;
    const failed = executions.filter(e => e.status === "Failed").length;
    const running = executions.filter(e => e.status === "Running").length;
    const successRate = total > 0 ? (success / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    const completedExecutions = executions.filter(e => e.duration !== null);
    const avgDuration = completedExecutions.length > 0
      ? Math.round(completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / completedExecutions.length)
      : 0;

    const workflowStats: Record<string, {
      name: string;
      total: number;
      success: number;
      failed: number;
      running: number;
      durations: number[];
    }> = {};

    executions.forEach(exec => {
      if (!workflowStats[exec.workflowName]) {
        workflowStats[exec.workflowName] = {
          name: exec.workflowName,
          total: 0,
          success: 0,
          failed: 0,
          running: 0,
          durations: []
        };
      }
      workflowStats[exec.workflowName].total++;
      if (exec.status === "Success") workflowStats[exec.workflowName].success++;
      if (exec.status === "Failed") workflowStats[exec.workflowName].failed++;
      if (exec.status === "Running") workflowStats[exec.workflowName].running++;
      if (exec.duration !== null) workflowStats[exec.workflowName].durations.push(exec.duration);
    });

    const topFailingWorkflows = Object.values(workflowStats)
      .map(wf => ({
        workflowName: wf.name,
        failureCount: wf.failed,
        failureRate: wf.total > 0 ? (wf.failed / wf.total) * 100 : 0,
        totalRuns: wf.total
      }))
      .filter(wf => wf.failureCount > 0)
      .sort((a, b) => b.failureCount - a.failureCount)
      .slice(0, 5);

    const slowestWorkflows = Object.values(workflowStats)
      .map(wf => ({
        workflowName: wf.name,
        avgDuration: wf.durations.length > 0
          ? Math.round(wf.durations.reduce((sum, d) => sum + d, 0) / wf.durations.length)
          : 0,
        totalRuns: wf.total
      }))
      .filter(wf => wf.avgDuration > 0)
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 3);

    return {
      total,
      success,
      failed,
      running,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      avgDuration,
      topFailingWorkflows,
      slowestWorkflows
    };
  } catch (error: any) {
    console.error("Digest analytics error:", error);
    return null;
  }
}

/**
 * Build daily digest
 */
export async function buildDailyDigest(): Promise<DailyDigest | null> {
  try {
    // Fetch today's analytics (last 24 hours)
    const todayAnalytics = await getAnalyticsForDigest("1d");
    
    if (!todayAnalytics || todayAnalytics.total === 0) {
      return null; // No data to digest
    }

    // Fetch yesterday's state for comparison
    const previousState = await loadLastState();
    const previousHealthScore = previousState?.lastHealthScore || null;

    // Fetch baseline for health score calculation
    const baseline = await getAnalyticsForDigest("7d");
    const healthScore = calculateHealthScore(todayAnalytics, baseline);

    // Evaluate governance rules
    const alerts = evaluateGovernanceRules(todayAnalytics, baseline);

    // Determine health trend
    let healthTrend: "improving" | "degrading" | "stable" = "stable";
    if (previousHealthScore !== null) {
      const diff = healthScore.score - previousHealthScore;
      if (diff > 5) {
        healthTrend = "improving";
      } else if (diff < -5) {
        healthTrend = "degrading";
      }
    }

    // Determine verdict
    let verdict: "healthy" | "watch" | "critical" = "healthy";
    if (healthScore.score < 50) {
      verdict = "critical";
    } else if (healthScore.score < 75) {
      verdict = "watch";
    }

    // Extract top issues
    const topIssues = alerts
      .filter(a => a.severity === "high" || a.severity === "medium")
      .slice(0, 5)
      .map(a => ({
        type: a.ruleId.includes("failure") ? "failure" : "performance",
        workflowName: a.workflowName || "System",
        message: a.message,
        severity: a.severity
      }));

    // Get slowest workflows
    const slowestWorkflows = todayAnalytics.slowestWorkflows.map(wf => ({
      workflowName: wf.workflowName,
      avgDuration: wf.avgDuration
    }));

    // Generate recommendation
    let recommendation = "No action required — automation layer is healthy.";
    
    if (topIssues.length > 0) {
      const topIssue = topIssues[0];
      if (topIssue.type === "failure") {
        recommendation = `Investigate ${topIssue.workflowName} failures — ${topIssue.message}`;
      } else {
        recommendation = `Monitor ${topIssue.workflowName} performance — ${topIssue.message}`;
      }
    } else if (todayAnalytics.failureRate > 5) {
      recommendation = `Failure rate is ${todayAnalytics.failureRate.toFixed(1)}% — review failing workflows.`;
    } else if (slowestWorkflows.length > 0 && slowestWorkflows[0].avgDuration > 300) {
      recommendation = `${slowestWorkflows[0].workflowName} is running slowly (${Math.round(slowestWorkflows[0].avgDuration / 60)}m avg) — consider optimization.`;
    }

    return {
      date: new Date().toISOString().split("T")[0],
      healthScore: healthScore.score,
      previousHealthScore,
      healthTrend,
      totalExecutions: todayAnalytics.total,
      failures: todayAnalytics.failed,
      failureRate: todayAnalytics.failureRate,
      avgDuration: todayAnalytics.avgDuration,
      running: todayAnalytics.running,
      topIssues,
      slowestWorkflows,
      recommendation,
      verdict
    };
  } catch (error: any) {
    console.error("Failed to build daily digest:", error);
    return null;
  }
}
