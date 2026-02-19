import { NextResponse } from 'next/server';
import { addLead, logEvent } from '@/lib/uoi/store';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { triggerCustomBuild } from "@/lib/n8n/trigger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Capture as High Priority
    const lead = addLead({
      ...body,
      type: 'custom_build',
      stage: 'Custom Build Inquiry',
      priority: 'high'
    });

    // 2. Log to Timeline (High Priority)
    logEvent({
      type: 'insight', // High value event
      source: 'operator',
      description: `🔥 CUSTOM BUILD REQUEST: ${body.businessName}`,
      metadata: { leadId: lead.id, priority: 'high' }
    });
    
    // 3. Send Slack Alert
    await sendSlackNotification(
      `*New Custom Build Request*\nClient: ${body.businessName}\nName: ${body.name}\nRequirement: ${body.requirements}`, 
      'alert'
    );

    // 4. n8n workflow trigger (email notification + Airtable)
    try {
      triggerCustomBuild({
        name: body.name || "",
        email: body.email || "",
        businessName: body.businessName || "",
        requirements: body.requirements || "",
      }).catch(err => console.warn("[CUSTOM_BUILD] n8n trigger failed:", err));
    } catch {
      // passive lane; ignore
    }
    
    console.log('[CUSTOM_BUILD] Processed:', lead.id);

    // 5. Return success
    return NextResponse.json({ 
      success: true, 
      message: "Custom build request logged. Architect notified.",
      id: lead.id
    });
  } catch (error) {
    console.error('[CUSTOM_BUILD] Error:', error);
    return NextResponse.json(
      { success: false, message: "Request processing failed" },
      { status: 500 }
    );
  }
}
