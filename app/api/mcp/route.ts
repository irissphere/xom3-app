/**
 * MCP Server Endpoint for Retell AI
 * 
 * This endpoint handles MCP tool calls from Retell AI agents.
 * Supports both JSON-RPC 2.0 (official MCP) and custom REST formats.
 * 
 * POST /api/mcp - Execute a tool or handle JSON-RPC methods
 * GET /api/mcp - Get server info and available tools
 */

import { NextRequest, NextResponse } from "next/server";
import {
  MCPToolCall,
  MCPToolResponse,
  MCPServerInfo,
  RetellCallContext,
} from "@/lib/mcp/types";
import { TOOL_DEFINITIONS } from "@/lib/mcp/tools";
import { lookupLead } from "@/lib/mcp/tools/lookup-lead";
import { updateStatus } from "@/lib/mcp/tools/update-status";
import { bookAppointment, checkAvailability } from "@/lib/mcp/tools/appointment";
import { sendConfirmationSMS } from "@/lib/mcp/tools/sms-confirm";
import { transferToHuman } from "@/lib/mcp/tools/transfer";
import { getClientByAgentId, getClientConfig } from "@/lib/mcp/clients";

// CORS headers for Retell dashboard access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Convert our tool definitions to MCP JSON-RPC format
function getToolsInMCPFormat() {
  return TOOL_DEFINITIONS.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        tool.parameters.map(p => [
          p.name,
          {
            type: p.type,
            description: p.description,
            ...(p.enum ? { enum: p.enum } : {}),
          }
        ])
      ),
      required: tool.parameters.filter(p => p.required).map(p => p.name),
    },
  }));
}

// ============================================================
// OPTIONS - CORS Preflight
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// ============================================================
// GET - Server Info (MCP JSON-RPC format)
// ============================================================

export async function GET() {
  // Return both formats for compatibility
  const serverInfo: MCPServerInfo = {
    name: "XOM3 MCP Server",
    version: "1.0.0",
    tools: TOOL_DEFINITIONS,
  };

  // Also include MCP JSON-RPC format
  const mcpFormat = {
    jsonrpc: "2.0",
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "XOM3 MCP Server",
        version: "1.0.0",
      },
      tools: getToolsInMCPFormat(),
    },
  };

  // Return combined response
  return NextResponse.json({
    ...serverInfo,
    ...mcpFormat,
  }, { headers: corsHeaders });
}

// ============================================================
// JSON-RPC 2.0 Handler (Official MCP Protocol)
// ============================================================

async function handleJSONRPC(body: { jsonrpc: string; method?: string; params?: Record<string, unknown>; id?: number | string }) {
  const { method, params, id } = body;

  // Handle different MCP methods
  switch (method) {
    case "initialize":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "XOM3 MCP Server",
            version: "1.0.0",
          },
        },
      }, { headers: corsHeaders });

    case "tools/list":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: getToolsInMCPFormat(),
        },
      }, { headers: corsHeaders });

    case "tools/call":
      // Execute the tool
      const toolName = (params as Record<string, unknown>)?.name as string;
      const toolArgs = (params as Record<string, unknown>)?.arguments as Record<string, unknown> || {};
      
      if (!toolName) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Missing tool name" },
        }, { headers: corsHeaders });
      }

      const result = await executeToolByName(toolName, toolArgs);
      
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.variables || result.data || { success: result.success }),
            },
          ],
          isError: !result.success,
        },
      }, { headers: corsHeaders });

    default:
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      }, { headers: corsHeaders });
  }
}

