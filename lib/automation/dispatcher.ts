/**
 * Automation Dispatcher
 * Central interface for triggering workflows via various engines
 * 
 * This is the cockpit's automation command center - it routes workflow
 * triggers to the appropriate runner (n8n, VPS, custom, etc.)
 */

export type AutomationRunnerType = "n8n-rest" | "n8n-cli" | "vps" | "custom" | "stub";

export interface AutomationExecution {
  status: "success" | "failed" | "running";
  executionId: string;
  triggeredAt: string;
  completedAt?: string;
  duration?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AutomationDispatcher {
  trigger(workflowId: string, params: Record<string, any>): Promise<AutomationExecution>;
}

/**
 * Stub Automation Dispatcher
 * For now, simulates workflow execution
 * Later will route to n8n MCP, VPS, or custom runners
 */
export class StubAutomationDispatcher implements AutomationDispatcher {
  async trigger(workflowId: string, params: Record<string, any>): Promise<AutomationExecution> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const triggeredAt = new Date().toISOString();

    // Simulate 80% success rate for stub
    const success = Math.random() > 0.2;

    if (success) {
      const completedAt = new Date(Date.now() + 2000).toISOString();
      const duration = 2000;

      return {
        status: "success",
        executionId,
        triggeredAt,
        completedAt,
        duration,
        metadata: {
          workflowId,
          params,
          runnerType: "stub"
        }
      };
    } else {
      const completedAt = new Date(Date.now() + 1000).toISOString();
      const duration = 1000;

      return {
        status: "failed",
        executionId,
        triggeredAt,
        completedAt,
        duration,
        errorMessage: "Simulated failure for testing",
        metadata: {
          workflowId,
          params,
          runnerType: "stub"
        }
      };
    }
  }
}

/**
 * n8n REST API Dispatcher
 * Triggers workflows via n8n REST API webhooks
 */
export class N8nRestDispatcher implements AutomationDispatcher {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async trigger(workflowId: string, params: Record<string, any>): Promise<AutomationExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const triggeredAt = new Date().toISOString();

