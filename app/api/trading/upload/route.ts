import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Trading Verification Upload API
 * 
 * POST /api/trading/upload
 * Body: FormData with 'file'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Convert file to buffer for storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('trading-verifications')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('[Trading Upload] Storage error:', error);
      return NextResponse.json({ error: 'Failed to upload verification image' }, { status: 500 });
    }

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('trading_verifications')
      .insert({
        user_id: user.id,
        image_path: data.path,
        symbol: 'unknown', // Could be extracted with AI later
        status: 'pending_review'
      });

    if (dbError) {
      console.error('[Trading Upload] DB error:', dbError);
      // Not failing the response since storage succeeded
    }

    return NextResponse.json({
      success: true,
      path: data.path,
      message: 'Verification uploaded successfully'
    });
  } catch (error) {
    console.error('[Trading Upload] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
