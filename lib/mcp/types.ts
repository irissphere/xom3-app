/**
 * MCP (Model Context Protocol) Types for Retell AI Integration
 * 
 * This module defines the types for MCP tool calls from Retell AI agents.
 * Designed for multi-tenant support (different clients/bases).
 */

// ============================================================
// MCP Protocol Types
// ============================================================

export interface MCPToolCall {
  tool_name: string;
  arguments: Record<string, any>;
  call_id?: string;
}

export interface MCPToolResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  variables?: Record<string, any>; // Response variables for Retell to use
}

export interface MCPServerInfo {
  name: string;
  version: string;
  tools: MCPToolDefinition[];
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: MCPParameter[];
  response_variables?: MCPResponseVariable[];
}

export interface MCPParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
  enum?: string[];
}

export interface MCPResponseVariable {
  name: string;
  type: "string" | "number" | "boolean";
  description: string;
  json_path: string;
}

// ============================================================
// Client Configuration (Multi-Tenant)
// ============================================================

export interface ClientConfig {
  client_id: string;
  client_name: string;
  airtable_base_id: string;
  leads_table_id: string;
  calendar_integration?: {
    type: "google" | "calendly" | "cal.com";
    calendar_id?: string;
    api_key?: string;
  };
  sms_config?: {
    provider: "openphone" | "twilio";
    from_number: string;
  };
  transfer_config?: {
    default_number: string;
    agents: TransferAgent[];
  };
  timezone: string;
  business_hours: {
    start: number; // Hour in 24h format
    end: number;
  };
}

export interface TransferAgent {
  name: string;
  phone: string;
  specialties?: string[];
  available_hours?: {
    start: number;
    end: number;
  };
}

// ============================================================
// Tool-Specific Types
// ============================================================

// Lead Lookup
export interface LeadLookupParams {
  phone_number: string;
  client_id?: string;
}

export interface LeadLookupResult {
  found: boolean;
  lead_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  status?: string;
  dob?: string;
  age?: number;
  state?: string;
  zip?: string;
  last_contact?: string;
  notes?: string;
  coverage_type?: string;
  has_appointment?: boolean;
  appointment_date?: string;
  tags?: string[];
}

// Status Update
export interface StatusUpdateParams {
  phone_number?: string;
  lead_id?: string;
  new_status: string;
  notes?: string;
  tags_to_add?: string[];
  qualified?: boolean;
}

export interface StatusUpdateResult {
  updated: boolean;
  lead_id: string;
  previous_status: string;
  new_status: string;
}

// Appointment Booking
export interface AppointmentBookParams {
  phone_number?: string;
  lead_id?: string;
  preferred_date?: string;
  preferred_time?: string;
  appointment_type?: "phone" | "video" | "in_person";
  notes?: string;
}

export interface AppointmentBookResult {
  booked: boolean;
  appointment_id?: string;
  appointment_date?: string;
  appointment_time?: string;
  confirmation_sent?: boolean;
  error?: string;
}

export interface AvailabilityCheckParams {
  date?: string; // ISO date string
  days_ahead?: number; // How many days to check
}

export interface AvailabilityCheckResult {
  available_slots: AvailableSlot[];
  next_available?: string;
}

export interface AvailableSlot {
  date: string;
  time: string;
  datetime_iso: string;
}

// SMS Confirmation
export interface SMSConfirmParams {
  phone_number: string;
  message_type: "appointment_confirmation" | "callback_confirmation" | "custom";
  custom_message?: string;
  appointment_date?: string;
  appointment_time?: string;
}

export interface SMSConfirmResult {
  sent: boolean;
  message_id?: string;
  error?: string;
}

// Transfer to Human
export interface TransferParams {
  reason: string;
  lead_id?: string;
  phone_number?: string;
  agent_name?: string;
  transfer_notes?: string;
  priority?: "normal" | "high" | "urgent";
}

export interface TransferResult {
  transfer_initiated: boolean;
  transfer_to: string;
  agent_name?: string;
  error?: string;
}

// ============================================================
// Retell-Specific Types
// ============================================================

export interface RetellCallContext {
  call_id: string;
  from_number: string;
  to_number: string;
  agent_id: string;
  call_status: string;
  metadata?: Record<string, any>;
}




