// Helper to execute tools by name
async function executeToolByName(toolName: string, args: Record<string, unknown>): Promise<MCPToolResponse> {
  const config = getClientConfig("opus1"); // Default client

  switch (toolName) {
    case "lookup_lead":
      return lookupLead({ phone_number: args.phone_number as string }, config || undefined);
    case "update_status":
      return updateStatus({
        phone_number: args.phone_number as string,
        new_status: args.new_status as string,
        notes: args.notes as string,
        qualified: args.qualified as boolean,
      }, config || undefined);
    case "check_availability":
      return checkAvailability({ days_ahead: args.days_ahead as number }, config || undefined);
    case "book_appointment":
      return bookAppointment({
        phone_number: args.phone_number as string,
        preferred_date: args.preferred_date as string,
        preferred_time: args.preferred_time as string,
        notes: args.notes as string,
      }, config || undefined);
    case "send_confirmation_sms":
      return sendConfirmationSMS({
        phone_number: args.phone_number as string,
        message_type: args.message_type as "appointment_confirmation" | "callback_confirmation" | "custom",
        custom_message: args.custom_message as string,
      }, config || undefined);
    case "transfer_to_human":
      return transferToHuman({
        reason: args.reason as string,
        agent_name: args.agent_name as string,
        priority: args.priority as "normal" | "high" | "urgent",
        transfer_notes: args.transfer_notes as string,
      }, config || undefined);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================
// POST - Execute Tool
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle JSON-RPC 2.0 MCP protocol
    if (body.jsonrpc === "2.0") {
      return handleJSONRPC(body);
    }

    // Retell sends tool calls in a specific format
    // Handle both direct tool calls and Retell's format
    let toolCall: MCPToolCall;
    let callContext: RetellCallContext | undefined;
    let clientId: string | undefined;

    // Check if this is a Retell-format request
    if (body.call) {
      callContext = {
        call_id: body.call.call_id,
        from_number: body.call.from_number,
        to_number: body.call.to_number,
        agent_id: body.call.agent_id,
        call_status: body.call.call_status,
        metadata: body.call.metadata,
      };
      
      // Get client config from agent ID
      const clientConfig = getClientByAgentId(callContext.agent_id);
      clientId = clientConfig?.client_id;
    }

    // Parse tool call
    if (body.tool_call) {
      toolCall = body.tool_call;
    } else if (body.tool_name) {
      toolCall = {
        tool_name: body.tool_name,
        arguments: body.arguments || {},
        call_id: body.call_id,
      };
    } else {
      return NextResponse.json(
        { success: false, error: "Missing tool_name or tool_call" },
        { status: 400 }
      );
    }

    // Get client config (from call context, body, or default)
    const config = clientId 
      ? getClientConfig(clientId) 
      : body.client_id 
        ? getClientConfig(body.client_id)
        : getClientConfig("opus1"); // Default to opus1

    // Auto-inject phone number from call context if not provided
    if (callContext && !toolCall.arguments.phone_number) {
      toolCall.arguments.phone_number = callContext.from_number;
    }

    console.log(`[MCP] Tool call: ${toolCall.tool_name}`, {
      arguments: toolCall.arguments,
      client: config?.client_id,
      call_id: callContext?.call_id,
    });

    // Execute the tool
    let result: MCPToolResponse;

    switch (toolCall.tool_name) {
      case "lookup_lead":
        result = await lookupLead(
          { phone_number: toolCall.arguments.phone_number },
          config || undefined
        );
        break;

      case "update_status":
        result = await updateStatus(
          {
            phone_number: toolCall.arguments.phone_number,
            lead_id: toolCall.arguments.lead_id,
            new_status: toolCall.arguments.new_status,
            notes: toolCall.arguments.notes,
            qualified: toolCall.arguments.qualified,
            tags_to_add: toolCall.arguments.tags_to_add,
          },
          config || undefined
        );
        break;

      case "check_availability":
        result = await checkAvailability(
          {
            days_ahead: toolCall.arguments.days_ahead,
            date: toolCall.arguments.date,
          },
          config || undefined
        );
        break;

      case "book_appointment":
        result = await bookAppointment(
          {
            phone_number: toolCall.arguments.phone_number,
            lead_id: toolCall.arguments.lead_id,
            preferred_date: toolCall.arguments.preferred_date,
            preferred_time: toolCall.arguments.preferred_time,
            appointment_type: toolCall.arguments.appointment_type,
            notes: toolCall.arguments.notes,
          },
          config || undefined
        );
        break;

      case "send_confirmation_sms":
        result = await sendConfirmationSMS(
          {
            phone_number: toolCall.arguments.phone_number,
            message_type: toolCall.arguments.message_type,
            custom_message: toolCall.arguments.custom_message,
            appointment_date: toolCall.arguments.appointment_date,
            appointment_time: toolCall.arguments.appointment_time,
          },
          config || undefined
        );
        break;

      case "transfer_to_human":
        result = await transferToHuman(
          {
            reason: toolCall.arguments.reason,
            lead_id: toolCall.arguments.lead_id,
            phone_number: toolCall.arguments.phone_number,
            agent_name: toolCall.arguments.agent_name,
            transfer_notes: toolCall.arguments.transfer_notes,
            priority: toolCall.arguments.priority,
          },
          config || undefined
        );
        break;

      default:
        result = {
          success: false,
          error: `Unknown tool: ${toolCall.tool_name}`,
        };
    }

    console.log(`[MCP] Tool result: ${toolCall.tool_name}`, {
      success: result.success,
      variables: result.variables,
    });

    // Return in Retell's expected format
    return NextResponse.json({
      success: result.success,
      result: result.data,
      variables: result.variables,
      error: result.error,
    }, { headers: corsHeaders });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("[MCP] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}






















