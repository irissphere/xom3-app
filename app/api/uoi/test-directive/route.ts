import { NextRequest, NextResponse } from "next/server";
import {
  createDirective,
  ensureHandlersInitialized,
  executeDirectiveNow,
} from "@/lib/uoi";

export const dynamic = "force-dynamic";

const DIRECTIVE_TYPES = [
  "PAUSE_PIPELINE",
  "RESUME_PIPELINE",
  "REWRITE_MAPPING",
  "REBALANCE_WORKFLOW",
  "TRIGGER_ALERT",
  "OPTIMIZE_ORDER",
  "REQUEST_HUMAN_REVIEW",
] as const;

type DirectiveType = (typeof DIRECTIVE_TYPES)[number];

function isDirectiveType(value: any): value is DirectiveType {
  return typeof value === "string" && (DIRECTIVE_TYPES as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  try {
    ensureHandlersInitialized();

    const body = await req.json().catch(() => ({}));
    const type: DirectiveType = isDirectiveType(body?.type) ? body.type : "TRIGGER_ALERT";
    const target = body?.target || "operator";
    const reason = body?.reason || "UOI test directive issued from cockpit observatory";

    const directive = createDirective(type, target, { test: true, ...(body?.payload || {}) }, reason);
    await executeDirectiveNow(directive);

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        directive,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        timestamp: new Date().toISOString(),
        error: error?.message || "Failed to execute test directive",
      },
      { status: 500 }
    );
  }
}
