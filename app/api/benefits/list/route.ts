/**
 * Benefits List API
 * 
 * GET - Fetch all benefits with optional filters
 */

import { NextResponse } from "next/server";
import { getBenefits, getBenefitsByCategory, getBenefitsByStatus } from "@/lib/benefits/store";
import type { BenefitCategory, BenefitStatus } from "@/lib/benefits/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as BenefitCategory | null;
    const status = searchParams.get("status") as BenefitStatus | null;

    let benefits;

    if (category) {
      benefits = getBenefitsByCategory(category);
    } else if (status) {
      benefits = getBenefitsByStatus(status);
    } else {
      benefits = getBenefits();
    }

    return NextResponse.json({
      success: true,
      data: {
        items: benefits,
        total: benefits.length,
        page: 1,
        pageSize: benefits.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch benefits",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
