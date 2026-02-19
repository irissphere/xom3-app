import { NextRequest, NextResponse } from "next/server";
import { sendNotification } from "@/lib/notifications/send";

export async function POST(request: NextRequest) {
  try {
    const { channel, message } = await request.json();

    if (!channel || !message) {
      return NextResponse.json({ error: "Channel and message are required" }, { status: 400 });
    }

    // Test the notification channel
    await sendNotification("default", { message }, [channel]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification test failed:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}








