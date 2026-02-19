/**
 * Status Update Tool
 * 
 * Updates a lead's status in Airtable.
 */

import Airtable from "airtable";
import {
  StatusUpdateParams,
  StatusUpdateResult,
  ClientConfig,
  MCPToolResponse,
} from "../types";
import { getClientConfig, getFieldMapping } from "../clients";
import { lookupLead } from "./lookup-lead";

export async function updateStatus(
  params: StatusUpdateParams,
  clientConfig?: ClientConfig
): Promise<MCPToolResponse> {
  try {
    const config = clientConfig || getClientConfig("opus1");
    if (!config) {
      return {
        success: false,
        error: "Client configuration not found",
      };
    }

    const fields = getFieldMapping(config.client_id);

    // Get lead ID if not provided
    let leadId = params.lead_id;
    let previousStatus = "";

    if (!leadId && params.phone_number) {
      const lookupResult = await lookupLead(
        { phone_number: params.phone_number },
        config
      );
      if (!lookupResult.success || !lookupResult.data?.found) {
        return {
          success: false,
          error: "Lead not found with provided phone number",
        };
      }
      leadId = lookupResult.data.lead_id;
      previousStatus = lookupResult.data.status || "";
    }

    if (!leadId) {
      return {
        success: false,
        error: "Either lead_id or phone_number must be provided",
      };
    }

    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      config.airtable_base_id
    );

    // Build update payload
    const updateFields: Record<string, any> = {
      [fields.status]: params.new_status,
      [fields.last_contact]: new Date().toISOString().split("T")[0],
    };

    // Add notes if provided
    if (params.notes) {
      // Get existing notes and append
      const existingRecord = await base(config.leads_table_id).find(leadId);
      const existingNotes = existingRecord.fields[fields.notes] || "";
      const timestamp = new Date().toLocaleString();
      updateFields[fields.notes] = `${existingNotes}\n[${timestamp}] AI: ${params.notes}`.trim();
    }

    // Set qualified flag if provided
    if (params.qualified !== undefined) {
      updateFields[fields.qualified] = params.qualified;
    }

    // Add tags if provided
    if (params.tags_to_add && params.tags_to_add.length > 0) {
      const existingRecord = await base(config.leads_table_id).find(leadId);
      const existingTags = (existingRecord.fields[fields.tags] as string[]) || [];
      const newTags = Array.from(new Set([...existingTags, ...params.tags_to_add]));
      updateFields[fields.tags] = newTags;
    }

    // Update the record
    await base(config.leads_table_id).update(leadId, updateFields);

    const result: StatusUpdateResult = {
      updated: true,
      lead_id: leadId,
      previous_status: previousStatus,
      new_status: params.new_status,
    };

    return {
      success: true,
      data: result,
      variables: {
        status_updated: true,
        previous_status: previousStatus,
        new_status: params.new_status,
      },
    };
  } catch (error: any) {
    console.error("[MCP] Status update error:", error);
    return {
      success: false,
      error: error.message || "Failed to update status",
    };
  }
}









