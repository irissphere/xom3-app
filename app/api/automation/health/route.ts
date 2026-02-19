import { NextResponse } from "next/server";
import { getAutomationDispatcher } from "@/lib/automation/dispatcher";

export async function GET() {
  const runnerType = process.env.AUTOMATION_RUNNER_TYPE || "stub";
  const n8nUrl = process.env.N8N_BASE_URL || "http://localhost:5678";
  
  const health: {
    status: "healthy" | "degraded" | "error";
    runnerType: string;
    n8nUrl: string | null;
    n8nConnected: boolean;
    message: string;
    checks: Record<string, { ok: boolean; message: string }>;
  } = {
    status: "healthy",
    runnerType,
    n8nUrl: runnerType === "n8n-rest" ? n8nUrl : null,
    n8nConnected: false,
    message: "",
    checks: {},
  };

  // Check if using stub (demo mode)
  if (runnerType === "stub") {
    health.message = "Automation runner: stub (local)";
    health.checks.dispatcher = { ok: true, message: "Stub dispatcher active" };
    return NextResponse.json(health);
  }

  // Check n8n REST API connectivity
  if (runnerType === "n8n-rest") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${n8nUrl}/healthz`, {
        method: "GET",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        health.n8nConnected = true;
        health.checks.n8n = { ok: true, message: `Connected to n8n at ${n8nUrl}` };
      } else {
        health.status = "degraded";
        health.checks.n8n = { ok: false, message: `n8n returned status ${response.status}` };
      }
    } catch (error: any) {
      health.status = "error";
      health.n8nConnected = false;
      health.checks.n8n = { 
        ok: false, 
        message: error.name === "AbortError" 
          ? "n8n connection timed out" 
          : `Failed to connect to n8n: ${error.message}` 
      };
    }
  }

  // Check n8n CLI
  if (runnerType === "n8n-cli") {
    const n8nPath = process.env.N8N_CLI_PATH || "n8n";
    health.checks.n8nCli = { ok: true, message: `CLI configured at: ${n8nPath}` };
    // Note: Actual CLI testing requires spawning process - done in actual execution
  }

  // Check VPS endpoint
  if (runnerType === "vps") {
    const vpsEndpoint = process.env.VPS_AUTOMATION_ENDPOINT;
    if (!vpsEndpoint) {
      health.status = "error";
      health.checks.vps = { ok: false, message: "VPS_AUTOMATION_ENDPOINT not configured" };
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${vpsEndpoint}/health`, {
          method: "GET",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          health.checks.vps = { ok: true, message: `VPS endpoint responding at ${vpsEndpoint}` };
        } else {
          health.status = "degraded";
          health.checks.vps = { ok: false, message: `VPS returned status ${response.status}` };
        }
      } catch (error: any) {
        health.status = "error";
        health.checks.vps = { 
          ok: false, 
          message: error.name === "AbortError" 
            ? "VPS connection timed out" 
            : `Failed to connect to VPS: ${error.message}` 
        };
      }
    }
  }

  // Set overall message
  if (health.status === "healthy") {
    health.message = `Automation system healthy using ${runnerType} runner`;
  } else if (health.status === "degraded") {
    health.message = `Automation system degraded - some checks failed`;
  } else {
    health.message = `Automation system error - connectivity issues`;
  }

  return NextResponse.json(health);
}