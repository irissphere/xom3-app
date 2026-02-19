/**
 * Voice Synthesis - OpenAI TTS Wrapper
 * 
 * Text-to-speech using OpenAI's TTS API
 * Cost: $0.015 per 1K characters (~$0.02 per 60s video)
 */

import { VoiceId, VIDEO_COSTS, ScriptSegment } from './types';

export interface TTSRequest {
  text: string;
  voice: VoiceId;
  speed?: number; // 0.25 to 4.0, default 1.0
}

export interface TTSResponse {
  audioBuffer: Buffer;
  duration: number; // estimated duration in seconds
  characterCount: number;
  costCents: number;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

const OPENAI_TTS_ENDPOINT = 'https://api.openai.com/v1/audio/speech';

// Average speaking rate: ~150 words per minute, ~750 characters per minute
const CHARS_PER_SECOND = 12.5;

/**
 * Estimate audio duration from text length
 */
export function estimateDuration(text: string, speed: number = 1.0): number {
  const charCount = text.length;
  return (charCount / CHARS_PER_SECOND) / speed;
}

/**
 * Calculate cost for TTS generation
 */
export function calculateTTSCost(characterCount: number): number {
  return Math.ceil((characterCount / 1000) * VIDEO_COSTS.TTS_PER_1K_CHARS);
}

/**
 * Generate speech from text using OpenAI TTS
 */
export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const { text, voice, speed = 1.0 } = request;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: voice,
      speed: Math.max(0.25, Math.min(4.0, speed)),
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} - ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const characterCount = text.length;
  const duration = estimateDuration(text, speed);
  const costCents = calculateTTSCost(characterCount);

  return {
    audioBuffer,
    duration,
    characterCount,
    costCents,
  };
}

/**
 * Generate speech with HD quality (higher cost but better quality)
 */
export async function generateSpeechHD(request: TTSRequest): Promise<TTSResponse> {
  const { text, voice, speed = 1.0 } = request;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch(OPENAI_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: voice,
      speed: Math.max(0.25, Math.min(4.0, speed)),
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS HD error: ${response.status} - ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const characterCount = text.length;
  const duration = estimateDuration(text, speed);
  // HD costs 2x standard
  const costCents = calculateTTSCost(characterCount) * 2;

  return {
    audioBuffer,
    duration,
    characterCount,
    costCents,
  };
}

/**
 * Split script into segments for caption timing
 * Uses punctuation and pauses to create natural breaks
 */
export function segmentScript(text: string, totalDuration: number): ScriptSegment[] {
  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  const segments: ScriptSegment[] = [];
  
  const totalChars = text.length;
  let currentTime = 0;
  
  for (const sentence of sentences) {
    const sentenceChars = sentence.length;
    const sentenceDuration = (sentenceChars / totalChars) * totalDuration;
    
    // Further split long sentences into phrases
    const phrases = splitIntoPhrases(sentence);
    const phraseDuration = sentenceDuration / phrases.length;
    
    for (const phrase of phrases) {
      segments.push({
        text: phrase.trim(),
        startTime: currentTime,
        endTime: currentTime + phraseDuration,
        emphasis: detectEmphasis(phrase),
      });
      currentTime += phraseDuration;
    }
  }
  
  return segments;
}

/**
 * Split a sentence into shorter phrases for captions
 */
function splitIntoPhrases(sentence: string): string[] {
  const phrases: string[] = [];
  const words = sentence.split(' ');
  
  let currentPhrase = '';
  const maxWordsPerPhrase = 6;
  
  for (const word of words) {
    if (currentPhrase.split(' ').length >= maxWordsPerPhrase) {
      phrases.push(currentPhrase.trim());
      currentPhrase = word;
    } else {
      currentPhrase += (currentPhrase ? ' ' : '') + word;
    }
    
    // Break on commas and other punctuation
    if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
      phrases.push(currentPhrase.trim());
      currentPhrase = '';
    }
  }
  
  if (currentPhrase.trim()) {
    phrases.push(currentPhrase.trim());
  }
  
  return phrases.filter(p => p.length > 0);
}

/**
 * Detect emphasis based on text content
 */
function detectEmphasis(text: string): 'normal' | 'strong' | 'soft' {
  const upperCaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  
  if (text.includes('!') || upperCaseRatio > 0.3) {
    return 'strong';
  }
  
  if (text.endsWith('...') || text.includes('(') || text.includes(')')) {
    return 'soft';
  }
  
  return 'normal';
}

/**
 * Voice characteristics for UI display
 */
export const VOICE_INFO: Record<VoiceId, { name: string; description: string; gender: 'male' | 'female' | 'neutral' }> = {
  alloy: { name: 'Alloy', description: 'Balanced and versatile', gender: 'neutral' },
  echo: { name: 'Echo', description: 'Clear and resonant', gender: 'male' },
  fable: { name: 'Fable', description: 'Warm and expressive', gender: 'neutral' },
  onyx: { name: 'Onyx', description: 'Deep and authoritative', gender: 'male' },
  nova: { name: 'Nova', description: 'Friendly and upbeat', gender: 'female' },
  shimmer: { name: 'Shimmer', description: 'Soft and professional', gender: 'female' },
};