    try {
      // Call n8n webhook endpoint
      const response = await fetch(`${this.baseUrl}/webhook/${workflowId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`n8n API error: ${response.status}`);
      }

      const data = await response.json();
      const completedAt = new Date().toISOString();
      const duration = Date.now() - new Date(triggeredAt).getTime();

      return {
        status: "success",
        executionId,
        triggeredAt,
        completedAt,
        duration: Math.round(duration / 1000),
        metadata: {
          workflowId,
          params,
          runnerType: "n8n-rest",
          n8nResponse: data
        }
      };
    } catch (error: any) {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - new Date(triggeredAt).getTime();

      return {
        status: "failed",
        executionId,
        triggeredAt,
        completedAt,
        duration: Math.round(duration / 1000),
        errorMessage: error.message || "Unknown error",
        metadata: {
          workflowId,
          params,
          runnerType: "n8n-rest"
        }
      };
    }
  }
}

/**
 * n8n CLI Dispatcher
 * Triggers workflows via n8n CLI commands on VPS
 * 
 * Production-ready implementation with:
 * - Process spawning with timeout protection
 * - stdout/stderr capture for execution logs
 * - Exit code handling
 * - Error recovery and logging
 */
export class N8nCliDispatcher implements AutomationDispatcher {
  private n8nPath: string;
  private timeoutMs: number;
  private workingDirectory?: string;
  private environment?: Record<string, string>;

  constructor(
    n8nPath: string = "n8n",
    timeoutMs: number = 300000, // 5 minutes default
    workingDirectory?: string,
    environment?: Record<string, string>
  ) {
    this.n8nPath = n8nPath;
    this.timeoutMs = timeoutMs;
    this.workingDirectory = workingDirectory;
    this.environment = environment;
  }

  async trigger(workflowId: string, params: Record<string, any>): Promise<AutomationExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const triggeredAt = new Date().toISOString();
    const startTime = Date.now();

    // Prepare command arguments
    // n8n execute --id=<workflowId> --input=<json>
    const inputJson = JSON.stringify(params);
    const args = [
      "execute",
      "--id", workflowId,
      "--input", inputJson
    ];

    // Merge environment variables (preserve process.env, add custom)
    const env = {
      ...process.env,
      ...this.environment,
      // Ensure n8n can find its config
      N8N_USER_FOLDER: process.env.N8N_USER_FOLDER || process.env.HOME + "/.n8n",
    };

    let stdout = "";
    let stderr = "";
    let exitCode: number | null = null;
    let timeoutKilled = false;

    try {
      const { spawn } = await import("child_process");
      
      console.log(`[N8nCliDispatcher] Executing workflow: ${workflowId} (Execution ID: ${executionId})`);
      console.log(`[N8nCliDispatcher] Command: ${this.n8nPath} ${args.join(" ")}`);

      // Spawn n8n process
      const proc = spawn(this.n8nPath, args, {
        env,
        cwd: this.workingDirectory,
        shell: false, // Use spawn, not shell
        stdio: ["ignore", "pipe", "pipe"] // stdin: ignore, stdout/stderr: pipe
      });

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!proc.killed) {
          console.warn(`[N8nCliDispatcher] Execution timeout after ${this.timeoutMs}ms, killing process`);
          timeoutKilled = true;
          proc.kill("SIGTERM");
          
          // Force kill after grace period
          setTimeout(() => {
            if (!proc.killed) {
              proc.kill("SIGKILL");
            }
          }, 5000);
        }
      }, this.timeoutMs);

      // Capture stdout
      proc.stdout?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        // Log in real-time for debugging (first 500 chars)
        if (stdout.length <= 500) {
          console.log(`[N8nCliDispatcher] stdout: ${chunk.substring(0, 200)}`);
        }
      });

      // Capture stderr
      proc.stderr?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        // Log errors in real-time
        console.error(`[N8nCliDispatcher] stderr: ${chunk.substring(0, 200)}`);
      });

      // Wait for process to complete
      exitCode = await new Promise<number>((resolve, reject) => {
        proc.on("error", (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });

        proc.on("close", (code: number | null, signal: string | null) => {
          clearTimeout(timeout);
          if (signal) {
            console.warn(`[N8nCliDispatcher] Process killed by signal: ${signal}`);
          }
          resolve(code ?? -1);
        });
      });

      const completedAt = new Date().toISOString();
      const duration = Date.now() - startTime;

      // Determine status based on exit code and output
      let status: "success" | "failed" | "running" = "failed";
      let errorMessage: string | undefined;

      if (timeoutKilled) {
        status = "failed";
        errorMessage = `Execution timeout after ${this.timeoutMs}ms`;
      } else if (exitCode === 0) {
        status = "success";
      } else {
        status = "failed";
        // Extract error message from stderr or stdout
        const errorOutput = stderr || stdout;
        errorMessage = errorOutput 
          ? `n8n CLI exited with code ${exitCode}: ${errorOutput.substring(0, 500)}`
          : `n8n CLI exited with code ${exitCode}`;
      }

      console.log(`[N8nCliDispatcher] Execution completed: ${status} (exit code: ${exitCode}, duration: ${duration}ms)`);

      return {
        status,
        executionId,
        triggeredAt,
        completedAt,
        duration: Math.round(duration / 1000), // Convert to seconds
        errorMessage,
        metadata: {
          workflowId,
          params,
          runnerType: "n8n-cli",
          exitCode,
          timeoutKilled,
          stdout: stdout.substring(0, 10000), // Limit stdout size (first 10KB)
          stderr: stderr.substring(0, 10000), // Limit stderr size (first 10KB)
          command: `${this.n8nPath} ${args.join(" ")}`
        }
      };

    } catch (error: any) {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - startTime;

      console.error(`[N8nCliDispatcher] Execution error:`, error);

      return {
        status: "failed",
        executionId,
        triggeredAt,
        completedAt,
        duration: Math.round(duration / 1000),
        errorMessage: error.message || "Unknown error during n8n CLI execution",
        metadata: {
          workflowId,
          params,
          runnerType: "n8n-cli",
          error: error.toString(),
          stdout: stdout.substring(0, 10000),
          stderr: stderr.substring(0, 10000)
        }
      };
    }
  }
}

/**
 * VPS Custom Dispatcher
 * Triggers workflows via custom VPS runner
 */
export class VpsDispatcher implements AutomationDispatcher {
  private vpsEndpoint: string;

  constructor(vpsEndpoint: string) {
    this.vpsEndpoint = vpsEndpoint.replace(/\/$/, "");
  }

  async trigger(workflowId: string, params: Record<string, any>): Promise<AutomationExecution> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const triggeredAt = new Date().toISOString();

    try {
      const response = await fetch(`${this.vpsEndpoint}/trigger/${workflowId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`VPS API error: ${response.status}`);
      }

      const data = await response.json();
      const completedAt = new Date().toISOString();
      const duration = Date.now() - new Date(triggeredAt).getTime();

      return {
        status: data.status === "success" ? "success" : "failed",
        executionId: data.executionId || executionId,
        triggeredAt,
        completedAt,
        duration: data.duration || Math.round(duration / 1000),
        errorMessage: data.errorMessage,
        metadata: {
          workflowId,
          params,
          runnerType: "vps",
          vpsResponse: data
        }
      };
    } catch (error: any) {
      const completedAt = new Date().toISOString();
      const duration = Date.now() - new Date(triggeredAt).getTime();

      return {
        status: "failed",
        executionId,
        triggeredAt,
        completedAt,
        duration: Math.round(duration / 1000),
        errorMessage: error.message || "Unknown error",
        metadata: {
          workflowId,
          params,
          runnerType: "vps"
        }
      };
    }
  }
}

