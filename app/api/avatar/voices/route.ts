/**
 * Voice Profiles API - /api/avatar/voices
 * 
 * Create and manage voice profiles for avatar generation.
 * Requires audio samples (10-30 seconds each) to clone a voice.
 */

import { NextResponse } from 'next/server';
import { CreateVoiceRequest } from '@/lib/avatar/types';
import { createVoiceProfile, listVoiceProfiles } from '@/lib/avatar/worker-client';
import { emitSignal } from '@/lib/uoi/signals';

export async function POST(req: Request) {
  try {
    const body: CreateVoiceRequest = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Validate
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!body.samples || !Array.isArray(body.samples) || body.samples.length === 0) {
      return NextResponse.json(
        { error: 'At least one audio sample is required' },
        { status: 400 }
      );
    }

    if (body.samples.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 audio samples allowed' },
        { status: 400 }
      );
    }

    // Validate samples are base64
    for (let i = 0; i < body.samples.length; i++) {
      const sample = body.samples[i];
      if (typeof sample !== 'string' || sample.length < 100) {
        return NextResponse.json(
          { error: `Invalid sample at index ${i}. Must be base64 encoded audio.` },
          { status: 400 }
        );
      }
    }

    // Create voice profile on worker
    const result = await createVoiceProfile(tenantId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create voice profile' },
        { status: 500 }
      );
    }

    // Emit signal
    emitSignal({
      source: 'avatar_api',
      type: 'voice_profile_created',
      payload: {
        voiceId: result.data?.id,
        tenantId,
        name: body.name,
        sampleCount: body.samples.length,
      },
      priority: 'medium',
    });

    return NextResponse.json({
      success: true,
      voice: result.data,
      message: 'Voice profile created successfully. You can now use this voiceId in avatar generation.',
    });

  } catch (error) {
    console.error('[Voices API] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Default AI voices available for all users
const DEFAULT_VOICES = [
  {
    id: 'voice_natural_female_1',
    name: 'Emily',
    gender: 'Female',
    accent: 'American',
    description: 'Warm and conversational',
  },
  {
    id: 'voice_natural_male_1',
    name: 'David',
    gender: 'Male',
    accent: 'American',
    description: 'Clear and professional',
  },
  {
    id: 'voice_energetic_female_1',
    name: 'Sophia',
    gender: 'Female',
    accent: 'American',
    description: 'Upbeat and engaging',
  },
  {
    id: 'voice_energetic_male_1',
    name: 'Marcus',
    gender: 'Male',
    accent: 'American',
    description: 'Dynamic and enthusiastic',
  },
  {
    id: 'voice_professional_female_1',
    name: 'Victoria',
    gender: 'Female',
    accent: 'British',
    description: 'Polished and authoritative',
  },
  {
    id: 'voice_professional_male_1',
    name: 'James',
    gender: 'Male',
    accent: 'British',
    description: 'Confident and refined',
  },
  {
    id: 'voice_friendly_female_1',
    name: 'Mia',
    gender: 'Female',
    accent: 'Australian',
    description: 'Warm and approachable',
  },
  {
    id: 'voice_friendly_male_1',
    name: 'Liam',
    gender: 'Male',
    accent: 'Australian',
    description: 'Casual and friendly',
  },
];

export async function GET() {
  try {
    // Try to get custom voices from worker first
    const result = await listVoiceProfiles();
    
    // Combine custom voices with defaults
    const customVoices = result.success && result.data ? result.data : [];
    const allVoices = [...customVoices, ...DEFAULT_VOICES];

    return NextResponse.json({
      success: true,
      voices: allVoices,
      count: allVoices.length,
      hasCustomVoices: customVoices.length > 0,
    });

  } catch (error) {
    console.error('[Voices API] List error:', error);
    // Even on error, return default voices
    return NextResponse.json({
      success: true,
      voices: DEFAULT_VOICES,
      count: DEFAULT_VOICES.length,
      hasCustomVoices: false,
    });
  }
}















