import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for video processing

interface StitchRequest {
  projectId: string;
  scenes: {
    videoUrl: string;
    startTime: number;
    duration: number;
  }[];
  audioUrl?: string;
  totalDuration: number;
}

/**
 * Video Stitching API
 * 
 * Options for processing:
 * 1. FFmpeg via RunPod serverless endpoint
 * 2. Browser-based using ffmpeg.wasm (client-side)
 * 3. Cloud video API (Shotstack, Creatomate, etc.)
 * 
 * This implementation provides multiple approaches based on availability.
 */

// RunPod FFmpeg endpoint (if configured)
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const FFMPEG_ENDPOINT_ID = process.env.FFMPEG_ENDPOINT_ID;

export async function POST(request: NextRequest) {
  try {
    const body: StitchRequest = await request.json();
    const { projectId, scenes, audioUrl, totalDuration } = body;

    if (!scenes || scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes provided' },
        { status: 400 }
      );
    }

    // Sort scenes by start time
    const sortedScenes = [...scenes].sort((a, b) => a.startTime - b.startTime);

    // Approach 1: Use RunPod FFmpeg endpoint if available
    if (RUNPOD_API_KEY && FFMPEG_ENDPOINT_ID) {
      const result = await stitchWithRunPod(projectId, sortedScenes, audioUrl, totalDuration);
      return NextResponse.json(result);
    }

    // Approach 2: Use fal.ai video operations if available
    const falKey = process.env.FAL_API_KEY;
    if (falKey) {
      const result = await stitchWithFal(projectId, sortedScenes, audioUrl);
      return NextResponse.json(result);
    }

    // Approach 3: Return instructions for client-side processing
    // This provides the ffmpeg command for local processing
    const ffmpegCommand = generateFFmpegCommand(sortedScenes, audioUrl, totalDuration);
    
    return NextResponse.json({
      status: 'manual_required',
      message: 'No automated stitching service configured. Use the command below locally.',
      ffmpegCommand,
      scenes: sortedScenes,
      // Also provide a simple web-based option
      webOption: {
        tool: 'https://www.kapwing.com/tools/merge-video',
        instructions: 'Upload your clips in order and add your audio track',
      },
    });

  } catch (error) {
    console.error('Video stitching error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stitching failed' },
      { status: 500 }
    );
  }
}

/**
 * Stitch videos using RunPod serverless FFmpeg endpoint
 */
async function stitchWithRunPod(
  projectId: string,
  scenes: StitchRequest['scenes'],
  audioUrl?: string,
  totalDuration?: number
): Promise<{ jobId: string; status: string }> {
  const ffmpegCommand = generateFFmpegCommand(scenes, audioUrl, totalDuration);
  
  const response = await fetch(`https://api.runpod.ai/v2/${FFMPEG_ENDPOINT_ID}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        command: ffmpegCommand,
        video_urls: scenes.map(s => s.videoUrl),
        audio_url: audioUrl,
        output_filename: `${projectId}_final.mp4`,
      },
    }),
  });

  const data = await response.json();
  
  return {
    jobId: data.id,
    status: 'processing',
  };
}

/**
 * Stitch videos using fal.ai video operations
 * Note: fal.ai may have limited video stitching capabilities
 */
async function stitchWithFal(
  projectId: string,
  scenes: StitchRequest['scenes'],
  audioUrl?: string
): Promise<{ status: string; videoUrl?: string; message?: string }> {
  // fal.ai doesn't have native video stitching, but we can use their infrastructure
  // For now, return a message about the limitation
  return {
    status: 'not_available',
    message: 'Video stitching requires FFmpeg. Consider using RunPod or local processing.',
  };
}

/**
 * Generate FFmpeg command for video stitching
 */
function generateFFmpegCommand(
  scenes: StitchRequest['scenes'],
  audioUrl?: string,
  totalDuration?: number
): string {
  // Create concat file content
  const concatList = scenes.map((scene, i) => `file 'input_${i}.mp4'`).join('\n');
  
  // Basic FFmpeg concat command
  let command = `# Create a file list (concat.txt) with this content:\n${concatList}\n\n`;
  
  command += '# Download videos first:\n';
  scenes.forEach((scene, i) => {
    command += `curl -o input_${i}.mp4 "${scene.videoUrl}"\n`;
  });
  
  command += '\n# Concatenate videos:\n';
  command += 'ffmpeg -f concat -safe 0 -i concat.txt -c copy temp_video.mp4\n';
  
  if (audioUrl) {
    command += '\n# Download audio:\n';
    command += `curl -o audio.mp3 "${audioUrl}"\n`;
    command += '\n# Merge with audio (replace video audio with song):\n';
    command += 'ffmpeg -i temp_video.mp4 -i audio.mp3 -c:v copy -map 0:v:0 -map 1:a:0 -shortest final_video.mp4\n';
  } else {
    command += '\n# Rename to final:\n';
    command += 'mv temp_video.mp4 final_video.mp4\n';
  }
  
  return command;
}

/**
 * Check status of a stitching job
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  // Check RunPod job status
  if (RUNPOD_API_KEY && FFMPEG_ENDPOINT_ID) {
    try {
      const response = await fetch(`https://api.runpod.ai/v2/${FFMPEG_ENDPOINT_ID}/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${RUNPOD_API_KEY}`,
        },
      });

      const data = await response.json();
      
      return NextResponse.json({
        status: data.status === 'COMPLETED' ? 'completed' : 
                data.status === 'FAILED' ? 'failed' : 'processing',
        videoUrl: data.output?.video_url,
        error: data.error,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'No processing service configured' }, { status: 400 });
}
