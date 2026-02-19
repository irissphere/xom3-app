/**
 * n8n CLI Runner Module
 * 
 * Production-ready runner that executes n8n workflows via CLI,
 * captures stdout/stderr, enforces timeouts, and returns structured results.
 * 
 * Usage:
 *   const result = await runN8nWorkflowCli(workflowId, params, { logPath: "/var/log/n8n_runs.log" });
 *   if (result.code === 0 && !result.timedOut) {
 *     // Success
 *   }
 */

import { spawn } from "child_process";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { dirname } from "path";

export type RunnerResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.N8N_RUN_TIMEOUT_MS || 5 * 60 * 1000); // 5 minutes

/**
 * Run n8n workflow via CLI
 * 
 * @param workflowId - n8n workflow ID
 * @param params - Input parameters for the workflow
 * @param opts - Optional configuration (timeout, log path)
 * @returns RunnerResult with exit code, stdout, stderr, duration, and timeout status
 */
export async function runN8nWorkflowCli(
  workflowId: string,
  params: Record<string, any> = {},
  opts: { timeoutMs?: number; logPath?: string } = {}
): Promise<RunnerResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();
  
  // Build n8n CLI command arguments
  const args = [
    "execute",
    "--id",
    String(workflowId),
    "--input",
    JSON.stringify(params)
  ];

  // Determine n8n command (global install vs npx)
  // Set N8N_CMD="npx n8n" if using npx, or "n8n" for global install
  const n8nCmd = process.env.N8N_CMD || "n8n";
  
  console.log(`[Runner] Executing: ${n8nCmd} ${args.join(" ")}`);
  console.log(`[Runner] Workflow ID: ${workflowId}, Timeout: ${timeoutMs}ms`);

  // Spawn n8n process
  const proc = spawn(n8nCmd, args, {
    env: {
      ...process.env,
      // Ensure n8n can find its config
      N8N_USER_FOLDER: process.env.N8N_USER_FOLDER || process.env.HOME + "/.n8n",
    },
    shell: false, // Use spawn, not shell (more secure)
    stdio: ["ignore", "pipe", "pipe"] // stdin: ignore, stdout/stderr: pipe
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  // Set up timeout protection
  const timer = setTimeout(() => {
    timedOut = true;
    console.warn(`[Runner] Execution timeout after ${timeoutMs}ms, killing process`);
    try {
      proc.kill("SIGTERM");
    } catch (e) {
      // Process may already be dead
    }
    
    // Force kill after grace period
    setTimeout(() => {
      try {
        if (!proc.killed) {
          proc.kill("SIGKILL");
        }
      } catch (e) {
        // Ignore
      }
    }, 2000);
  }, timeoutMs);

  // Capture stdout in real-time
  proc.stdout?.on("data", (d: Buffer) => {
    const chunk = d.toString();
    stdout += chunk;
    // Log first 200 chars for debugging
    if (stdout.length <= 200) {
      console.log(`[Runner] stdout: ${chunk.substring(0, 200)}`);
    }
  });

  // Capture stderr in real-time
  proc.stderr?.on("data", (d: Buffer) => {
    const chunk = d.toString();
    stderr += chunk;
    // Log errors immediately
    console.error(`[Runner] stderr: ${chunk.substring(0, 200)}`);
  });

  // Wait for process to complete
  const code: number | null = await new Promise((resolve) => {
    proc.on("close", (c: number | null, signal: string | null) => {
      clearTimeout(timer);
      if (signal) {
        console.warn(`[Runner] Process killed by signal: ${signal}`);
      }
      resolve(c);
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      stderr += `\n[runner error] ${err.message}`;
      console.error(`[Runner] Process error:`, err);
      resolve(null);
    });
  });

  const durationMs = Date.now() - start;

  // Optional: persist full logs to disk for later inspection
  if (opts.logPath) {
    try {
      // Ensure log directory exists
      const logDir = dirname(opts.logPath);
      await mkdir(logDir, { recursive: true });

      const payload = [
        `--- RUN ${new Date().toISOString()} ---`,
        `workflowId: ${workflowId}`,
        `args: ${JSON.stringify(args)}`,
        `durationMs: ${durationMs}`,
        `exitCode: ${code}`,
        `timedOut: ${timedOut}`,
        `--- STDOUT ---`,
        stdout,
        `--- STDERR ---`,
        stderr,
        "\n\n"
      ].join("\n");

      await writeFile(opts.logPath, payload, { flag: "a" });
      console.log(`[Runner] Logs written to: ${opts.logPath}`);
    } catch (e: any) {
      // Non-fatal: log to stderr but don't fail execution
      console.error(`[Runner] Failed to write log file: ${e.message}`);
    }
  }

  console.log(`[Runner] Execution completed: exitCode=${code}, duration=${durationMs}ms, timedOut=${timedOut}`);

  return { code, stdout, stderr, durationMs, timedOut };
}
