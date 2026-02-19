// Broadcast Engine - Revenue Attribution API
// GET /api/broadcast/revenue/roi - Get ROI data for content, platforms, trends, agents, funnel entry points

import { NextResponse } from "next/server";
import { 
  calculateContentROI, 
  calculatePlatformROI, 
  calculateTrendROI, 
  calculateAgentROI, 
  calculateFunnelEntryPointROI,
  getTopPerformingContent,
  getTopPerformingPlatforms
} from "@/lib/broadcast/revenue-attribution/roi-calculator";
import { RevenueAttribution } from "@/lib/broadcast/revenue-attribution/revenue-tracker";
import { ConversionData } from "@/lib/broadcast/agent-workflow/close";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // content, platform, trend, agent, funnel
    const id = searchParams.get("id"); // Specific ID to get ROI for
    
    // In production, fetch attributions and conversions from database
    // For now, return empty data structure
    const attributions: RevenueAttribution[] = [];
    const conversions: ConversionData[] = [];
    
    if (type === "content" && id) {
      const roi = calculateContentROI(id, "unknown", attributions, conversions);
      return NextResponse.json({
        success: true,
        type: "content",
        roi
      });
    }
    
    if (type === "platform" && id) {
      const roi = calculatePlatformROI(id, attributions, conversions);
      return NextResponse.json({
        success: true,
        type: "platform",
        roi
      });
    }
    
    if (type === "trend" && id) {
      const roi = calculateTrendROI(id, "breakout", attributions, conversions);
      return NextResponse.json({
        success: true,
        type: "trend",
        roi
      });
    }
    
    if (type === "agent" && id) {
      const roi = calculateAgentROI(id, conversions, attributions);
      return NextResponse.json({
        success: true,
        type: "agent",
        roi
      });
    }
    
    if (type === "funnel" && id) {
      const roi = calculateFunnelEntryPointROI(id, conversions, attributions);
      return NextResponse.json({
        success: true,
        type: "funnel",
        roi
      });
    }
    
    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        totalAttributions: attributions.length,
        totalConversions: conversions.length,
        message: "In production, fetch from database"
      }
    });
  } catch (error: any) {
    console.error("[Broadcast API] ROI calculation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
