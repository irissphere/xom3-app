import { NextRequest, NextResponse } from "next/server";
import Airtable from "airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opus 1 configuration
const OPUS1_BASE_ID = process.env.AIRTABLE_OPUS1_BASE_ID || "appCkU8L3sdmqaAmI";
const OPUS1_LEADS_TABLE = process.env.OPUS1_LEADS_TABLE || "Leads";

// Webhook auth (optional security layer)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

function getOpus1Base() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    throw new Error("AIRTABLE_API_KEY not configured");
  }
  return new Airtable({ apiKey }).base(OPUS1_BASE_ID);
}

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, "");
  if (digits.length < 10) return null;
  // Ensure US format with +1
  if (digits.startsWith("+1")) return digits;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function normalizeEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  const trimmed = String(email).trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

interface WebhookLeadPayload {
  // Common fields
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  source?: string;
  lead_source?: string;
  
  // VanillaSoft specific
  Lead_Source?: string;
  First_Name?: string;
  Last_Name?: string;
  Phone?: string;
  Email?: string;
  
  // Address fields
  state?: string;
  State?: string;
  zip?: string;
  ZIP?: string;
  address?: string;
  Address?: string;
  
  // Meta
  campaign?: string;
  utm_source?: string;
  utm_campaign?: string;
  
  // Custom fields passthrough
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  // Optional: Verify webhook secret
  if (WEBHOOK_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = request.headers.get("x-webhook-secret") || 
                          authHeader?.replace("Bearer ", "");
    
    if (providedSecret !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
  }

  let body: WebhookLeadPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  // Normalize field names (handle various source formats)
  const firstName = body.first_name || body.firstName || body.First_Name || "";
  const lastName = body.last_name || body.lastName || body.Last_Name || "";
  const phone = normalizePhone(body.phone || body.Phone);
  const email = normalizeEmail(body.email || body.Email);
  const source = body.source || body.lead_source || body.Lead_Source || "Webhook";
  const state = body.state || body.State || "";
  const zip = body.zip || body.ZIP || "";
  const address = body.address || body.Address || "";

  // Require at least phone or email
  if (!phone && !email) {
    return NextResponse.json(
      { ok: false, error: "missing_contact", message: "Phone or email required" },
      { status: 400 }
    );
  }

  try {
    const base = getOpus1Base();
    
    // Check for duplicate by phone or email
    let existingRecord: { id: string; fields: Record<string, unknown> } | null = null;
    
    if (phone) {
      const phoneRecords = await base(OPUS1_LEADS_TABLE)
        .select({
          maxRecords: 1,
          filterByFormula: `{Phone} = "${phone}"`,
        })
        .all();
      if (phoneRecords.length > 0) {
        existingRecord = phoneRecords[0] as { id: string; fields: Record<string, unknown> };
      }
    }
    
    if (!existingRecord && email) {
      const emailRecords = await base(OPUS1_LEADS_TABLE)
        .select({
          maxRecords: 1,
          filterByFormula: `LOWER({Email}) = "${email}"`,
        })
        .all();
      if (emailRecords.length > 0) {
        existingRecord = emailRecords[0] as { id: string; fields: Record<string, unknown> };
      }
    }

    if (existingRecord) {
      // Update existing record
      const updated = await base(OPUS1_LEADS_TABLE).update(existingRecord.id, {
        "Last Modified": new Date().toISOString(),
        // Only update empty fields
        ...(firstName && !existingRecord.fields["First_Name"] ? { "First_Name": firstName } : {}),
        ...(lastName && !existingRecord.fields["Last_Name"] ? { "Last_Name": lastName } : {}),
        ...(email && !existingRecord.fields["Email"] ? { "Email": email } : {}),
        ...(state && !existingRecord.fields["State"] ? { "State": state } : {}),
        ...(zip && !existingRecord.fields["ZIP"] ? { "ZIP": zip } : {}),
      });

      return NextResponse.json({
        ok: true,
        action: "updated",
        recordId: updated.id,
        message: "Existing lead updated",
      });
    }

    // Create new lead
    const newRecord = await base(OPUS1_LEADS_TABLE).create({
      "First_Name": firstName,
      "Last_Name": lastName,
      "Phone": phone,
      "Email": email,
      "Lead_Source": source,
      "Status": "New Lead",
      "State": state,
      "ZIP": zip,
      "Address": address,
      "Date_Received": new Date().toISOString(),
      "Created": new Date().toISOString(),
      "Messages_Sent": 0,
      "Total_Call_Attempts": 0,
      "Response_Count": 0,
    });

    return NextResponse.json({
      ok: true,
      action: "created",
      recordId: newRecord.id,
      message: "New lead created",
    });

  } catch (error) {
    console.error("[Webhook/Lead] Error:", error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "airtable_error",
        message: error instanceof Error ? error.message : "Failed to process lead",
      },
      { status: 500 }
    );
  }
}

// GET for testing/health check
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "lead-webhook",
    methods: ["POST"],
    fields: {
      required: "phone OR email",
      optional: ["first_name", "last_name", "source", "state", "zip", "address", "campaign"],
    },
    auth: WEBHOOK_SECRET ? "secret_required" : "open",
  });
}



















