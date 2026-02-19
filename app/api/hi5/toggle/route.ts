import { NextResponse } from "next/server";
import { toggleHi5Automation } from "@/lib/system/hi5-control";
import { isHi5Enabled } from "@/lib/system/tenant";

export async function POST(req: Request) {
  if (!isHi5Enabled()) return new NextResponse(null, { status: 404 });

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { success: false, message: "Expected { enabled: boolean }." },
      { status: 400 }
    );
  }

  const result = await toggleHi5Automation(enabled);

  return NextResponse.json({
    ...result,
    enabled,
  });
}
