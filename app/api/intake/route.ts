import { NextResponse } from 'next/server';
import { addLead, logEvent } from '@/lib/uoi/store';
import { ensureGtmCampaignsBound, ingestCampaignEntry } from '@/lib/gtm/campaigns';
import { ensureGtmFunnelsBound, ingestFunnelEvent } from '@/lib/gtm/funnels';
import { handleIntakecrmLane1Intake } from "@/lib/intakecrm/intakecrm-lane1-intake-triage";
import { resolveIntakecrmContext } from "@/lib/intakecrm/intakecrm-tenant-boundary";
import { triggerIntakeLead } from "@/lib/n8n/trigger";
import { buildSignupApprovalMessage, sendSlackBlockMessage } from "@/lib/integrations/slack-blocks";
import { storeSignupRequest } from "@/lib/signup-approval/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Capture the submission in memory store
    const lead = addLead({
      ...body,
      type: 'standard_lead',
      stage: 'New Lead'
    });
    
    // 2. Log to Timeline
    logEvent({
      type: 'activation',
      source: 'operator', // triggered by user action
      description: `New Lead Intake: ${body.businessName || 'Unknown'}`,
      metadata: { leadId: lead.id }
    });
    
    console.log('[INTAKE] Processed:', lead.id);

    // GTM-3: campaign + funnel entry (purely additive wiring)
    try {
      ensureGtmCampaignsBound();
      ensureGtmFunnelsBound();
      const at = Date.now();
      ingestCampaignEntry({
        eventType: "contactCreated",
        source: "leadGen",
        subjectType: "contact",
        subjectId: lead.id,
        at,
        payload: { leadId: lead.id, businessName: body.businessName, email: body.email },
      });
      ingestFunnelEvent({ entityId: lead.id, eventType: "contactCreated", at, meta: { leadId: lead.id } });
    } catch {
      // passive lane; ignore
    }

    // intakecrm Lane 1 (first real CRM domain)
    try {
      const ctx = resolveIntakecrmContext(request);
      await handleIntakecrmLane1Intake({
        tenant: ctx.tenant,
        actor: { role: "operator", id: null, label: "public_intake" },
        payload: { ...body, source: body?.source || "web_form" },
      });
    } catch {
      // passive lane; ignore
    }

    // n8n workflow trigger (email notification + Airtable)
    try {
      triggerIntakeLead({
        name: body.name || "",
        email: body.email || "",
        phone: body.phone || "",
        businessName: body.businessName || "",
        goal: body.goal || "growth",
        source: body.source || "xom3_intake_form",
      }).catch(err => console.warn("[INTAKE] n8n trigger failed:", err));
    } catch {
      // passive lane; ignore
    }

    // Send Slack notification for signup approval
    try {
      const signupId = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // Store signup request
      storeSignupRequest({
        signupId,
        email: body.email || "",
        name: body.name || "",
        phone: body.phone || "",
        businessName: body.businessName || "",
      });

      const slackMessage = buildSignupApprovalMessage({
        signupId,
        name: body.name || "",
        email: body.email || "",
        phone: body.phone || "",
        businessName: body.businessName || "",
        goal: body.goal || "growth",
        submittedAt: new Date().toISOString(),
      });

      const slackResult = await sendSlackBlockMessage(slackMessage, "#new-sign-up");
      
      if (!slackResult.ok) {
        console.warn("[INTAKE] Slack notification failed:", slackResult.error);
      } else {
        // Log approval request
        logEvent({
          type: "decision",
          source: "operator",
          description: `Signup approval request sent to Slack: ${body.email}`,
          metadata: {
            signupId,
            email: body.email,
            status: "pending_approval",
          },
        });
      }
    } catch (err) {
      console.warn("[INTAKE] Slack signup notification error:", err);
    }

    // Automated lead processing (NEW: AI-powered conversion system)
    try {
      // Trigger automated lead processing
      const automationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://xom3.io'}/api/automations/process-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id
        })
      });

      if (!automationResponse.ok) {
        console.warn("[INTAKE] Automation processing failed:", await automationResponse.text());
      } else {
        const automationResult = await automationResponse.json();
        console.log("[INTAKE] Automation completed:", automationResult);

        // Log automation success
        logEvent({
          type: "automation",
          source: "system",
          description: `Lead automation initiated: Score ${automationResult.score}/100 (${automationResult.category})`,
          metadata: {
            leadId: lead.id,
            automationResult
          },
        });
      }
    } catch (automationError) {
      console.warn("[INTAKE] Automation trigger error:", automationError);
      // Don't fail the intake if automation fails - passive lane
    }

    // 3. Return success with real ID
    return NextResponse.json({
      success: true,
      message: "Intake received. AI automation sequence initiated.",
      id: lead.id
    });
  } catch (error) {
    console.error('[INTAKE] Error:', error);
    return NextResponse.json(
      { success: false, message: "Intake processing failed" },
      { status: 500 }
    );
  }
}
