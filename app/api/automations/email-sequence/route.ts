import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY);

interface LeadData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business?: string;
  goal?: string;
  created_at: string;
}

interface EmailSequenceRequest {
  leadId: string;
  sequenceType: 'welcome' | 'nurture' | 'reengagement';
  step: number;
}

const EMAIL_SEQUENCES = {
  welcome: {
    1: {
      subject: 'Welcome to XOM3 - Your Automation Journey Starts Now',
      delay: 0, // immediate
      template: (lead: LeadData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to XOM3, ${lead.name}!</h1>
          <p>Thank you for your interest in automating your business at ${lead.business || 'your company'}.</p>
          <p>I'm excited to help you achieve your ${lead.goal || 'automation'} goals with our comprehensive platform.</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>What happens next?</h3>
            <ul>
              <li>📧 You'll receive a personalized platform overview</li>
              <li>🎯 We'll identify your specific automation opportunities</li>
              <li>🚀 You'll get access to our 30-day free trial</li>
            </ul>
          </div>

          <p>Questions? Reply to this email or call us at (469) 400-2526.</p>

          <p>Best regards,<br>
          Preston Chenault<br>
          XOM3 Platform Lead<br>
          <a href="mailto:preston.chenault@xom3.io">preston.chenault@xom3.io</a></p>
        </div>
      `
    },
    2: {
      subject: 'XOM3 Platform Overview - Tailored for Your Business',
      delay: 2 * 60 * 60 * 1000, // 2 hours
      template: (lead: LeadData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>XOM3 Platform Overview</h2>
          <p>Hi ${lead.name},</p>
          <p>Based on your interest in ${lead.goal || 'business automation'}, here are the key features that will help ${lead.business || 'your business'}:</p>

          <div style="display: flex; gap: 20px; margin: 20px 0;">
            <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
              <h3>⚡ Lead Engine</h3>
              <p>Automated lead generation and qualification</p>
            </div>
            <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
              <h3>📱 Auto Follow-ups</h3>
              <p>Instant SMS and email sequences</p>
            </div>
            <div style="flex: 1; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
              <h3>📡 Social Broadcast</h3>
              <p>Automated content posting across platforms</p>
            </div>
          </div>

          <p><strong>Ready to see it in action?</strong></p>
          <a href="https://xom3.io/demo" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Book Your Demo</a>

          <p>Best,<br>Preston</p>
        </div>
      `
    },
    3: {
      subject: 'Real Results: How XOM3 Saved Our Clients 20+ Hours/Week',
      delay: 4 * 60 * 60 * 1000, // 4 hours
      template: (lead: LeadData) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Real XOM3 Success Stories</h2>
          <p>Hi ${lead.name},</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>📈 Client Success: Marketing Agency</h3>
            <p>"XOM3 automated our lead follow-ups and social posting. We went from 40 hours/week of manual work to just 8 hours. ROI was immediate."</p>
            <p><em>- Sarah M., Marketing Director</em></p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>💼 Client Success: Consulting Firm</h3>
            <p>"The lead engine finds us qualified prospects 24/7. Our sales team focuses only on closing deals instead of prospecting."</p>
            <p><em>- Mike R., Business Consultant</em></p>
          </div>

          <p>Would you like to speak with one of our successful clients?</p>
          <a href="https://xom3.io/testimonials" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View All Testimonials</a>

          <p>Best,<br>Preston</p>
        </div>
      `
    }
  }
};

export async function POST(request: NextRequest) {
  try {
    const { leadId, sequenceType, step }: EmailSequenceRequest = await request.json();

    if (!leadId || !sequenceType || !step) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, sequenceType, step' },
        { status: 400 }
      );
    }

    // Get lead data from Supabase
    const supabase = await createClient();
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

    const sequence = EMAIL_SEQUENCES[sequenceType];
    if (!sequence || !sequence[step]) {
      return NextResponse.json(
        { error: 'Invalid sequence type or step' },
        { status: 400 }
      );
    }

    const emailConfig = sequence[step];
    const emailContent = emailConfig.template(lead as LeadData);

    // Send email via Resend
    /*
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Preston Chenault <preston.chenault@xom3.io>',
      to: lead.email,
      subject: emailConfig.subject,
      html: emailContent,
    });

    if (emailError) {
      console.error('Email send error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }
    */
    
    // Mock email sending for now
    console.log(`[MOCK EMAIL] Sending to ${lead.email}: ${emailConfig.subject}`);
    const emailResult = { id: 'mock_email_id' };
    const emailError = null;

    // Update lead status in database
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        email_sequence_stage: `${sequenceType}_step_${step}`,
        last_email_sent: new Date().toISOString(),
        email_sequence_step: step,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    // Log the email send
    await supabase
      .from('email_logs')
      .insert({
        lead_id: leadId,
        sequence_type: sequenceType,
        step: step,
        email_subject: emailConfig.subject,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

    return NextResponse.json({
      success: true,
      emailId: emailResult?.id,
      sequence: sequenceType,
      step: step,
      nextStepDelay: sequence[step + 1]?.delay || null
    });

  } catch (error) {
    console.error('Email sequence error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


