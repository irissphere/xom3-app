/**
 * Benefits Audit Log API
 * 
 * GET - Fetch audit logs with pagination
 */

import { NextResponse } from "next/server";
import { getAuditLogs, getAuditLogsByActor } from "@/lib/benefits/store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actor = searchParams.get("actor");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    let logs;

    if (actor) {
      logs = getAuditLogsByActor(actor);
    } else {
      logs = getAuditLogs();
    }

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedLogs = logs.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedLogs,
        total: logs.length,
        page,
        pageSize,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch audit logs",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
