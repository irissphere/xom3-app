/**
 * SpaceBaddie AI Content Assist API
 * POST /api/spacebaddie/ai-assist
 * 
 * Generates optimized titles, descriptions, and hashtags for social posts
 * using OpenAI GPT
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AIAssistRequest {
  type: "title" | "description" | "hashtags" | "all";
  context: {
    title?: string;
    description?: string;
    hashtags?: string;
    mediaUrl?: string;
    platforms?: string[];
    cta?: string;
    niche?: string; // e.g. "gaming", "beauty", "tech"
  };
}

interface AIAssistResponse {
  title?: string;
  description?: string;
  hashtags?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "OpenAI not configured" }, { status: 500 });
    }

    const body: AIAssistRequest = await req.json();
    const { type, context } = body;

    if (!type) {
      return NextResponse.json({ ok: false, error: "Type is required" }, { status: 400 });
    }

    const platformStr = context.platforms?.length
      ? `Target platforms: ${context.platforms.join(", ")}.`
      : "Target platforms: YouTube, social media.";

    let systemPrompt = `You are a social media content expert specializing in viral content creation. You help creators optimize their posts for maximum engagement, reach, and algorithm performance.

Rules:
- Be concise but compelling
- Use power words that drive engagement
- Optimize for the target platforms
- Keep titles under 80 characters
- Descriptions should be 2-4 sentences, compelling but not spammy
- Hashtags should be a mix of popular and niche-specific (8-12 tags)
- Use natural, conversational tone
- Never use clickbait that doesn't deliver
${platformStr}`;

    let userPrompt = "";

    if (type === "title" || type === "all") {
      const existingDesc = context.description ? `\nCurrent description: "${context.description}"` : "";
      const existingTitle = context.title ? `\nCurrent title (improve this): "${context.title}"` : "";
      userPrompt += `Generate an engaging, algorithm-friendly title for a social media video post.${existingTitle}${existingDesc}\n`;
    }

    if (type === "description" || type === "all") {
      const existingTitle = context.title ? `\nVideo title: "${context.title}"` : "";
      const existingDesc = context.description ? `\nCurrent description (improve this): "${context.description}"` : "";
      userPrompt += `Generate an engaging description for a social media video post.${existingTitle}${existingDesc}\nInclude a call to action: ${context.cta || "Watch Now"}.\n`;
    }

    if (type === "hashtags" || type === "all") {
      const titleCtx = context.title ? `Video title: "${context.title}".` : "";
      const descCtx = context.description ? `Description: "${context.description}".` : "";
      const existingTags = context.hashtags ? `\nCurrent hashtags (improve these): "${context.hashtags}"` : "";
      userPrompt += `Generate optimized hashtags for a social media post. ${titleCtx} ${descCtx}${existingTags}\nReturn 8-12 hashtags, each prefixed with #, space-separated.\n`;
    }

    if (type === "all") {
      userPrompt += `\nReturn ONLY valid JSON in this exact format (no markdown, no code blocks):
{"title": "...", "description": "...", "hashtags": "#tag1 #tag2 #tag3 ..."}`;
    } else if (type === "title") {
      userPrompt += `\nReturn ONLY the title text, nothing else. No quotes, no prefix.`;
    } else if (type === "description") {
      userPrompt += `\nReturn ONLY the description text, nothing else. No quotes, no prefix.`;
    } else if (type === "hashtags") {
      userPrompt += `\nReturn ONLY the hashtags, space-separated, each prefixed with #. Nothing else.`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[AI Assist] OpenAI error:", errData);
      return NextResponse.json({ ok: false, error: "AI generation failed" }, { status: 500 });
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content?.trim() || "";

    if (!content_text) {
      return NextResponse.json({ ok: false, error: "No content generated" }, { status: 500 });
    }

    let result: AIAssistResponse = {};

    if (type === "all") {
      try {
        // Try to parse JSON response
        const cleaned = content_text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        // Fallback: treat as description
        result = { description: content_text };
      }
    } else if (type === "title") {
      result = { title: content_text.replace(/^["']|["']$/g, "").trim() };
    } else if (type === "description") {
      result = { description: content_text.replace(/^["']|["']$/g, "").trim() };
    } else if (type === "hashtags") {
      result = { hashtags: content_text.trim() };
    }

    return NextResponse.json({ ok: true, ...result });

  } catch (err: any) {
    console.error("[AI Assist] Error:", err);
    return NextResponse.json({ ok: false, error: err.message || "AI assist failed" }, { status: 500 });
  }
}
