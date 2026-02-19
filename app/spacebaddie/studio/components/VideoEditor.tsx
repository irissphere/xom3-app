'use client';

import { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoClip {
  id: string;
  url: string;
  duration: number; // in seconds
  thumbnail?: string;
}

interface VideoEditorProps {
  clips: VideoClip[];
  audioUrl?: string | null;
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
}

export default function VideoEditor({ clips, audioUrl, onExport, onClose }: VideoEditorProps) {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing editor...');
  const [timeline, setTimeline] = useState<VideoClip[]>(clips);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const load = async () => {
    setIsLoading(true);
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress, time }) => {
      setProgress(Math.round(progress * 100));
      // Estimate meaningful message from progress
      if (progress < 1) setMessage(`Rendering... ${Math.round(progress * 100)}%`);
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setLoaded(true);
      setIsLoading(false);
      setMessage('Editor Ready');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      setMessage('Failed to load video engine. Please try Chrome or Edge desktop.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleExport = async () => {
    if (!loaded) return;
    const ffmpeg = ffmpegRef.current;
    setIsLoading(true);
    setMessage('Downloading assets...');
    setProgress(0);

    try {
      // 1. Write audio file
      let hasAudio = false;
      if (audioUrl) {
        await ffmpeg.writeFile('audio.mp3', await fetchFile(audioUrl));
        hasAudio = true;
      }

      // 2. Write video files and create concat list
      const fileNames: string[] = [];
      let totalDuration = 0;

      for (let i = 0; i < timeline.length; i++) {
        const clip = timeline[i];
        const fileName = `clip${i}.mp4`;
        await ffmpeg.writeFile(fileName, await fetchFile(clip.url));
        fileNames.push(fileName);
        totalDuration += clip.duration;
      }

      // 3. Create concat input file
      // Format: file 'filename'
      const concatList = fileNames.map(f => `file '${f}'`).join('\n');
      await ffmpeg.writeFile('concat_list.txt', concatList);

      setMessage('Stitching video clips...');

      // 4. Stitch Videos (Re-encoding to ensure compatibility)
      // We scale to 720p to ensure consistency and reasonable speed
      // -safe 0 is required for absolute paths in some envs, but we use relative here
      // -f concat uses the list
      // -c:v libx264 re-encodes to H.264
      // -pix_fmt yuv420p for wide compatibility
      await ffmpeg.exec([
        '-f', 'concat', 
        '-safe', '0', 
        '-i', 'concat_list.txt', 
        '-c:v', 'libx264', 
        '-preset', 'ultrafast', // fast encoding for web
        '-pix_fmt', 'yuv420p', 
        'stitched.mp4'
      ]);

      let finalOutput = 'stitched.mp4';

      // 5. Mix Audio if present
      if (hasAudio) {
        setMessage('Mixing audio...');
        // -stream_loop -1 loops audio if shorter than video? No, let's just cut or pad.
        // -shortest cuts to shortest stream
        // -map 0:v -map 1:a maps video from first input, audio from second
        await ffmpeg.exec([
          '-i', 'stitched.mp4', 
          '-i', 'audio.mp3', 
          '-c:v', 'copy', // Copy video stream (no re-encode)
          '-c:a', 'aac', 
          '-map', '0:v:0', 
          '-map', '1:a:0', 
          '-shortest', // Cut to shortest duration (usually the video)
          'output.mp4'
        ]);
        finalOutput = 'output.mp4';
      }

      setMessage('Finalizing...');
      const data = await ffmpeg.readFile(finalOutput);
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      setPreviewUrl(url);
      if (onExport) onExport(blob);
      
      setMessage('Export Complete!');
    } catch (error) {
      console.error('Export failed:', error);
      setMessage('Export failed. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const moveClip = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= timeline.length) return;
    const newTimeline = [...timeline];
    const [moved] = newTimeline.splice(fromIndex, 1);
    newTimeline.splice(toIndex, 0, moved);
    setTimeline(newTimeline);
  };

  const removeClip = (index: number) => {
    const newTimeline = [...timeline];
    newTimeline.splice(index, 1);
    setTimeline(newTimeline);
  };

  return (
    <div style={{
      background: '#1a1a24',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <h3 style={{ margin: 0, fontWeight: 600, color: '#fff' }}>🎬 Video Editor</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: '#ccc',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={isLoading || !loaded}
            style={{
              padding: '8px 24px',
              background: isLoading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Processing...' : 'Export Video'}
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Preview Player */}
        <div style={{ flex: 2, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {previewUrl ? (
            <video
              ref={videoRef}
              src={previewUrl}
              controls
              style={{ maxHeight: '100%', maxWidth: '100%' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎞️</p>
              <p>{isLoading ? message : 'Preview will appear here after export'}</p>
              {isLoading && (
                <div style={{ 
                  width: '200px', 
                  height: '4px', 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '2px', 
                  margin: '16px auto',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${progress}%`, 
                    height: '100%', 
                    background: '#FF006E',
                    transition: 'width 0.2s' 
                  }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline / Clip List */}
        <div style={{ 
          flex: 1, 
          borderLeft: '1px solid rgba(255,255,255,0.1)', 
          background: 'rgba(255,255,255,0.02)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#ccc' }}>Timeline Clips</h4>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Drag to reorder (WIP)</p>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {timeline.map((clip, index) => (
              <div
                key={clip.id}
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  alignItems: 'center',
                }}
              >
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#888'
                }}>
                  {index + 1}
                </div>
                
                {/* Thumbnail placeholder */}
                <div style={{ 
                  width: '60px', 
                  height: '34px', 
                  background: '#000', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <video src={clip.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Clip {clip.id.slice(0, 6)}
                  </p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>
                    {clip.duration}s
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button 
                    onClick={() => moveClip(index, index - 1)}
                    disabled={index === 0}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888', padding: 0 }}
                  >
                    ▲
                  </button>
                  <button 
                    onClick={() => moveClip(index, index + 1)}
                    disabled={index === timeline.length - 1}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888', padding: 0 }}
                  >
                    ▼
                  </button>
                </div>

                <button
                  onClick={() => removeClip(index)}
                  style={{
                    border: 'none',
                    background: 'rgba(255,59,48,0.1)',
                    color: '#FF3B30',
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Audio Track Info */}
          {audioUrl && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(59,130,246,0.1)', 
              borderTop: '1px solid rgba(59,130,246,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🎵</span>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#3B82F6' }}>Background Music</p>
                  <p style={{ margin: 0, fontSize: '10px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Custom audio loaded
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
