/**
 * Lead Lookup Tool
 * 
 * Looks up lead information from Airtable by phone number.
 */

import Airtable from "airtable";
import {
  LeadLookupParams,
  LeadLookupResult,
  ClientConfig,
  MCPToolResponse,
} from "../types";
import { getClientConfig, getFieldMapping } from "../clients";

// Normalize phone number to E.164 format
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return phone;
}

// Also create search variants
function getPhoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  
  return [
    phone,
    `+1${last10}`,
    last10,
    `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`,
    `${last10.slice(0, 3)}-${last10.slice(3, 6)}-${last10.slice(6)}`,
    `${last10.slice(0, 3)}.${last10.slice(3, 6)}.${last10.slice(6)}`,
  ];
}

export async function lookupLead(
  params: LeadLookupParams,
  clientConfig?: ClientConfig
): Promise<MCPToolResponse> {
  try {
    const config = clientConfig || getClientConfig(params.client_id || "opus1");
    if (!config) {
      return {
        success: false,
        error: "Client configuration not found",
      };
    }

    const fields = getFieldMapping(config.client_id);
    const phoneVariants = getPhoneVariants(params.phone_number);

    // Build filter formula to search for any phone variant
    const phoneFilters = phoneVariants
      .map((p) => `{${fields.phone}}='${p}'`)
      .join(", ");
    const filterFormula = `OR(${phoneFilters})`;

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      config.airtable_base_id
    );

    const records = await base(config.leads_table_id)
      .select({
        filterByFormula: filterFormula,
        maxRecords: 1,
      })
      .firstPage();

    if (records.length === 0) {
      return {
        success: true,
        data: { found: false },
        variables: {
          lead_found: false,
        },
      };
    }

    const record = records[0];
    const f = record.fields;

    // Calculate age from DOB
    let age: number | undefined;
    if (f[fields.dob]) {
      const dob = new Date(f[fields.dob] as string);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
    }

    // Check if has upcoming appointment
    let hasAppointment = false;
    let appointmentDate: string | undefined;
    if (f[fields.appointment_date]) {
      const apptDate = new Date(f[fields.appointment_date] as string);
      if (apptDate > new Date()) {
        hasAppointment = true;
        appointmentDate = apptDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
    }

    const result: LeadLookupResult = {
      found: true,
      lead_id: record.id,
      first_name: f[fields.first_name] as string,
      last_name: f[fields.last_name] as string,
      email: f[fields.email] as string,
      status: f[fields.status] as string,
      dob: f[fields.dob] as string,
      age,
      state: f[fields.state] as string,
      zip: f[fields.zip] as string,
      last_contact: f[fields.last_contact] as string,
      notes: f[fields.notes] as string,
      has_appointment: hasAppointment,
      appointment_date: appointmentDate,
      tags: f[fields.tags] as string[],
    };

    return {
      success: true,
      data: result,
      variables: {
        lead_found: true,
        first_name: result.first_name || "",
        last_name: result.last_name || "",
        lead_status: result.status || "Unknown",
        has_appointment: hasAppointment,
        appointment_date: appointmentDate || "",
        age: age?.toString() || "",
      },
    };
  } catch (error: any) {
    console.error("[MCP] Lead lookup error:", error);
    return {
      success: false,
      error: error.message || "Failed to lookup lead",
    };
  }
}









