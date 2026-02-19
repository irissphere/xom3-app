import { NextResponse } from "next/server";
import { listSignals } from "@/lib/signals/signal-store";

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatSignalMessage(signal: any): string {
  const { type, payload } = signal;

  // Format based on signal type
  if (type.startsWith("intakecrm.lead.")) {
    if (type === "intakecrm.lead.created") return `New lead created: ${payload?.leadId || "Unknown"}`;
    if (type === "intakecrm.lead.updated") return `Lead updated: ${payload?.leadId || "Unknown"}`;
  }

  if (type.startsWith("intakecrm.intake.")) {
    return `Lead intake received from ${payload?.source || "unknown source"}`;
  }

  if (type.startsWith("operator.dashboard.")) {
    return `Dashboard viewed by operator`;
  }

  // Fallback
  return `${type.replace(/\./g, " ").replace(/\b\w/g, l => l.toUpperCase())}`;
}

function mapSeverityToDisplay(severity: string): string {
  switch (severity) {
    case "error": return "error";
    case "warning": return "warning";
    case "info":
    default: return "info";
  }
}

export async function GET() {
  try {
    // Get real signals from the store
    const rawSignals = listSignals({ limit: 20, tenantId: "xom3" });

    // Map to dashboard format
    const signals = rawSignals.map(signal => ({
      id: signal.signalId,
      type: signal.type.split(".")[0], // First part of type (lead, intake, etc)
      message: formatSignalMessage(signal),
      time: formatRelativeTime(signal.timestamp),
      source: signal.type.split(".")[1] || "system", // Second part of type
      severity: mapSeverityToDisplay(signal.severity),
      timestamp: signal.timestamp,
    }));

    // If no real signals, provide some fallback examples
    if (signals.length === 0) {
      return NextResponse.json([
        {
          id: "fallback-1",
          type: "system",
          message: "System initialized successfully",
          time: "Just now",
          source: "cockpit",
          severity: "info",
          timestamp: new Date().toISOString(),
        }
      ]);
    }

    return NextResponse.json(signals, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[Dashboard/Signals] Error fetching signals:", error);

    // Return safe fallback
    return NextResponse.json([{
      id: "error-fallback",
      type: "error",
      message: "Unable to load signals - check system status",
      time: "Just now",
      source: "system",
      severity: "error",
      timestamp: new Date().toISOString(),
    }], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
