import { NextResponse } from "next/server";
import { triggerWorkflow } from "@/lib/n8n/trigger";
import { isWorkflowRegistered } from "@/lib/n8n/workflow-registry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/n8n/test
 * 
 * Test a registered n8n workflow by triggering it with sample data.
 * 
 * Body: {
 *   workflowKey: "xom3-intake" | "xom3-custom-build" | "xom3-trial" | etc.
 *   payload?: { ... } // Optional custom payload
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workflowKey, payload } = body;

    if (!workflowKey) {
      return NextResponse.json({
        ok: false,
        error: "workflowKey is required",
        availableWorkflows: [
          "xom3-intake",
          "xom3-custom-build", 
          "xom3-trial",
          "xom3-contact",
          "xom3-stripe-events",
          "benefitscrm-intake",
          "broadcast-dispatch",
          "hse-alert",
          "ritual-trigger",
        ],
      }, { status: 400 });
    }

    if (!isWorkflowRegistered(workflowKey)) {
      return NextResponse.json({
        ok: false,
        error: `Unknown workflow: ${workflowKey}`,
      }, { status: 404 });
    }

    // Default test payloads for each workflow type
    const testPayloads: Record<string, any> = {
      "xom3-intake": {
        leadId: `test_lead_${Date.now()}`,
        name: "Test Lead",
        email: "test@example.com",
        phone: "555-0123",
        businessName: "Test Business",
        goal: "growth",
        source: "api_test",
        submittedAt: new Date().toISOString(),
        notifyEmail: "preston.chenault@xom3.io",
      },
      "xom3-custom-build": {
        requestId: `test_build_${Date.now()}`,
        name: "Test Requester",
        email: "test@example.com",
        businessName: "Test Business",
        requirements: "This is a test custom build request from the API test endpoint.",
        submittedAt: new Date().toISOString(),
      },
      "xom3-trial": {
        name: "Test Trial User",
        email: "trial@example.com",
        tier: "xom3",
        trialStartedAt: new Date().toISOString(),
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        source: "api_test",
      },
      "xom3-contact": {
        name: "Test Contact",
        email: "contact@example.com",
        phone: "555-0456",
        company: "Test Company",
        subject: "API Test",
        message: "This is a test message from the API test endpoint.",
        source: "api_test",
        submittedAt: new Date().toISOString(),
      },
      "benefitscrm-intake": {
        leadId: `test_benefits_${Date.now()}`,
        name: "Test Benefits Lead",
        email: "benefits@example.com",
        phone: "555-0789",
        businessName: "Test Healthcare Business",
        benefitType: "ACA",
        coverageNeeded: "Family",
        employeeCount: 25,
        notes: "Test lead from API endpoint",
        submittedAt: new Date().toISOString(),
      },
      "hse-alert": {
        alertId: `test_hse_${Date.now()}`,
        severity: "info",
        source: "api_test",
        posture: "normal",
        riskLevel: "low",
        anomalyCount: 0,
        message: "Test health alert from API endpoint",
        timestamp: new Date().toISOString(),
      },
      "broadcast-dispatch": {
        dispatchId: `test_broadcast_${Date.now()}`,
        platform: "twitter",
        contentType: "post",
        topic: "Test",
        content: "This is a test broadcast dispatch from the XOM3 API test endpoint.",
        scheduledAt: new Date(Date.now() + 60000).toISOString(),
        status: "queued",
        timestamp: new Date().toISOString(),
      },
      "ritual-trigger": {
        triggerId: `test_ritual_${Date.now()}`,
        ritualKey: "test-ritual",
        reason: "API test",
        source: "api_test",
        timestamp: new Date().toISOString(),
      },
    };

    // Use provided payload or fall back to test payload
    const finalPayload = payload || testPayloads[workflowKey] || { test: true, timestamp: new Date().toISOString() };

    console.log(`[n8n] Testing workflow: ${workflowKey}`);
    const result = await triggerWorkflow(workflowKey, finalPayload);

    return NextResponse.json({
      ok: result.success,
      workflowKey,
      workflowId: result.workflowId,
      webhookUrl: result.webhookUrl,
      duration: `${result.duration}ms`,
      response: result.response,
      error: result.error,
      payloadUsed: finalPayload,
      timestamp: new Date().toISOString(),
    }, { 
      status: result.success ? 200 : 500,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[n8n] Test error:", error);
    return NextResponse.json({
      ok: false,
      error: error?.message || "Test failed",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}




































