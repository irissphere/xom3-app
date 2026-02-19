/**
 * Benefits Tier Access API
 * 
 * GET - Fetch all tier access records
 * POST - Grant new tier access
 */

import { NextResponse } from "next/server";
import { getTierAccess, getTierAccessByTier, grantTierAccess } from "@/lib/benefits/store";
import type { AccessTier, TierStatus } from "@/lib/benefits/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") as AccessTier | null;

    let access;

    if (tier) {
      access = getTierAccessByTier(tier);
    } else {
      access = getTierAccess();
    }

    return NextResponse.json({
      success: true,
      data: {
        items: access,
        total: access.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch tier access",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { tier, status, userId, userName, email, permissions, grantedBy, notes } = body;

    if (!tier || !userId || !userName || !email || !grantedBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: tier, userId, userName, email, grantedBy",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const newAccess = grantTierAccess({
      tier: tier as AccessTier,
      status: (status || "pending") as TierStatus,
      userId,
      userName,
      email,
      permissions: permissions || ["dashboard_access"],
      grantedBy,
      notes,
    });

    return NextResponse.json({
      success: true,
      data: newAccess,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to grant tier access",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
