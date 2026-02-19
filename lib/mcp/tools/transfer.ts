/**
 * Transfer to Human Tool
 * 
 * Initiates a call transfer to a human agent.
 * Returns the transfer number for Retell to use.
 */

import Airtable from "airtable";
import {
  TransferParams,
  TransferResult,
  ClientConfig,
  MCPToolResponse,
} from "../types";
import { getClientConfig, getFieldMapping } from "../clients";
import { TransferAgent } from "../types";
import { lookupLead } from "./lookup-lead";

// Check if an agent is currently available based on hours
function isAgentAvailable(agent: TransferAgent): boolean {
  if (!agent.available_hours) {
    return true; // No hours restriction
  }
  
  const now = new Date();
  const currentHour = now.getHours();
  
  return currentHour >= agent.available_hours.start && currentHour < agent.available_hours.end;
}

// Find the best agent for the transfer
function findBestAgent(
  agents: TransferAgent[],
  requestedName?: string,
  specialties?: string[]
): TransferAgent | null {
  // If specific agent requested, try to find them
  if (requestedName) {
    const requestedAgent = agents.find(
      (a) => a.name.toLowerCase() === requestedName.toLowerCase() && isAgentAvailable(a)
    );
    if (requestedAgent) {
      return requestedAgent;
    }
  }

  // Filter available agents
  const availableAgents = agents.filter(isAgentAvailable);
  if (availableAgents.length === 0) {
    return null;
  }

  // If specialties provided, try to match
  if (specialties && specialties.length > 0) {
    const specialistAgent = availableAgents.find((a) =>
      a.specialties?.some((s) =>
        specialties.some((req) => s.toLowerCase().includes(req.toLowerCase()))
      )
    );
    if (specialistAgent) {
      return specialistAgent;
    }
  }

  // Return first available agent
  return availableAgents[0];
}

export async function transferToHuman(
  params: TransferParams,
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

    const transferConfig = config.transfer_config;
    if (!transferConfig) {
      return {
        success: false,
        error: "Transfer not configured for this client",
      };
    }

    // Find the best agent to transfer to
    const selectedAgent = findBestAgent(
      transferConfig.agents,
      params.agent_name
    );

    const transferNumber = selectedAgent?.phone || transferConfig.default_number;
    const agentName = selectedAgent?.name || "Available Agent";

    // Log the transfer attempt in Airtable if we have lead info
    if (params.phone_number || params.lead_id) {
      try {
        const fields = getFieldMapping(config.client_id);
        
        // Get lead ID
        let leadId = params.lead_id;
        if (!leadId && params.phone_number) {
          const lookupResult = await lookupLead(
            { phone_number: params.phone_number },
            config
          );
          if (lookupResult.success && lookupResult.data?.found) {
            leadId = lookupResult.data.lead_id;
          }
        }

        if (leadId) {
          const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
            config.airtable_base_id
          );

          // Update lead with transfer notes
          const existingRecord = await base(config.leads_table_id).find(leadId);
          const existingNotes = existingRecord.fields[fields.notes] || "";
          const timestamp = new Date().toLocaleString();
          
          const transferNote = [
            `[${timestamp}] Call Transfer Initiated`,
            `  Reason: ${params.reason}`,
            `  Transfer To: ${agentName} (${transferNumber})`,
            params.transfer_notes ? `  Notes: ${params.transfer_notes}` : "",
            `  Priority: ${params.priority || "normal"}`,
          ].filter(Boolean).join("\n");

          await base(config.leads_table_id).update(leadId, {
            [fields.notes]: `${existingNotes}\n${transferNote}`.trim(),
            [fields.status]: "Qualified", // Mark as qualified since they're being transferred
            [fields.qualified]: true,
            [fields.last_contact]: new Date().toISOString().split("T")[0],
          });
        }
      } catch (logError) {
        console.error("[MCP] Failed to log transfer:", logError);
        // Continue with transfer even if logging fails
      }
    }

    const result: TransferResult = {
      transfer_initiated: true,
      transfer_to: transferNumber,
      agent_name: agentName,
    };

    return {
      success: true,
      data: result,
      variables: {
        transfer_initiated: true,
        transfer_to: transferNumber,
        agent_name: agentName,
      },
    };
  } catch (error: any) {
    console.error("[MCP] Transfer error:", error);
    return {
      success: false,
      error: error.message || "Failed to initiate transfer",
    };
  }
}