/**
 * Get the appropriate dispatcher based on configuration
 */
export function getAutomationDispatcher(): AutomationDispatcher {
  const runnerType = process.env.AUTOMATION_RUNNER_TYPE || "stub";

  switch (runnerType) {
    case "n8n-rest":
      const n8nUrl = process.env.N8N_BASE_URL || "http://localhost:5678";
      return new N8nRestDispatcher(n8nUrl);

    case "n8n-cli":
      const n8nPath = process.env.N8N_CLI_PATH || "n8n";
      const timeoutMs = parseInt(process.env.N8N_CLI_TIMEOUT_MS || "300000", 10); // 5 min default
      const workingDir = process.env.N8N_WORKING_DIRECTORY;
      
      // Optional: pass through environment variables for n8n
      const n8nEnv: Record<string, string> = {};
      if (process.env.N8N_USER_FOLDER) {
        n8nEnv.N8N_USER_FOLDER = process.env.N8N_USER_FOLDER;
      }
      if (process.env.N8N_ENCRYPTION_KEY) {
        n8nEnv.N8N_ENCRYPTION_KEY = process.env.N8N_ENCRYPTION_KEY;
      }
      
      return new N8nCliDispatcher(n8nPath, timeoutMs, workingDir, Object.keys(n8nEnv).length > 0 ? n8nEnv : undefined);

    case "vps":
      const vpsEndpoint = process.env.VPS_AUTOMATION_ENDPOINT;
      if (!vpsEndpoint) {
        throw new Error("VPS_AUTOMATION_ENDPOINT not configured");
      }
      return new VpsDispatcher(vpsEndpoint);

    case "stub":
    default:
      return new StubAutomationDispatcher();
  }
}

/**
 * Main automation trigger function
 * This is what the cockpit calls to trigger workflows
 */
export async function triggerAutomation(
  workflowId: string,
  params: Record<string, any> = {}
): Promise<AutomationExecution> {
  const dispatcher = getAutomationDispatcher();
  return dispatcher.trigger(workflowId, params);
}
