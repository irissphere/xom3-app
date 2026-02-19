import { NextResponse } from "next/server";
import { triggerAutomation } from "@/lib/automation/dispatcher";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { workflowId, params = {} } = body;

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 }
      );
    }

    console.log(`[Automation] Triggering workflow: ${workflowId}`);
    
    const execution = await triggerAutomation(workflowId, params);

    return NextResponse.json({
      success: execution.status === "success",
      execution,
    });
  } catch (error: any) {
    console.error("[Automation] Trigger error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow" },
      { status: 500 }
    );
  }
}

