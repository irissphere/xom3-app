/**
 * MCP Client Configurations
 * 
 * Multi-tenant client configurations for Retell AI MCP tools.
 * Each client has their own Airtable base, SMS config, etc.
 */

import { ClientConfig } from "./types";

// ============================================================
// Client Configurations
// ============================================================

export const CLIENTS: Record<string, ClientConfig> = {
  // Opus1 Healthcare CRM (PulseVera/Charlette)
  "opus1": {
    client_id: "opus1",
    client_name: "Opus1 Healthcare",
    airtable_base_id: "appCkU8L3sdmqaAmI",
    leads_table_id: "tbl9mQDZJvL06ixo4",
    calendar_integration: {
      type: "google",
      calendar_id: process.env.OPUS1_GOOGLE_CALENDAR_ID,
    },
    sms_config: {
      provider: "openphone",
      from_number: process.env.OPUS1_OPENPHONE_NUMBER || "+1XXXXXXXXXX",
    },
    transfer_config: {
      default_number: process.env.OPUS1_TRANSFER_NUMBER || "+1XXXXXXXXXX",
      agents: [
        {
          name: "Preston",
          phone: process.env.OPUS1_PRESTON_PHONE || "+1XXXXXXXXXX",
          specialties: ["ACA", "Medicare", "Family Plans"],
        },
        {
          name: "Jay",
          phone: process.env.OPUS1_JAY_PHONE || "+1XXXXXXXXXX",
          specialties: ["Individual Plans", "Short-Term"],
        },
      ],
    },
    timezone: "America/Chicago",
    business_hours: {
      start: 8,
      end: 20,
    },
  },

  // XOM3 Commander (Kairos CRM)
  "xom3": {
    client_id: "xom3",
    client_name: "XOM3 Commander",
    airtable_base_id: "app4y7GKkeUfZm8rS",
    leads_table_id: "tblClients", // Assuming Clients table
    calendar_integration: {
      type: "cal.com",
    },
    sms_config: {
      provider: "openphone",
      from_number: process.env.XOM3_OPENPHONE_NUMBER || "+1XXXXXXXXXX",
    },
    transfer_config: {
      default_number: process.env.XOM3_TRANSFER_NUMBER || "+1XXXXXXXXXX",
      agents: [],
    },
    timezone: "America/Chicago",
    business_hours: {
      start: 9,
      end: 18,
    },
  },

  // Template for new clients
  "template": {
    client_id: "template",
    client_name: "Client Template",
    airtable_base_id: "appXXXXXXXXXXXXXX",
    leads_table_id: "tblXXXXXXXXXXXXXX",
    calendar_integration: {
      type: "google",
    },
    sms_config: {
      provider: "openphone",
      from_number: "+1XXXXXXXXXX",
    },
    transfer_config: {
      default_number: "+1XXXXXXXXXX",
      agents: [],
    },
    timezone: "America/Chicago",
    business_hours: {
      start: 9,
      end: 17,
    },
  },
};

// ============================================================
// Helper Functions
// ============================================================

export function getClientConfig(clientId: string): ClientConfig | null {
  return CLIENTS[clientId] || null;
}

export function getClientByAgentId(retellAgentId: string): ClientConfig | null {
  // Map Retell agent IDs to client configs
  const agentMapping: Record<string, string> = {
    "agent_c13e46201ac73f3f3b9097201f": "opus1", // Charlette - PulseVera Qualifier
    // Add more agent mappings here
  };

  const clientId = agentMapping[retellAgentId];
  return clientId ? CLIENTS[clientId] : null;
}

export function listClients(): ClientConfig[] {
  return Object.values(CLIENTS).filter(c => c.client_id !== "template");
}

// ============================================================
// Airtable Field Mappings per Client
// ============================================================

export interface FieldMapping {
  phone: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  dob: string;
  state: string;
  zip: string;
  notes: string;
  last_contact: string;
  appointment_date: string;
  callback_date: string;
  tags: string;
  qualified: string;
  opt_out: string;
}

export const FIELD_MAPPINGS: Record<string, FieldMapping> = {
  "opus1": {
    phone: "Phone",
    first_name: "First_Name",
    last_name: "Last_Name",
    email: "Email",
    status: "Status",
    dob: "DOB",
    state: "State",
    zip: "ZIP",
    notes: "Notes",
    last_contact: "Last_Contact",
    appointment_date: "Appointment_Date",
    callback_date: "Callback_Date",
    tags: "Tags",
    qualified: "Qualified",
    opt_out: "Opt_Out",
  },
  "xom3": {
    phone: "Phone",
    first_name: "First Name",
    last_name: "Last Name",
    email: "Email",
    status: "Status",
    dob: "Date of Birth",
    state: "State",
    zip: "ZIP",
    notes: "Notes",
    last_contact: "Last Contact",
    appointment_date: "Appointment Date",
    callback_date: "Callback Date",
    tags: "Tags",
    qualified: "Qualified",
    opt_out: "Opted Out",
  },
};

export function getFieldMapping(clientId: string): FieldMapping {
  return FIELD_MAPPINGS[clientId] || FIELD_MAPPINGS["opus1"];
}




































