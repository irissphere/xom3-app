/**
 * AI Script Generation API for SpaceBaddie
 * 
 * Generates engaging video scripts based on topic, tone, and duration.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TONE_PROMPTS: Record<string, string> = {
  engaging: 'Make it attention-grabbing with a strong hook. Use punchy, conversational language that keeps viewers watching.',
  professional: 'Keep it polished and business-appropriate. Use clear, confident language that establishes authority.',
  friendly: 'Make it warm and approachable, like talking to a friend. Use casual language and be relatable.',
  funny: 'Add humor and wit. Include a joke, pun, or playful twist that makes people smile.',
  inspirational: 'Make it motivating and uplifting. Include powerful words that inspire action and positive feelings.',
  educational: 'Make it informative and easy to understand. Present the information clearly with valuable takeaways.',
};

export async function POST(req: Request) {
  try {
    const { topic, tone = 'engaging', duration = 15 } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Calculate approximate word count for duration (avg 2.5 words/sec)
    const wordCount = Math.floor(duration * 2.5);
    const toneGuide = TONE_PROMPTS[tone] || TONE_PROMPTS.engaging;

    const systemPrompt = `You are a viral social media script writer specializing in short-form video content (TikTok, Reels, Shorts).

Your scripts are known for:
- Strong hooks in the first 3 seconds
- Conversational, natural-sounding language
- Clear value or entertainment for viewers
- Ending with a call-to-action or memorable line

Generate scripts that work well for AI avatar videos - keep language natural and pacing appropriate for speech.`;

    const userPrompt = `Write 3 different short video scripts about: "${topic}"

Requirements:
- Each script should be approximately ${wordCount} words (for a ${duration}-second video)
- ${toneGuide}
- Start with a hook that grabs attention immediately
- Keep sentences short and punchy
- End with a memorable line or subtle call-to-action
- Write in first person, as if the avatar is speaking directly to the viewer
- NO emojis, hashtags, or text annotations - just the spoken words

Return ONLY the 3 scripts, separated by "---" on its own line. No numbering, no explanations.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Parse the scripts
    const scripts = content
      .split('---')
      .map(s => s.trim())
      .filter(s => s.length > 10);

    if (scripts.length === 0) {
      // Fallback if parsing failed
      return NextResponse.json({
        success: true,
        scripts: [content.trim()],
        topic,
        tone,
        duration,
      });
    }

    return NextResponse.json({
      success: true,
      scripts: scripts.slice(0, 3), // Max 3 scripts
      topic,
      tone,
      duration,
    });

  } catch (error) {
    console.error('[Generate Script API] Error:', error);
    
    // Return fallback scripts if OpenAI fails
    return NextResponse.json({
      success: true,
      scripts: [
        `Hey, let me tell you about something important. This is going to change how you think about ${req.body || 'this topic'}. Stay with me for the next few seconds because this is worth your time.`,
        `You know what? Most people don't realize this, but there's a better way. I've learned some things that I wish someone had told me sooner. Let me share them with you real quick.`,
        `Stop scrolling for a second. I've got something you need to hear. Trust me, this tip has helped so many people and it's going to help you too.`,
      ],
      fallback: true,
    });
  }
}
