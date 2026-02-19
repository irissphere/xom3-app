// Credential Status Endpoint
// Returns credential status for all agents in the Vieron Cockpit
// Part of the Supervisor Agent dashboard

import { NextRequest, NextResponse } from "next/server";
import {
  validateAgentCredentials,
  validateAllAgents,
  AgentCredentialReport
} from "@/lib/agents/credential-validator";

/**
 * GET /api/agents/credentials/status
 * Returns credential status for all agents or a specific agent
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const agentId = searchParams.get("agentId");
    const agentName = searchParams.get("agentName") || "Unknown Agent";

    if (agentId) {
      // Return status for specific agent
      const report = validateAgentCredentials(agentId, agentName);
      return NextResponse.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    }

    // Return status for all agents
    const reports = await validateAllAgents();
    
    // Calculate aggregate statistics
    const stats = {
      total: reports.length,
      healthy: reports.filter(r => r.state === "healthy").length,
      degraded: reports.filter(r => r.state === "degraded").length,
      error: reports.filter(r => r.state === "error").length,
      totalViolations: reports.reduce((sum, r) => sum + r.violations.length, 0),
      criticalViolations: reports.reduce(
        (sum, r) => sum + r.violations.filter(v => v.severity === "critical").length,
        0
      )
    };

    return NextResponse.json({
      success: true,
      data: {
        agents: reports,
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error validating agent credentials:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate agent credentials",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/credentials/status
 * Trigger validation for specific agents
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentIds } = body;

    if (!agentIds || !Array.isArray(agentIds)) {
      return NextResponse.json(
        {
          success: false,
          error: "agentIds array is required"
        },
        { status: 400 }
      );
    }

    const reports: AgentCredentialReport[] = [];
    
    for (const agentId of agentIds) {
      const report = validateAgentCredentials(
        agentId,
        `Agent ${agentId}`
      );
      reports.push(report);
    }

    return NextResponse.json({
      success: true,
      data: reports,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error validating agent credentials:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to validate agent credentials",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
