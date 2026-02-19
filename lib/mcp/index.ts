/**
 * MCP (Model Context Protocol) Module
 * 
 * Provides tools for Retell AI voice agents to interact with:
 * - Airtable CRM (lead lookup, status updates)
 * - Calendar (availability check, appointment booking)
 * - SMS (confirmation messages)
 * - Call transfer (human handoff)
 * 
 * Multi-tenant support for different clients/bases.
 */

// Types
export * from "./types";

// Client configurations
export {
  CLIENTS,
  getClientConfig,
  getClientByAgentId,
  listClients,
  getFieldMapping,
  FIELD_MAPPINGS,
} from "./clients";

// Tool definitions
export { TOOL_DEFINITIONS } from "./tools";

// Individual tools
export { lookupLead } from "./tools/lookup-lead";
export { updateStatus } from "./tools/update-status";
export { bookAppointment, checkAvailability } from "./tools/appointment";
export { sendConfirmationSMS } from "./tools/sms-confirm";
export { transferToHuman } from "./tools/transfer";




































