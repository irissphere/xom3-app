/**
 * Email Subscribe API
 * POST /api/shop/subscribe
 * 
 * Captures email from shop popup, footer, etc.
 * Sends welcome email and stores subscriber in Supabase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/client';
import { welcomeEmail } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source = 'shop_popup', tags = [], metadata = {} } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'Valid email required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Upsert subscriber (don't error if already exists)
    const { data, error } = await supabase
      .from('email_subscribers')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          name: name || null,
          source,
          status: 'active',
          tags,
          metadata,
          subscribed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('[Subscribe] DB error:', error);
      // If the table doesn't exist yet, still try to send the welcome email
      if (!error.message.includes('does not exist')) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    // Send welcome email
    const storeUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spacebaddie.com';
    const welcome = welcomeEmail({
      customerName: name || undefined,
      email,
      storeUrl,
    });

    const sent = await sendEmail({
      to: email,
      subject: welcome.subject,
      html: welcome.html,
    });

    return NextResponse.json({
      ok: true,
      subscriber: data?.id || null,
      welcome_sent: sent,
      message: 'Subscribed successfully',
    });
  } catch (error: any) {
    console.error('[Subscribe] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
