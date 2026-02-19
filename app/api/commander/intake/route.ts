import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_BASE_URL 
  ? `${process.env.N8N_WEBHOOK_BASE_URL}/lead-intake`
  : "http://31.220.108.45:5678/webhook/lead-intake";

/**
 * COMMANDER INTAKE API
 * 
 * Routes lead intake from forms to n8n workflow
 * Normalizes data and forwards to Lane 2 (CRM Onboarding)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Normalize payload for n8n workflow
    const payload = {
      name: `${body.firstName || ""} ${body.lastName || ""}`.trim(),
      email: body.email || "",
      phone: body.phone || "",
      company: body.company || "",
      message: buildMessage(body),
      source: body.source || "Website - Commander Form",
      
      // Additional structured data
      metadata: {
        firstName: body.firstName,
        lastName: body.lastName,
        title: body.title,
        decisionMaker: body.decisionMaker === true,
        industry: body.industry,
        companySize: body.companySize,
        location: body.location,
        currentProvider: body.currentProvider,
        services: Array.isArray(body.services) ? body.services : [],
        serviceDetails: body.serviceDetails,
        bandwidthNeeds: body.bandwidthNeeds,
        numberOfUsers: body.numberOfUsers,
        timeline: body.timeline,
        budgetRange: body.budgetRange,
        submittedAt: new Date().toISOString(),
      },
    };

    // Forward to n8n workflow
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`n8n webhook failed: ${response.status} ${response.statusText}`);
      throw new Error("Failed to forward lead to workflow");
    }

    const result = await response.json().catch(() => ({ success: true }));

    return NextResponse.json({
      success: true,
      message: "Thank you! We've received your inquiry and will be in touch soon.",
      clientId: result.clientId || null,
    });
  } catch (error: any) {
    console.error("Commander intake error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "intake_failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Build message from form data
 */
function buildMessage(data: any): string {
  const parts: string[] = [];

  if (data.serviceDetails) {
    parts.push(data.serviceDetails);
  }

  if (data.services && Array.isArray(data.services) && data.services.length > 0) {
    parts.push(`Interested in: ${data.services.join(", ")}`);
  }

  if (data.bandwidthNeeds) {
    parts.push(`Bandwidth: ${data.bandwidthNeeds}`);
  }

  if (data.numberOfUsers) {
    parts.push(`Users: ${data.numberOfUsers}`);
  }

  if (data.timeline && data.timeline !== "Not specified") {
    parts.push(`Timeline: ${data.timeline}`);
  }

  if (data.budgetRange && data.budgetRange !== "Not specified") {
    parts.push(`Budget: ${data.budgetRange}`);
  }

  return parts.join(" | ");
}
