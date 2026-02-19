// Broadcast Engine - A/B Testing API
// POST /api/broadcast/ab-test - Create A/B test

import { NextResponse } from "next/server";
import { createABTest, updateVariantPerformance, completeABTest, getTestInsights } from "@/lib/broadcast/ab-testing";
import { Platform } from "@/lib/broadcast/types";

// In-memory store (replace with database in production)
const abTests: Map<string, any> = new Map();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body.action; // "create" | "update" | "complete"
    
    if (action === "create") {
      const { name, variants, platform, metric } = body;
      
      if (!name || !variants || !platform) {
        return NextResponse.json(
          { error: "name, variants, and platform are required" },
          { status: 400 }
        );
      }
      
      const test = createABTest(name, variants, platform as Platform, metric);
      abTests.set(test.id, test);
      
      return NextResponse.json({
        success: true,
        test
      });
    }
    
    if (action === "update") {
      const { testId, variantId, performance } = body;
      
      if (!testId || !variantId || !performance) {
        return NextResponse.json(
          { error: "testId, variantId, and performance are required" },
          { status: 400 }
        );
      }
      
      const test = abTests.get(testId);
      if (!test) {
        return NextResponse.json(
          { error: "Test not found" },
          { status: 404 }
        );
      }
      
      const updated = updateVariantPerformance(test, variantId, performance);
      abTests.set(testId, updated);
      
      return NextResponse.json({
        success: true,
        test: updated
      });
    }
    
    if (action === "complete") {
      const { testId } = body;
      
      if (!testId) {
        return NextResponse.json(
          { error: "testId is required" },
          { status: 400 }
        );
      }
      
      const test = abTests.get(testId);
      if (!test) {
        return NextResponse.json(
          { error: "Test not found" },
          { status: 404 }
        );
      }
      
      const completed = completeABTest(test);
      abTests.set(testId, completed);
      
      const insights = getTestInsights(completed);
      
      return NextResponse.json({
        success: true,
        test: completed,
        insights
      });
    }
    
    return NextResponse.json(
      { error: "Invalid action. Use 'create', 'update', or 'complete'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[Broadcast API] A/B test error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");
    
    if (testId) {
      const test = abTests.get(testId);
      if (!test) {
        return NextResponse.json(
          { error: "Test not found" },
          { status: 404 }
        );
      }
      
      const insights = test.status === "completed" ? getTestInsights(test) : {};
      
      return NextResponse.json({
        success: true,
        test,
        insights
      });
    }
    
    // List all tests
    const tests = Array.from(abTests.values());
    
    return NextResponse.json({
      success: true,
      tests,
      count: tests.length
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get A/B tests error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
