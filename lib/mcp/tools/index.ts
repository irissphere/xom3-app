/**
 * MCP Tools Index
 * 
 * Central export for all MCP tools available to Retell AI agents.
 */

export { lookupLead } from "./lookup-lead";
export { updateStatus } from "./update-status";
export { bookAppointment, checkAvailability } from "./appointment";
export { sendConfirmationSMS } from "./sms-confirm";
export { transferToHuman } from "./transfer";

// Tool definitions for MCP server info
import { MCPToolDefinition } from "../types";

export const TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "lookup_lead",
    description: "Look up a lead's information by their phone number. Returns name, status, appointment history, and other details.",
    parameters: [
      {
        name: "phone_number",
        type: "string",
        description: "The phone number to look up (any format accepted)",
        required: true,
      },
    ],
    response_variables: [
      { name: "lead_found", type: "boolean", description: "Whether the lead was found", json_path: "$.found" },
      { name: "first_name", type: "string", description: "Lead's first name", json_path: "$.first_name" },
      { name: "last_name", type: "string", description: "Lead's last name", json_path: "$.last_name" },
      { name: "lead_status", type: "string", description: "Current lead status", json_path: "$.status" },
      { name: "has_appointment", type: "boolean", description: "Whether lead has an appointment", json_path: "$.has_appointment" },
    ],
  },
  {
    name: "update_status",
    description: "Update a lead's status (e.g., Interested, Callback, Not Interested, Qualified). Use after qualifying conversation.",
    parameters: [
      {
        name: "phone_number",
        type: "string",
        description: "The lead's phone number",
        required: true,
      },
      {
        name: "new_status",
        type: "string",
        description: "The new status to set",
        required: true,
        enum: ["New Lead", "Contacted", "Interested", "Not Interested", "Callback", "Appointment Scheduled", "Qualified", "Dead Lead"],
      },
      {
        name: "notes",
        type: "string",
        description: "Optional notes about the status change",
        required: false,
      },
      {
        name: "qualified",
        type: "boolean",
        description: "Whether the lead is qualified",
        required: false,
      },
    ],
    response_variables: [
      { name: "status_updated", type: "boolean", description: "Whether status was updated", json_path: "$.updated" },
      { name: "previous_status", type: "string", description: "The previous status", json_path: "$.previous_status" },
    ],
  },
  {
    name: "check_availability",
    description: "Check available appointment slots for the next few days. Call this before booking an appointment.",
    parameters: [
      {
        name: "days_ahead",
        type: "number",
        description: "How many days ahead to check (default: 3)",
        required: false,
      },
    ],
    response_variables: [
      { name: "next_available", type: "string", description: "Next available slot", json_path: "$.next_available" },
      { name: "slots_count", type: "number", description: "Number of available slots", json_path: "$.available_slots.length" },
    ],
  },
  {
    name: "book_appointment",
    description: "Book an appointment for the lead. Will also send a confirmation SMS.",
    parameters: [
      {
        name: "phone_number",
        type: "string",
        description: "The lead's phone number",
        required: true,
      },
      {
        name: "preferred_date",
        type: "string",
        description: "Preferred date (YYYY-MM-DD format or natural language like 'tomorrow', 'next Monday')",
        required: true,
      },
      {
        name: "preferred_time",
        type: "string",
        description: "Preferred time (e.g., '2pm', '14:00', 'morning', 'afternoon')",
        required: true,
      },
      {
        name: "notes",
        type: "string",
        description: "Notes about the appointment",
        required: false,
      },
    ],
    response_variables: [
      { name: "appointment_booked", type: "boolean", description: "Whether appointment was booked", json_path: "$.booked" },
      { name: "appointment_date", type: "string", description: "Confirmed appointment date", json_path: "$.appointment_date" },
      { name: "appointment_time", type: "string", description: "Confirmed appointment time", json_path: "$.appointment_time" },
    ],
  },
  {
    name: "send_confirmation_sms",
    description: "Send a confirmation SMS to the lead (appointment confirmation, callback confirmation, etc.)",
    parameters: [
      {
        name: "phone_number",
        type: "string",
        description: "The phone number to send SMS to",
        required: true,
      },
      {
        name: "message_type",
        type: "string",
        description: "Type of confirmation message",
        required: true,
        enum: ["appointment_confirmation", "callback_confirmation", "custom"],
      },
      {
        name: "custom_message",
        type: "string",
        description: "Custom message content (required if message_type is 'custom')",
        required: false,
      },
    ],
    response_variables: [
      { name: "sms_sent", type: "boolean", description: "Whether SMS was sent", json_path: "$.sent" },
    ],
  },
  {
    name: "transfer_to_human",
    description: "Transfer the call to a human agent. Use when lead is qualified and ready to speak with an agent, or when they request to speak with someone.",
    parameters: [
      {
        name: "reason",
        type: "string",
        description: "Reason for transfer (e.g., 'qualified lead', 'complex question', 'customer request')",
        required: true,
      },
      {
        name: "agent_name",
        type: "string",
        description: "Specific agent to transfer to (optional)",
        required: false,
      },
      {
        name: "priority",
        type: "string",
        description: "Transfer priority level",
        required: false,
        enum: ["normal", "high", "urgent"],
      },
      {
        name: "transfer_notes",
        type: "string",
        description: "Notes for the receiving agent about the call",
        required: false,
      },
    ],
    response_variables: [
      { name: "transfer_initiated", type: "boolean", description: "Whether transfer was initiated", json_path: "$.transfer_initiated" },
      { name: "transfer_to", type: "string", description: "Number being transferred to", json_path: "$.transfer_to" },
    ],
  },
];




































