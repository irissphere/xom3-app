/**
 * Avatar Process API
 * POST /api/avatar/process
 * 
 * Processes avatar video with effects and branding.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, effects, branding } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    }

    const videoWorkerUrl = process.env.NEXT_PUBLIC_VIDEO_WORKER_URL || 'http://localhost:3001';

    try {
      const workerResponse = await fetch(`${videoWorkerUrl}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl,
          effects: {
            brightness: effects?.brightness || 0,
            contrast: effects?.contrast || 0,
            saturation: effects?.saturation || 0,
            vignette: effects?.vignette || 0,
          },
          branding: {
            logo: branding?.logo || '/spacebaddie-logo.svg',
            watermark: branding?.watermark ?? true,
            position: branding?.position || 'bottom-right',
          },
        }),
      });

      if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        console.error('Video worker error:', errorText);
        return NextResponse.json(
          { error: 'Video processing failed', details: errorText },
          { status: workerResponse.status }
        );
      }

      const result = await workerResponse.json();
      
      return NextResponse.json({
        success: true,
        jobId: result.jobId,
        processedUrl: result.outputUrl,
        status: result.status,
      });
    } catch (fetchError) {
      console.error('Failed to connect to video worker:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to video worker', details: String(fetchError) },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('Avatar process error:', error);
    return NextResponse.json(
      { error: 'Failed to process avatar video', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
