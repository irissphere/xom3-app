/**
 * Face Profiles API - /api/avatar/faces
 * 
 * Create and manage face profiles for avatar generation.
 * Requires a clear, front-facing photo with good lighting.
 */

import { NextResponse } from 'next/server';
import { CreateFaceRequest } from '@/lib/avatar/types';
import { createFaceProfile, listFaceProfiles } from '@/lib/avatar/worker-client';
import { emitSignal } from '@/lib/uoi/signals';

export async function POST(req: Request) {
  try {
    const body: CreateFaceRequest = await req.json();
    const tenantId = req.headers.get('x-tenant-id') || 'default';

    // Validate
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      );
    }

    if (!body.image || typeof body.image !== 'string') {
      return NextResponse.json(
        { error: 'image is required (base64 encoded)' },
        { status: 400 }
      );
    }

    // Basic validation that it looks like base64
    if (body.image.length < 1000) {
      return NextResponse.json(
        { error: 'Image appears too small. Please provide a clear photo.' },
        { status: 400 }
      );
    }

    // Create face profile on worker
    const result = await createFaceProfile(tenantId, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create face profile' },
        { status: 500 }
      );
    }

    // Emit signal
    emitSignal({
      source: 'avatar_api',
      type: 'face_profile_created',
      payload: {
        faceId: result.data?.id,
        tenantId,
        name: body.name,
      },
      priority: 'medium',
    });

    return NextResponse.json({
      success: true,
      face: result.data,
      message: 'Face profile created successfully. You can now use this faceId in avatar generation.',
      tips: [
        'For best results, use a clear front-facing photo',
        'Good lighting helps the animation look more natural',
        'Neutral expression works best as the base',
      ],
    });

  } catch (error) {
    console.error('[Faces API] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Default AI avatars available for all users
// Higher quality images (512x512) with diverse options
const DEFAULT_FACES = [
  // Professional Category
  {
    id: 'face_professional_woman_1',
    name: 'Sarah',
    category: 'Professional',
    description: 'Corporate executive look',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_professional_man_1',
    name: 'Michael',
    category: 'Professional',
    description: 'Business professional',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_professional_woman_2',
    name: 'Victoria',
    category: 'Professional',
    description: 'Tech industry leader',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_professional_man_2',
    name: 'David',
    category: 'Professional',
    description: 'Finance executive',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Creative Category
  {
    id: 'face_creative_woman_1',
    name: 'Luna',
    category: 'Creative',
    description: 'Artist & designer vibe',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_creative_man_1',
    name: 'Alex',
    category: 'Creative',
    description: 'Musician & content creator',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_creative_woman_2',
    name: 'Aria',
    category: 'Creative',
    description: 'Fashion influencer',
    imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_creative_man_2',
    name: 'Marcus',
    category: 'Creative',
    description: 'Photographer & filmmaker',
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Friendly Category
  {
    id: 'face_friendly_woman_1',
    name: 'Emma',
    category: 'Friendly',
    description: 'Warm & approachable',
    imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_friendly_man_1',
    name: 'James',
    category: 'Friendly',
    description: 'Personable & relatable',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_friendly_woman_2',
    name: 'Sophie',
    category: 'Friendly',
    description: 'Casual & genuine',
    imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_friendly_man_2',
    name: 'Chris',
    category: 'Friendly',
    description: 'Next-door neighbor vibe',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Energetic Category
  {
    id: 'face_energetic_woman_1',
    name: 'Zara',
    category: 'Energetic',
    description: 'High-energy presenter',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_energetic_man_1',
    name: 'Jordan',
    category: 'Energetic',
    description: 'Dynamic & vibrant',
    imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_energetic_woman_2',
    name: 'Maya',
    category: 'Energetic',
    description: 'Fitness & lifestyle',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_energetic_man_2',
    name: 'Tyler',
    category: 'Energetic',
    description: 'Sports & gaming creator',
    imageUrl: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Diverse & Global Category
  {
    id: 'face_diverse_woman_1',
    name: 'Priya',
    category: 'Global',
    description: 'South Asian professional',
    imageUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_diverse_man_1',
    name: 'Wei',
    category: 'Global',
    description: 'East Asian business style',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_diverse_woman_2',
    name: 'Amara',
    category: 'Global',
    description: 'African contemporary',
    imageUrl: 'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_diverse_man_2',
    name: 'Carlos',
    category: 'Global',
    description: 'Latin American warmth',
    imageUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Mature & Distinguished Category
  {
    id: 'face_mature_woman_1',
    name: 'Eleanor',
    category: 'Distinguished',
    description: 'Senior executive',
    imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_mature_man_1',
    name: 'Richard',
    category: 'Distinguished',
    description: 'Industry veteran',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=512&h=512&fit=crop&crop=face&q=90',
  },
  
  // Youth & Gen-Z Category
  {
    id: 'face_youth_woman_1',
    name: 'Chloe',
    category: 'Gen-Z',
    description: 'TikTok creator style',
    imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=512&h=512&fit=crop&crop=face&q=90',
  },
  {
    id: 'face_youth_man_1',
    name: 'Jake',
    category: 'Gen-Z',
    description: 'Young entrepreneur',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=512&h=512&fit=crop&crop=face&q=90',
  },
];

export async function GET() {
  try {
    // Try to get custom faces from worker first
    const result = await listFaceProfiles();
    
    // Combine custom faces with defaults
    const customFaces = result.success && result.data ? result.data : [];
    const allFaces = [...customFaces, ...DEFAULT_FACES];

    return NextResponse.json({
      success: true,
      faces: allFaces,
      count: allFaces.length,
      hasCustomFaces: customFaces.length > 0,
    });

  } catch (error) {
    console.error('[Faces API] List error:', error);
    // Even on error, return default faces
    return NextResponse.json({
      success: true,
      faces: DEFAULT_FACES,
      count: DEFAULT_FACES.length,
      hasCustomFaces: false,
    });
  }
}















