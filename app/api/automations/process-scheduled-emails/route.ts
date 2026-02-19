import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get emails that are due to be sent (within the last 5 minutes to account for cron timing)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const { data: scheduledEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select(`
        *,
        leads (
          id,
          name,
          email,
          business,
          goal
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .gte('scheduled_for', fiveMinutesAgo);

    if (fetchError) {
      console.error('Error fetching scheduled emails:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled emails' },
        { status: 500 }
      );
    }

    const results = [];

    for (const scheduledEmail of scheduledEmails || []) {
      try {
        // Send the email via the email sequence API
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://xom3.io'}/api/automations/email-sequence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leadId: scheduledEmail.lead_id,
            sequenceType: scheduledEmail.sequence_type,
            step: scheduledEmail.step
          })
        });

        if (emailResponse.ok) {
          // Mark as sent
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', scheduledEmail.id);

          results.push({
            id: scheduledEmail.id,
            status: 'sent',
            leadId: scheduledEmail.lead_id,
            sequence: scheduledEmail.sequence_type,
            step: scheduledEmail.step
          });
        } else {
          console.error(`Failed to send email for scheduled item ${scheduledEmail.id}:`, await emailResponse.text());

          // Mark as failed
          await supabase
            .from('scheduled_emails')
            .update({
              status: 'failed',
              error_message: 'Email API call failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', scheduledEmail.id);

          results.push({
            id: scheduledEmail.id,
            status: 'failed',
            leadId: scheduledEmail.lead_id,
            error: 'Email API failed'
          });
        }
      } catch (error) {
        console.error(`Error processing scheduled email ${scheduledEmail.id}:`, error);

        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduledEmail.id);

        results.push({
          id: scheduledEmail.id,
          status: 'failed',
          leadId: scheduledEmail.lead_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Log the processing run
    await supabase
      .from('automation_logs')
      .insert({
        action: 'scheduled_emails_processed',
        details: {
          emailsProcessed: results.length,
          sent: results.filter(r => r.status === 'sent').length,
          failed: results.filter(r => r.status === 'failed').length,
          results
        },
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    console.error('Scheduled email processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This endpoint can be called by a cron job every 5 minutes
// Example cron: */5 * * * * curl -X POST https://xom3.io/api/automations/process-scheduled-emails


