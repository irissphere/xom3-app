import { NextResponse } from "next/server";
import { addLead, logEvent } from "@/lib/uoi/store";
import { analyzeProposal, ProposalInput } from "@/lib/ai/proposal-analyzer";
import { buildProposalSlackMessage, sendSlackBlockMessage, ProposalData } from "@/lib/integrations/slack-blocks";
import { triggerWorkflow } from "@/lib/n8n/trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/proposal
 * Handles enterprise proposal form submissions
 * - Stores proposal as high-priority lead
 * - Runs AI analysis
 * - Sends Slack notification with action buttons
 * - Sends email notification to preston.chenault@xom3.io
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Normalize form data (form uses fullName/phoneNumber, API uses name/phone)
    const contactName = body.contact?.fullName || body.contact?.name || "";
    const contactEmail = body.contact?.email || "";
    const contactPhone = body.contact?.phoneNumber || body.contact?.phone || "";
    const contactWebsite = body.contact?.companyWebsite || body.contact?.website || "";
    const contactIndustry = body.contact?.primaryIndustry || body.company?.industry || "";
    const contactTeamSize = body.contact?.teamSize || body.company?.teamSize || "";
    const timeline = body.requirements?.implementationTimeline || body.requirements?.timeline || "Not specified";
    const customNeeds = body.requirements?.specificAutomationNeeds || body.requirements?.customNeeds || "";
    
    // Validate required fields
    if (!contactName || !contactEmail) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!body.businesses || body.businesses.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one business is required" },
        { status: 400 }
      );
    }

    // Generate proposal ID
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 1. Store as high-priority lead in UOI
    const lead = addLead({
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      businessName: body.businesses[0]?.companyName || "",
      type: "enterprise_proposal",
      stage: "Enterprise Inquiry",
      priority: "high",
      source: "proposal_form",
      metadata: {
        proposalId,
        industry: contactIndustry,
        teamSize: contactTeamSize,
        businessCount: body.businesses.length,
        timeline,
      },
    });

    // 2. Log to timeline
    logEvent({
      type: "insight",
      source: "operator",
      description: `🏢 ENTERPRISE PROPOSAL: ${body.businesses[0]?.companyName || contactName}`,
      metadata: {
        leadId: lead.id,
        proposalId,
        priority: "high",
        businessCount: body.businesses.length,
      },
    });

    // 3. Run AI analysis - normalize to expected format
    const proposalInput: ProposalInput = {
      contact: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        website: contactWebsite,
      },
      company: {
        industry: contactIndustry,
        teamSize: contactTeamSize,
      },
      businesses: body.businesses,
      requirements: {
        timeline,
        currentTools: body.requirements?.currentTools || "",
        painPoints: body.requirements?.painPoints || "",
        customNeeds,
      },
    };
    
    const analysis = analyzeProposal(proposalInput);

    // 4. Build and send Slack notification
    const proposalData: ProposalData = {
      id: proposalId,
      contact: {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        website: contactWebsite,
      },
      company: {
        industry: contactIndustry,
        teamSize: contactTeamSize,
      },
      businesses: body.businesses,
      requirements: {
        timeline,
        currentTools: body.requirements?.currentTools || "",
        painPoints: body.requirements?.painPoints || "",
        customNeeds,
      },
      submittedAt: body.submittedAt || new Date().toISOString(),
    };

    const slackMessage = buildProposalSlackMessage(proposalData, analysis);
    
    // Send to #enterprise-proposals
    const slackResult = await sendSlackBlockMessage(slackMessage);
    
    if (!slackResult.ok) {
      console.warn("[PROPOSAL] Slack notification failed:", slackResult.error);
    }

    // 5. Trigger n8n workflow for email notification
    try {
      await triggerWorkflow("xom3-proposal", {
        proposalId,
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        businessName: body.businesses[0]?.companyName || "",
        industry: contactIndustry,
        teamSize: contactTeamSize,
        businessCount: body.businesses.length,
        timeline,
        painPoints: body.requirements?.painPoints || "",
        customNeeds,
        analysis: {
          costRange: `$${analysis.onboardingCost.low} - $${analysis.onboardingCost.high}`,
          loe: `${analysis.loe.setupHours.low}-${analysis.loe.setupHours.high} hours`,
          recommendedTier: analysis.recommendedTier,
          addOns: analysis.addOns,
          risks: analysis.risks,
        },
        notifyEmail: "preston.chenault@xom3.io",
        submittedAt: body.submittedAt || new Date().toISOString(),
      }).catch((err) => {
        console.warn("[PROPOSAL] n8n workflow failed:", err);
      });
    } catch (err) {
      console.warn("[PROPOSAL] n8n trigger error:", err);
    }

    // 6. Send direct email notification (fallback if n8n fails)
    try {
      await sendEmailNotification({
        proposalId,
        contact: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          website: contactWebsite,
        },
        company: {
          industry: contactIndustry,
          teamSize: contactTeamSize,
        },
        businesses: body.businesses,
        requirements: {
          timeline,
          currentTools: body.requirements?.currentTools || "",
          painPoints: body.requirements?.painPoints || "",
          customNeeds,
        },
        analysis,
      });
    } catch (err) {
      console.warn("[PROPOSAL] Email notification error:", err);
    }

    console.log(`[PROPOSAL] Processed: ${proposalId} from ${contactEmail}`);

    return NextResponse.json({
      success: true,
      message: "Proposal submitted successfully",
      proposalId,
      leadId: lead.id,
      analysis: {
        recommendedTier: analysis.recommendedTier,
        costRange: `$${analysis.onboardingCost.low} - $${analysis.onboardingCost.high}`,
      },
    });
  } catch (error: any) {
    console.error("[PROPOSAL] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process proposal" },
      { status: 500 }
    );
  }
}

