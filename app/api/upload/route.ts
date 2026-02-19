import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BUCKET_NAME = 'spacebaddie-uploads';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function ensureBucket(supabase: ReturnType<typeof createClient>) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.find((b) => b.name === BUCKET_NAME);
    
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
    }
  } catch (error) {
    console.error('[Upload] Bucket check failed:', error);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Storage not configured' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isImage && !isVideo && !isAudio) {
      return NextResponse.json(
        { error: 'Only images, videos, and audio files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    // Ensure bucket exists
    await ensureBucket(supabase);

    // Generate unique filename
    const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : isAudio ? 'mp3' : 'png');
    const folder = isVideo ? 'videos' : isAudio ? 'audio' : 'images';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

    // Upload file
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload] Upload failed:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path: fileName,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
