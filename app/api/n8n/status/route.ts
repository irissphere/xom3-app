import { NextResponse } from "next/server";
import { WORKFLOW_REGISTRY, getActiveWorkflows, getWorkflowsByDomain } from "@/lib/n8n/workflow-registry";
import { getWorkflowStatus } from "@/lib/n8n/trigger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ping the n8n server to verify real connectivity.
 * Tests the /api/v1/workflows endpoint which requires auth.
 * Falls back to a simple HEAD request to the base URL.
 */
async function checkN8nConnectivity(baseUrl: string): Promise<{
  connected: boolean;
  latencyMs: number;
  version?: string;
  error?: string;
}> {
  const start = Date.now();
  const apiKey = process.env.N8N_API_KEY;

  // Try authenticated API call first
  if (apiKey) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/workflows?limit=1`, {
        headers: { 'X-N8N-API-KEY': apiKey },
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { connected: true, latencyMs };
      }
      return { connected: false, latencyMs, error: `API returned ${res.status}` };
    } catch (err: any) {
      return { connected: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  // Fallback: unauthenticated ping
  try {
    const res = await fetch(baseUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - start;
    return { connected: res.ok || res.status === 401 || res.status === 302, latencyMs };
  } catch (err: any) {
    return { connected: false, latencyMs: Date.now() - start, error: err.message };
  }
}

/**
 * GET /api/n8n/status
 * 
 * Returns the status of all registered n8n workflows for XOM3.
 * Now with real connectivity checks to the n8n server.
 * Use query param ?domain=xom3|benefitscrm|broadcast|system to filter.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const domain = url.searchParams.get("domain") as "xom3" | "benefitscrm" | "broadcast" | "system" | null;
  
  try {
    const n8nBaseUrl = process.env.N8N_WEBHOOK_BASE_URL || "http://31.220.108.45:5678";
    
    // Real connectivity check
    const connectivity = await checkN8nConnectivity(n8nBaseUrl);

    // Get workflow status
    const status = getWorkflowStatus();
    const activeCount = getActiveWorkflows().length;
    const totalCount = Object.keys(WORKFLOW_REGISTRY).length;
    
    // Filter by domain if requested
    let workflows = Object.entries(WORKFLOW_REGISTRY).map(([key, def]) => ({
      key,
      ...def,
      webhookUrl: status[key]?.webhookUrl,
    }));
    
    if (domain) {
      workflows = workflows.filter(w => w.domain === domain);
    }
    
    // Group by domain
    const byDomain = {
      xom3: getWorkflowsByDomain("xom3"),
      benefitscrm: getWorkflowsByDomain("benefitscrm"),
      broadcast: getWorkflowsByDomain("broadcast"),
      system: getWorkflowsByDomain("system"),
    };

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      n8n: {
        baseUrl: n8nBaseUrl,
        webhookBaseUrl: `${n8nBaseUrl}/webhook`,
        connected: connectivity.connected,
        latencyMs: connectivity.latencyMs,
        error: connectivity.error || null,
      },
      summary: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount,
      },
      domains: {
        xom3: byDomain.xom3.length,
        benefitscrm: byDomain.benefitscrm.length,
        broadcast: byDomain.broadcast.length,
        system: byDomain.system.length,
      },
      workflows,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("[n8n] Status check error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Failed to get n8n status",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}




