/**
 * Send email notification (via fetch to email service or log)
 */
async function sendEmailNotification(data: {
  proposalId: string;
  contact: { name: string; email: string; phone: string; website: string };
  company: { industry: string; teamSize: string };
  businesses: any[];
  requirements: { timeline: string; currentTools: string; painPoints: string; customNeeds: string };
  analysis: any;
}) {
  const { proposalId, contact, company, businesses, requirements, analysis } = data;

  // Build email body
  const emailBody = `
NEW ENTERPRISE PROPOSAL RECEIVED
================================

Proposal ID: ${proposalId}
Submitted: ${new Date().toISOString()}

CONTACT INFO
------------
Name: ${contact.name}
Email: ${contact.email}
Phone: ${contact.phone || 'Not provided'}
Website: ${contact.website || 'Not provided'}

COMPANY
-------
Industry: ${company.industry || 'Not specified'}
Team Size: ${company.teamSize || 'Not specified'}

BUSINESSES (${businesses.length})
---------------------------------
${businesses.map((b: any, i: number) => `
${i + 1}. ${b.companyName}
   Industry: ${b.industry}
   Integrations: ${b.integrations || 'None specified'}
`).join('')}

REQUIREMENTS
------------
Timeline: ${requirements.timeline || 'Not specified'}
Current Tools: ${requirements.currentTools || 'None specified'}
Pain Points: ${requirements.painPoints || 'None specified'}
Custom Needs: ${requirements.customNeeds || 'None specified'}

AI ANALYSIS
-----------
Recommended Tier: ${analysis.recommendedTier}
Est. Onboarding: $${analysis.onboardingCost.low} - $${analysis.onboardingCost.high}
LOE: ${analysis.loe.setupHours.low}-${analysis.loe.setupHours.high} hours setup
Onboarding Period: ${analysis.loe.onboardingWeeks} week(s)
Add-ons: ${analysis.addOns.join(', ') || 'None'}
Risks: ${analysis.risks.join('; ') || 'None identified'}
Suggestions: ${analysis.suggestions.join('; ') || 'None'}

---
XOM3 Cockpit | https://xom3.io
`;

  // Log email (will be sent via n8n workflow)
  console.log("[EMAIL] Notification to preston.chenault@xom3.io");
  console.log(emailBody);

  // If we have a direct email API, send it
  const emailApiUrl = process.env.EMAIL_API_URL;
  if (emailApiUrl) {
    try {
      await fetch(emailApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "preston.chenault@xom3.io",
          subject: `🏢 New Enterprise Proposal: ${contact.name} (${businesses[0]?.companyName || 'Enterprise'})`,
          body: emailBody,
        }),
      });
    } catch (err) {
      console.warn("[EMAIL] API send failed:", err);
    }
  }
}

