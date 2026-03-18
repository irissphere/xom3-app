/**
 * AI Scene & Script Suggestion API for SpaceBaddie Studio
 * 
 * Generates contextual script suggestions based on the current
 * cinematic settings (template, expression style, speaking style).
 * Does NOT require a topic -- infers from context.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const getOpenAI = () => new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      templateName,
      expressionStyle,
      speakingStyle,
      topic,
      tone,
      duration = 15,
      aspectRatio = '9:16',
    } = body;

    // Calculate approximate word count for duration (avg 2.5 words/sec)
    const wordCount = Math.floor(duration * 2.5);

    // Build context from cinematic settings
    const contextParts: string[] = [];
    if (templateName) contextParts.push(`Template: ${templateName}`);
    if (expressionStyle) contextParts.push(`Expression: ${expressionStyle}`);
    if (speakingStyle) contextParts.push(`Speaking style: ${speakingStyle}`);
    if (aspectRatio === '9:16') contextParts.push('Format: Short-form vertical (TikTok/Reels)');
    else if (aspectRatio === '16:9') contextParts.push('Format: Widescreen horizontal (YouTube)');
    else contextParts.push('Format: Square (Instagram)');

    const contextStr = contextParts.length > 0
      ? `\nVideo Context:\n${contextParts.join('\n')}`
      : '';

    const topicStr = topic
      ? `Topic: "${topic}"`
      : 'Create a compelling script that fits the video context above. Pick an engaging topic that matches.';

    const systemPrompt = `You are a top-tier social media script writer for AI avatar videos.
You create viral, engaging scripts that sound natural when spoken aloud.
Your scripts always have: a strong hook, clear value, and a memorable ending.
Keep language conversational -- these are read by AI avatars with lip-sync.`;

    const userPrompt = `Generate 3 short video scripts.
${contextStr}
${topicStr}

Requirements:
- Each ~${wordCount} words (${duration}-second video)
- ${tone ? `Tone: ${tone}` : 'Engaging and attention-grabbing'}
- Start with a hook that stops the scroll
- Short, punchy sentences for natural speech
- End with a call-to-action or memorable line
- First person, speaking directly to the viewer
- NO emojis, hashtags, or annotations -- spoken words only

Return as JSON array: [{"title": "short title", "script": "the full script"}, ...]
Return ONLY valid JSON, nothing else.`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1000,
      temperature: 0.85,
    });

    const content = response.choices[0]?.message?.content || '';

    // Try parsing as JSON
    let suggestions: { title: string; script: string }[] = [];
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      // Fallback: split by --- like generate-script does
      const scripts = content.split('---').map(s => s.trim()).filter(s => s.length > 10);
      suggestions = scripts.map((s, i) => ({
        title: `Option ${i + 1}`,
        script: s,
      }));
    }

    if (suggestions.length === 0) {
      suggestions = [{ title: 'Suggestion', script: content.trim() }];
    }

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 3),
    });

  } catch (error) {
    console.error('[Suggest API] Error:', error);

    // Fallback suggestions
    return NextResponse.json({
      success: true,
      suggestions: [
        {
          title: 'Quick Hook',
          script: 'Stop scrolling for just a second. I need to tell you something that completely changed my perspective. And trust me, once you hear this, you will not look at things the same way again.',
        },
        {
          title: 'Story Opener',
          script: 'So something wild happened to me last week. I was minding my own business when I stumbled on this one thing. Now I cannot stop thinking about it, and I think you need to hear about it too.',
        },
        {
          title: 'Value Drop',
          script: 'Here is a tip that nobody talks about. Most people skip right past this, but it is honestly one of the biggest game-changers out there. Let me break it down for you real quick.',
        },
      ],
      fallback: true,
    });
  }
}
