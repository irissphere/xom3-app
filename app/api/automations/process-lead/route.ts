import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateLeadScore, getNextSequenceStep } from '@/lib/automations/lead-scoring';

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    // Calculate lead score
    const scoreResult = calculateLeadScore(lead);

    // Update lead with score and category
    await supabase
      .from('leads')
      .update({
        score: scoreResult.total,
        category: scoreResult.category,
        recommended_action: scoreResult.recommendedAction,
        score_breakdown: scoreResult.breakdown,
        pipeline_stage: 'qualified',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    // Start welcome email sequence immediately
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://xom3.io'}/api/automations/email-sequence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: leadId,
        sequenceType: 'welcome',
        step: 1
      })
    });

    if (!emailResponse.ok) {
      console.error('Failed to start email sequence');
    }

    // Create automated tasks based on lead category
    if (scoreResult.category === 'hot') {
      // Create urgent task for immediate follow-up
      await supabase
        .from('tasks')
        .insert({
          lead_id: leadId,
          type: 'call',
          priority: 'urgent',
          title: `Call hot lead: ${lead.name} (${lead.business || 'Business'})`,
          description: `High-priority lead (${scoreResult.total}/100). ${scoreResult.recommendedAction}`,
          due_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          status: 'pending',
          assigned_to: 'sales_team',
          created_at: new Date().toISOString()
        });
    } else if (scoreResult.category === 'warm') {
      // Schedule demo booking task
      await supabase
        .from('tasks')
        .insert({
          lead_id: leadId,
          type: 'demo',
          priority: 'high',
          title: `Schedule demo for ${lead.name}`,
          description: `Warm lead (${scoreResult.total}/100). ${scoreResult.recommendedAction}`,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          status: 'pending',
          assigned_to: 'sales_team',
          created_at: new Date().toISOString()
        });
    }

    // Schedule next email sequence steps
    const nextStep2 = getNextSequenceStep(1, 'welcome');
    if (nextStep2.nextStep) {
      await supabase
        .from('scheduled_emails')
        .insert({
          lead_id: leadId,
          sequence_type: 'welcome',
          step: nextStep2.nextStep,
          scheduled_for: new Date(Date.now() + nextStep2.delay).toISOString(),
          status: 'scheduled',
          created_at: new Date().toISOString()
        });
    }

    const nextStep3 = getNextSequenceStep(2, 'welcome');
    if (nextStep3.nextStep) {
      await supabase
        .from('scheduled_emails')
        .insert({
          lead_id: leadId,
          sequence_type: 'welcome',
          step: nextStep3.nextStep,
          scheduled_for: new Date(Date.now() + (nextStep2.delay + nextStep3.delay)).toISOString(),
          status: 'scheduled',
          created_at: new Date().toISOString()
        });
    }

    // Log the automation execution
    await supabase
      .from('automation_logs')
      .insert({
        lead_id: leadId,
        action: 'lead_processed',
        details: {
          score: scoreResult.total,
          category: scoreResult.category,
          sequence_started: true,
          tasks_created: scoreResult.category === 'hot' || scoreResult.category === 'warm'
        },
        created_at: new Date().toISOString()
      });

    // Send Slack notification with processing results
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🤖 Lead Processed: ${lead.name} (${lead.business || 'Business'})`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🤖 Lead Auto-Processed: ${lead.name}`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Business:* ${lead.business || 'Not provided'}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Goal:* ${lead.goal || 'Not specified'}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Score:* ${scoreResult.total}/100 (${scoreResult.category.toUpperCase()})`
                },
                {
                  type: 'mrkdwn',
                  text: `*Action:* ${scoreResult.recommendedAction}`
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ Welcome email sent\n✅ Lead scored and categorized\n✅ Tasks created automatically\n✅ Follow-up sequence scheduled'
              }
            }
          ]
        })
      });
    } catch (slackError) {
      console.error('Slack notification failed:', slackError);
    }

    return NextResponse.json({
      success: true,
      leadId: leadId,
      score: scoreResult.total,
      category: scoreResult.category,
      action: scoreResult.recommendedAction,
      emailSequenceStarted: true,
      tasksCreated: scoreResult.category === 'hot' || scoreResult.category === 'warm'
    });

  } catch (error) {
    console.error('Lead processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process lead' },
      { status: 500 }
    );
  }
}


