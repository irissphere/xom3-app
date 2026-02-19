import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_BASE_URL || "http://31.220.108.45:5678";
const SUPPORT_EMAIL = "preston.chenault@xom3.io";
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "+1XXXXXXXXXX"; // Your phone for SMS alerts

interface EscalationRequest {
  name: string;
  email: string;
  issue: string;
  chatHistory?: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body: EscalationRequest = await req.json();

    if (!body.name || !body.email || !body.issue) {
      return NextResponse.json(
        { error: "Name, email, and issue are required" },
        { status: 400 }
      );
    }

    // Format chat history
    const chatHistoryFormatted = body.chatHistory
      ?.map((m) => `[${m.role.toUpperCase()}] ${m.content}`)
      .join("\n\n") || "No chat history";

    const escalationPayload = {
      // Contact info
      name: body.name,
      email: body.email,
      issue: body.issue,
      chatHistory: chatHistoryFormatted,
      
      // Email details for n8n to send
      toEmail: SUPPORT_EMAIL,
      subject: `[XOM3 Support] ${body.name} - ${body.issue.slice(0, 50)}${body.issue.length > 50 ? '...' : ''}`,
      
      // Metadata
      timestamp: new Date().toISOString(),
      source: "xom3-support-chat",
    };

    // 1. Send to n8n webhook (handles email + notifications)
    try {
      const n8nRes = await fetch(`${N8N_WEBHOOK_URL}/webhook/xom3/support/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(escalationPayload),
      });
      
      if (!n8nRes.ok) {
        console.error("n8n webhook returned:", n8nRes.status);
      }
    } catch (webhookError) {
      console.error("n8n webhook error:", webhookError);
    }

    // 2. Store in Airtable for tracking
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      try {
        await fetch(
          `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Support%20Tickets`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
            },
            body: JSON.stringify({
              records: [
                {
                  fields: {
                    Name: body.name,
                    Email: body.email,
                    Issue: body.issue,
                    "Chat History": chatHistoryFormatted,
                    Status: "New",
                    Source: "Chat Widget",
                    "Created At": new Date().toISOString(),
                  },
                },
              ],
            }),
          }
        );
      } catch (airtableError) {
        console.error("Airtable error:", airtableError);
      }
    }

    // 3. Send SMS notification via Twilio (optional)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioAuth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${twilioAuth}`,
            },
            body: new URLSearchParams({
              From: process.env.TWILIO_PHONE_NUMBER,
              To: SUPPORT_PHONE,
              Body: `🎫 XOM3 Support Ticket\n\nFrom: ${body.name}\nEmail: ${body.email}\n\n${body.issue.slice(0, 100)}${body.issue.length > 100 ? '...' : ''}`,
            }),
          }
        );
      } catch (smsError) {
        console.error("Twilio SMS error:", smsError);
      }
    }

    // Log for debugging
    console.log("=== SUPPORT ESCALATION ===");
    console.log(`To: ${SUPPORT_EMAIL}`);
    console.log(`From: ${body.name} <${body.email}>`);
    console.log(`Issue: ${body.issue}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("==========================");

    return NextResponse.json({ 
      success: true, 
      message: "Escalation received. We'll respond within 24 hours." 
    });
  } catch (error) {
    console.error("Escalation error:", error);
    return NextResponse.json(
      { error: "Failed to process escalation" },
      { status: 500 }
    );
  }
}

