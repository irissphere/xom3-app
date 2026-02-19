// Broadcast Engine - Content Generation API
// POST /api/broadcast/generate - Generate content package

import { NextResponse } from "next/server";
import { generateContent } from "@/lib/broadcast/content-generation";
import { Platform } from "@/lib/broadcast/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const topic = body.topic;
    const platforms = body.platforms || ["instagram"];
    const options = body.options || {};
    
    if (!topic) {
      return NextResponse.json(
        { error: "topic is required" },
        { status: 400 }
      );
    }
    
    // Validate platforms
    const validPlatforms: Platform[] = ["youtube", "tiktok", "instagram", "facebook", "linkedin", "twitter", "shorts", "reels"];
    const invalidPlatforms = platforms.filter((p: string) => !validPlatforms.includes(p as Platform));
    
    if (invalidPlatforms.length > 0) {
      return NextResponse.json(
        { error: `Invalid platforms: ${invalidPlatforms.join(", ")}` },
        { status: 400 }
      );
    }
    
    // Generate content
    const content = await generateContent(topic, platforms, options);
    
    return NextResponse.json({
      success: true,
      content
    });
  } catch (error: any) {
    console.error("[Broadcast API] Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    // Return generation capabilities
    return NextResponse.json({
      success: true,
      capabilities: {
        scripts: true,
        captions: true,
        hooks: true,
        ctas: true,
        hashtags: true,
        titles: true,
        descriptions: true,
        thumbnails: true,
        platformVariants: true,
        shortFormCuts: true
      },
      supportedPlatforms: ["youtube", "tiktok", "instagram", "facebook", "linkedin", "twitter", "shorts", "reels"],
      supportedStyles: ["educational", "story", "hook", "cta"],
      supportedLengths: ["short", "medium", "long"]
    });
  } catch (error: any) {
    console.error("[Broadcast API] Get capabilities error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
