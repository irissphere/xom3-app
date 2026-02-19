// Agent Identity API
import { NextResponse } from "next/server";
import { getAgentIdentity, getAgentProfile } from "@/lib/agents/identity";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const email = searchParams.get("email");
    const includeProfile = searchParams.get("includeProfile") === "true";
    const tenant = searchParams.get("tenant") || undefined;

    if (!agentId && !email) {
      return NextResponse.json(
        { error: "agentId or email required" },
        { status: 400 }
      );
    }

    const identifier = agentId || email || "";
    const identity = await getAgentIdentity(identifier, !!email);

    if (!identity) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    if (includeProfile) {
      const profile = await getAgentProfile(identity.id, tenant);
      return NextResponse.json({ success: true, profile });
    }

    return NextResponse.json({ success: true, identity });
  } catch (error: any) {
    console.error("Error getting agent identity:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
