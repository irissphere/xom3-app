/**
 * Twilio Inbound SMS Webhook
 * 
 * Receives incoming SMS messages and responds with AI-powered assistance.
 * Designed for the operator to text about problems and get help.
 * 
 * POST /api/twilio/inbound
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Operator phone numbers that can use the AI assistant
const OPERATOR_PHONES = [
  process.env.OPERATOR_PHONE_NUMBER,
  // Add more authorized phones here
].filter(Boolean);

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// In-memory conversation store (consider Supabase for persistence)
const conversationStore = new Map<string, ConversationMessage[]>();

const SYSTEM_PROMPT = `You are an AI assistant for XOM3/SpaceBaddie systems. You help the operator troubleshoot issues, answer questions about the platform, and provide technical guidance.

Key systems you know about:
- SpaceBaddie: AI avatar video generation platform
- Video Studio: Creates AI-powered videos using SadTalker and LTX pipelines
- Store: E-commerce with Stripe checkout
- Social OAuth: YouTube, TikTok, Instagram connections
- Notifications: SMS (Twilio) and email alerts
- Database: Supabase (PostgreSQL)
- Hosting: Vercel
- Automation: n8n workflows

When helping:
1. Be concise - you're texting, keep responses under 300 chars when possible
2. Ask clarifying questions if needed
3. Provide actionable steps
4. If you need to check something, say so

Common issues:
- OAuth redirects: Check callback URLs in provider console
- Videos not saving: Check Supabase connection and render_history table
- Checkout failures: Verify Stripe keys are set
- SMS not sending: Check Twilio credentials`;

async function getAIResponse(
  userMessage: string,
  conversationHistory: ConversationMessage[]
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiKey) {
    return "AI not configured. Check OPENAI_API_KEY.";
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: 'user', content: userMessage }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[SMS AI] OpenAI error:', error);
      return "AI temporarily unavailable. Try again in a moment.";
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "No response generated.";
  } catch (error) {
    console.error('[SMS AI] Error:', error);
    return "Error processing request. Check logs.";
  }
}

async function sendSMSResponse(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[SMS AI] Twilio not configured');
    return false;
  }

  try {
    // Split long messages (SMS limit is 1600 chars, but 160 is one segment)
    const maxLength = 1500;
    const messageParts = [];
    let remaining = message;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        messageParts.push(remaining);
        break;
      }
      // Find a good break point
      let breakPoint = remaining.lastIndexOf('. ', maxLength);
      if (breakPoint === -1) breakPoint = remaining.lastIndexOf(' ', maxLength);
      if (breakPoint === -1) breakPoint = maxLength;
      
      messageParts.push(remaining.substring(0, breakPoint + 1));
      remaining = remaining.substring(breakPoint + 1).trim();
    }

    for (const part of messageParts) {
      const params = new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: part,
      });

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );
    }

    return true;
  } catch (error) {
    console.error('[SMS AI] Send error:', error);
    return false;
  }
}

async function logConversation(
  from: string,
  userMessage: string,
  aiResponse: string
) {
  try {
    const supabase = createClient();
    await supabase.from('sms_ai_conversations').insert({
      phone_number: from,
      user_message: userMessage,
      ai_response: aiResponse,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical, just log
    console.error('[SMS AI] Failed to log conversation:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form-urlencoded data
    const formData = await request.formData();
    
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    console.log(`[SMS AI] Received from ${from}: ${body?.substring(0, 50)}...`);

    if (!from || !body) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Normalize phone for comparison
    const normalizedFrom = from.replace(/\D/g, '').slice(-10);
    const isOperator = OPERATOR_PHONES.some(p => 
      p && p.replace(/\D/g, '').slice(-10) === normalizedFrom
    );

    // For now, allow any incoming message (you can restrict later)
    // if (!isOperator) {
    //   return twimlResponse("This number is for operator use only.");
    // }

    // Get or create conversation history
    const conversationKey = from;
    let history = conversationStore.get(conversationKey) || [];

    // Special commands
    const lowerBody = body.toLowerCase().trim();
    
    if (lowerBody === 'clear' || lowerBody === 'reset' || lowerBody === 'new') {
      conversationStore.delete(conversationKey);
      return twimlResponse("Conversation cleared. What can I help with?");
    }

    if (lowerBody === 'help' || lowerBody === '?') {
      return twimlResponse(
        "XOM3 AI Assistant\n\n" +
        "Just text your question or problem!\n\n" +
        "Commands:\n" +
        "- CLEAR: Start fresh\n" +
        "- STATUS: System check\n" +
        "- HELP: This message"
      );
    }

    if (lowerBody === 'status') {
      const status = [
        "System Status:",
        `- Twilio: OK`,
        `- OpenAI: ${process.env.OPENAI_API_KEY ? 'OK' : 'Missing'}`,
        `- Supabase: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'Missing'}`,
      ].join('\n');
      return twimlResponse(status);
    }

    // Get AI response
    const aiResponse = await getAIResponse(body, history);

    // Update conversation history
    history.push({ role: 'user', content: body });
    history.push({ role: 'assistant', content: aiResponse });
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history = history.slice(-20);
    }
    conversationStore.set(conversationKey, history);

    // Log to database (async, don't wait)
    logConversation(from, body, aiResponse).catch(() => {});

    // Return TwiML response
    return twimlResponse(aiResponse);

  } catch (error) {
    console.error('[SMS AI] Webhook error:', error);
    return twimlResponse("Sorry, something went wrong. Try again.");
  }
}

function twimlResponse(message: string): NextResponse {
  // Escape XML special characters
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escaped}</Message>
</Response>`;

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  });
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'twilio-inbound-ai',
    version: '1.0',
    configured: {
      twilio: !!process.env.TWILIO_ACCOUNT_SID,
      openai: !!process.env.OPENAI_API_KEY,
    },
    commands: ['help', 'status', 'clear', 'reset'],
  });
}
