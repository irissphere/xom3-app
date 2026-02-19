import { NextResponse } from "next/server";
import { getBase } from "@/lib/airtable/client";

// Table name
const TABLE_LEADS = "Leads";

// Mapping for standard fields
function mapIncomingToOpus1(data: Record<string, unknown>): Record<string, string | number> {
  const name = typeof data.name === "string" ? data.name : "";
  const nameParts = name.split(" ");
  
  const firstName = String(data.firstName || data.first_name || nameParts[0] || "").trim();
  const lastName = String(data.lastName || data.last_name || nameParts.slice(1).join(" ") || "").trim();
  const email = String(data.email || "").trim();
  const phone = String(data.phone || "").trim();
  const source = String(data.source || "Webhook").trim();
  const state = String(data.state || "").trim();
  const zip = String(data.zip || data.postal_code || "").trim();
  const notes = String(data.notes || JSON.stringify(data, null, 2));

  const fields: Record<string, string | number> = {
    "Status": "New Lead",
    "Date_Received": new Date().toISOString(),
  };

  if (firstName) fields["First_Name"] = firstName;
  if (lastName) fields["Last_Name"] = lastName;
  if (email) fields["Email"] = email;
  if (phone) fields["Phone"] = phone;
  if (source) fields["Lead_Source"] = source;
  if (state) fields["State"] = state;
  if (zip) fields["ZIP"] = zip;
  if (notes) fields["Notes"] = notes;

  return fields;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const base = await getBase();
    
    // Normalize payload
    const fields = mapIncomingToOpus1(body);

    if (!fields.Email && !fields.Phone) {
      return NextResponse.json({ ok: false, error: "Missing email or phone" }, { status: 400 });
    }

    // Insert into Opus 1 (base is already connected to the correct base ID)
    const records = await base(TABLE_LEADS).create([
      { fields }
    ]);

    return NextResponse.json({ 
      ok: true, 
      id: records[0].id, 
      message: "Lead injected into Opus 1" 
    });

  } catch (error) {
    console.error("Webhook intake error:", error);
    return NextResponse.json({ ok: false, error: "Intake failed" }, { status: 500 });
  }
}
