/**
 * AI Script Generation API for Avatar Videos
 * 
 * POST /api/avatar/script
 * 
 * Generates engaging video scripts for avatar content.
 * This is a wrapper that uses OpenAI for script generation.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TONE_PROMPTS: Record<string, string> = {
  engaging: 'Make it attention-grabbing with a strong hook. Use punchy, conversational language.',
  professional: 'Keep it polished and business-appropriate with clear, confident language.',
  friendly: 'Make it warm and approachable, like talking to a friend.',
  humorous: 'Add humor and wit. Include jokes or playful twists that make people smile.',
  funny: 'Add humor and wit. Include jokes or playful twists that make people smile.',
  inspirational: 'Make it motivating and uplifting with powerful words that inspire action.',
  educational: 'Make it informative and easy to understand with valuable takeaways.',
  storytelling: 'Tell a compelling narrative that hooks viewers and makes them want more.',
  comedy: 'Be funny, witty, and entertaining with comedic timing.',
  news: 'Present information clearly and authoritatively like a news anchor.',
  promotional: 'Highlight benefits persuasively while maintaining authenticity.',
};

interface ScriptRequest {
  topic: string;
  tone?: string;
  duration?: number;
  count?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: ScriptRequest = await req.json();
    const { topic, tone = 'engaging', duration = 30, count = 1 } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.warn('[Script] OpenAI key not configured, using fallback');
      return NextResponse.json({
        ok: true,
        script: generateFallbackScript(topic, duration),
        scripts: [generateFallbackScript(topic, duration)],
        fallback: true,
      });
    }

    // Calculate approximate word count (avg 2.5 words/sec)
    const wordCount = Math.floor(duration * 2.5);
    const toneGuide = TONE_PROMPTS[tone] || TONE_PROMPTS.engaging;

    const systemPrompt = `You are an expert script writer for AI avatar video content.

Your scripts are:
- Natural and conversational (meant to be spoken aloud)
- Engaging with strong hooks
- Paced well for the specified duration
- Personal and direct (first person, talking to camera)

Important: Generate ONLY the spoken text. No stage directions, no emojis, no annotations.`;

    const userPrompt = `Write a ${duration}-second video script about:
"${topic}"

Requirements:
- Approximately ${wordCount} words
- ${toneGuide}
- Start with an attention-grabbing hook (first 3 seconds are crucial)
- Write in first person as if speaking directly to viewers
- Keep sentences short and natural for speech
- End with something memorable or a hook for more

Return ONLY the script text, nothing else.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Script] OpenAI error:', response.status, errorText);
      return NextResponse.json({
        ok: true,
        script: generateFallbackScript(topic, duration),
        scripts: [generateFallbackScript(topic, duration)],
        fallback: true,
        reason: 'OpenAI API error',
      });
    }

    const data = await response.json();
    const script = data.choices?.[0]?.message?.content?.trim();

    if (!script) {
      return NextResponse.json({
        ok: true,
        script: generateFallbackScript(topic, duration),
        scripts: [generateFallbackScript(topic, duration)],
        fallback: true,
        reason: 'Empty response from AI',
      });
    }

    return NextResponse.json({
      ok: true,
      script,
      scripts: [script],
      topic,
      tone,
      duration,
    });

  } catch (err: any) {
    console.error('[Script] Error:', err);
    
    // Return fallback even on error
    return NextResponse.json({
      ok: true,
      script: generateFallbackScript('your content', 30),
      scripts: [generateFallbackScript('your content', 30)],
      fallback: true,
      error: err.message,
    });
  }
}

/**
 * Generate a fallback script when AI is unavailable
 */
function generateFallbackScript(topic: string, duration: number): string {
  // Extract meaningful words from topic
  const topicWords = topic.replace(/[^a-zA-Z\s]/g, ' ').split(/\s+/).slice(0, 5).join(' ');
  
  if (duration <= 15) {
    return `Hey! Quick tip about ${topicWords} that you need to know. This changes everything. Trust me on this one.`;
  }
  
  if (duration <= 30) {
    return `Hey everyone! Let me tell you something important about ${topicWords}. Most people don't realize this, but there's a better way to think about it. Stick with me because what I'm about to share could really help you out. Don't forget to check back for more!`;
  }
  
  return `Welcome back everyone! Today I want to talk about something that's been on my mind - ${topicWords}. You know, a lot of people struggle with this, and I totally get it. But here's the thing - once you understand the core principle, everything changes. Let me break it down for you in a way that actually makes sense. First, you need to shift your perspective. Then, it's all about taking consistent action. The results will speak for themselves. I've seen it work countless times, and I know it can work for you too. Let me know in the comments if this resonates with you!`;
}
