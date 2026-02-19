/**
 * List HeyGen Avatars API
 * GET /api/avatar/list
 * 
 * Returns available HeyGen avatars for full-body video generation
 */

import { NextResponse } from 'next/server';
import { listAvatars } from '@/lib/heygen/client';

export async function GET() {
  try {
    const result = await listAvatars();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to list avatars' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      avatars: result.avatars || [],
      count: result.avatars?.length || 0,
    });
  } catch (error) {
    console.error('[Avatar List API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
