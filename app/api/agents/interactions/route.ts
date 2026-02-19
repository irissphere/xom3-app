// Agent Interactions API
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { 
  logNote, 
  logCall, 
  requestDocuments, 
  moveClientToStage,
  scheduleMeeting,
  sendEmail,
  sendSMS
} from "@/lib/agents/interactions";
import { getAgentIdentity } from "@/lib/agents/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, agentId, clientId, ...params } = body;

    if (!action || !agentId || !clientId) {
      return NextResponse.json(
        { error: "action, agentId, and clientId required" },
        { status: 400 }
      );
    }

    const agent = await getAgentIdentity(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case "logNote":
        result = await logNote(clientId, params.note, agent);
        break;
      case "logCall":
        result = await logCall(clientId, params.notes, params.outcome, agent);
        break;
      case "requestDocuments":
        result = await requestDocuments(clientId, params.documents, agent, params.notes);
        break;
      case "moveStage":
        result = await moveClientToStage(clientId, params.newStage, agent, params.notes);
        break;
      case "scheduleMeeting":
        result = await scheduleMeeting(clientId, params.meetingDate, params.notes, agent);
        break;
      case "sendEmail":
        result = await sendEmail(clientId, params.subject, params.body, agent);
        break;
      case "sendSMS":
        result = await sendSMS(clientId, params.message, agent);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to perform action" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error performing interaction:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
