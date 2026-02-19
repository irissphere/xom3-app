// Pipeline Scheduler
// Handles scheduled execution of migration pipelines

import { MigrationPipeline } from "./types";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { initializePipelineSystem } from "./init";

const PIPELINES_FILE = path.join(process.cwd(), "pipelines", "active-pipelines.json");
const EXECUTIONS_FILE = path.join(process.cwd(), "pipelines", "executions.json");

// Initialize pipeline system on module load
initializePipelineSystem();

export function loadPipelines(): MigrationPipeline[] {
  try {
    if (existsSync(PIPELINES_FILE)) {
      const content = readFileSync(PIPELINES_FILE, "utf8");
      return JSON.parse(content);
    }
  } catch (error: any) {
    console.error("Failed to load pipelines:", error);
    if (error.code === "ENOENT") {
      console.error(`Pipelines file not found: ${PIPELINES_FILE}`);
    } else if (error.code === "EACCES") {
      console.error(`Permission denied reading pipelines file: ${PIPELINES_FILE}`);
    } else {
      console.error(`Error reading pipelines file: ${error.message || String(error)}`);
    }
  }
  return [];
}

export function savePipeline(pipeline: MigrationPipeline): void {
  const pipelines = loadPipelines();
  const index = pipelines.findIndex(p => p.id === pipeline.id);
  
  if (index >= 0) {
    pipelines[index] = { ...pipeline, updatedAt: new Date().toISOString() };
  } else {
    pipelines.push(pipeline);
  }
  
  writeFileSync(PIPELINES_FILE, JSON.stringify(pipelines, null, 2));
}

export function deletePipeline(pipelineId: string): void {
  const pipelines = loadPipelines().filter(p => p.id !== pipelineId);
  writeFileSync(PIPELINES_FILE, JSON.stringify(pipelines, null, 2));
}

export function getPipeline(pipelineId: string): MigrationPipeline | null {
  return loadPipelines().find(p => p.id === pipelineId) || null;
}

export function getPipelinesByTenant(tenant: string): MigrationPipeline[] {
  return loadPipelines().filter(p => p.tenant === tenant && p.enabled);
}

// Get all scheduled pipelines (non-manual)
export function getScheduledPipelines(): MigrationPipeline[] {
  return loadPipelines().filter(
    p => p.enabled && p.schedule && p.schedule !== "manual"
  );
}

// Calculate next run time based on schedule
export function calculateNextRun(pipeline: MigrationPipeline): string | null {
  if (pipeline.schedule === "manual" || !pipeline.enabled) {
    return null;
  }

  const now = new Date();
  const next = new Date(now);

  switch (pipeline.schedule) {
    case "hourly":
      next.setHours(next.getHours() + 1);
      next.setMinutes(0);
      next.setSeconds(0);
      break;

    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(6); // 6 AM
      next.setMinutes(0);
      next.setSeconds(0);
      break;

    case "weekly":
      next.setDate(next.getDate() + 7);
      next.setHours(6);
      next.setMinutes(0);
      next.setSeconds(0);
      break;

    default:
      // Cron expression - simplified handling
      // For full cron support, use a library like node-cron
      return null;
  }

  return next.toISOString();
}

// Check if pipeline should run now
export function shouldRunNow(pipeline: MigrationPipeline): boolean {
  if (!pipeline.enabled || pipeline.schedule === "manual") {
    return false;
  }

  if (!pipeline.nextRun) {
    return false;
  }

  const nextRun = new Date(pipeline.nextRun);
  const now = new Date();

  return now >= nextRun;
}

// Get pipelines that need to run
export function getPipelinesToRun(): MigrationPipeline[] {
  return loadPipelines().filter(pipeline => shouldRunNow(pipeline));
}

// Execute scheduled pipelines
export async function runScheduledPipelines(): Promise<void> {
  const pipelines = getPipelinesToRun();
  
  for (const pipeline of pipelines) {
    try {
      console.log(`Executing pipeline: ${pipeline.name} (${pipeline.id})`);
      const { executePipeline } = await import("./executor");
      const execution = await executePipeline(pipeline);
      
      // Update pipeline with last run and next run
      const updated = {
        ...pipeline,
        lastRun: execution.completedAt || new Date().toISOString(),
        nextRun: calculateNextRun(pipeline) || undefined
      };
      savePipeline(updated);
      
      // Save execution history
      saveExecution(execution);
    } catch (error: any) {
      console.error(`Pipeline execution failed: ${pipeline.id}`, error);
    }
  }
}

// Execution history
export function saveExecution(execution: any): void {
  try {
    let executions: any[] = [];
    if (existsSync(EXECUTIONS_FILE)) {
      const content = readFileSync(EXECUTIONS_FILE, "utf8");
      executions = JSON.parse(content);
    }
    
    executions.unshift(execution);
    // Keep only last 1000 executions
    if (executions.length > 1000) {
      executions = executions.slice(0, 1000);
    }
    
    writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2));
  } catch (error: any) {
    console.error("Failed to save execution:", error);
    if (error.code === "EACCES") {
      console.error(`Permission denied writing executions file: ${EXECUTIONS_FILE}`);
    } else {
      console.error(`Error writing executions file: ${error.message || String(error)}`);
    }
  }
}

export function getExecutions(pipelineId?: string, limit: number = 50): any[] {
  try {
    if (existsSync(EXECUTIONS_FILE)) {
      const content = readFileSync(EXECUTIONS_FILE, "utf8");
      let executions = JSON.parse(content);
      
      if (pipelineId) {
        executions = executions.filter((e: any) => e.pipelineId === pipelineId);
      }
      
      return executions.slice(0, limit);
    }
  } catch (error: any) {
    console.error("Failed to load executions:", error);
    if (error.code === "ENOENT") {
      console.error(`Executions file not found: ${EXECUTIONS_FILE}`);
    } else if (error.code === "EACCES") {
      console.error(`Permission denied reading executions file: ${EXECUTIONS_FILE}`);
    } else {
      console.error(`Error reading executions file: ${error.message || String(error)}`);
    }
  }
  return [];
}
