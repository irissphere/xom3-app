import React, { useState, useEffect, useCallback } from 'react';
import { Xom3MasterData } from '../../useXom3MasterData';
import { AvatarJob, FaceProfile, VoiceProfile, AVATAR_COSTS } from '../../../../lib/avatar/types';

// Camera and visual control interfaces
interface CameraSettings {
  pan: number;    // -180 to 180 degrees
  tilt: number;   // -90 to 90 degrees
  zoom: number;   // 0.5 to 3.0
  orbit: number;  // 0 to 360 degrees
}

interface VisualSettings {
  brightness: number;  // 0.5 to 1.5
  contrast: number;    // 0.5 to 1.5
  saturation: number;  // 0.5 to 1.5
  temperature: number; // 4000K to 8000K
}

interface AvatarSettings {
  emotion: 'neutral' | 'confident' | 'friendly' | 'professional';
  gestureIntensity: number; // 0.0 to 1.0
  speakingStyle: 'natural' | 'formal' | 'enthusiastic' | 'calm';
}

// Premium lens and effect packages
interface LensPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  effects: {
    vignette: number;
    grain: number;
    sharpness: number;
    bloom: boolean;
    chromaticAberration: boolean;
    colorGrading: string;
  };
}

// Controller themes
interface ControllerTheme {
  id: string;
  name: string;
  price: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  icons: string;
  animations: string;
  brand?: string; // For advertiser themes
}

// Project management
interface Project {
  id: string;
  name: string;
  videos: AvatarJob[];
  theme: string;
  settings: {
    camera: CameraSettings;
    visual: VisualSettings;
    avatar: AvatarSettings;
  };
}

export default function AvatarVideoPanel({ data }: { data?: Xom3MasterData }) {
  // Available controller themes
  const controllerThemes: ControllerTheme[] = [
    {
      id: 'default',
      name: 'Professional',
      price: 0,
      colors: { primary: '#6366f1', secondary: '#a855f7', accent: '#06b6d4', background: '#0f172a' },
      icons: 'minimal',
      animations: 'smooth'
    },
    {
      id: 'starry',
      name: 'Starry Night',
      price: 4.99,
      colors: { primary: '#1e1b4b', secondary: '#312e81', accent: '#fbbf24', background: '#0c0a09' },
      icons: 'stars',
      animations: 'twinkle'
    },
    {
      id: 'cyber',
      name: 'Cyber Punk',
      price: 4.99,
      colors: { primary: '#7c3aed', secondary: '#dc2626', accent: '#00ff88', background: '#000000' },
      icons: 'neon',
      animations: 'glitch'
    },
    {
      id: 'gaming',
      name: 'Gaming Pro',
      price: 4.99,
      colors: { primary: '#16a34a', secondary: '#dc2626', accent: '#f59e0b', background: '#1f2937' },
      icons: 'gamepad',
      animations: 'bounce'
    }
  ];

  // Available lens packages
  const lensPackages: LensPackage[] = [
    {
      id: 'basic',
      name: 'Basic Lens',
      description: 'Standard video processing',
      price: 0,
      effects: { vignette: 0, grain: 0, sharpness: 1, bloom: false, chromaticAberration: false, colorGrading: 'none' }
    },
    {
      id: 'cinematic',
      name: 'Cinematic Pro',
      description: 'Hollywood-style post-processing',
      price: 9.99,
      effects: { vignette: 0.3, grain: 0.1, sharpness: 1.2, bloom: true, chromaticAberration: false, colorGrading: 'film' }
    },
    {
      id: 'vintage',
      name: 'Vintage Film',
      description: 'Retro film look with grain',
      price: 7.99,
      effects: { vignette: 0.4, grain: 0.3, sharpness: 0.9, bloom: false, chromaticAberration: true, colorGrading: 'sepia' }
    },
    {
      id: 'anime',
      name: 'Anime Style',
      description: 'Cel-shaded with vibrant colors',
      price: 6.99,
      effects: { vignette: 0.1, grain: 0, sharpness: 1.5, bloom: true, chromaticAberration: false, colorGrading: 'vibrant' }
    }
  ];

  const [script, setScript] = useState('');
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [faces, setFaces] = useState<FaceProfile[]>([]);
  const [jobs, setJobs] = useState<AvatarJob[]>([]);

  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedFace, setSelectedFace] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New interactive controls state
  const [camera, setCamera] = useState<CameraSettings>({
    pan: 0,
    tilt: 0,
    zoom: 1.0,
    orbit: 0
  });

  const [visual, setVisual] = useState<VisualSettings>({
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    temperature: 5500
  });

  const [avatar, setAvatar] = useState<AvatarSettings>({
    emotion: 'confident',
    gestureIntensity: 0.7,
    speakingStyle: 'natural'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [smartSuggestion, setSmartSuggestion] = useState<string>('');

  // New premium features state
  const [selectedTheme, setSelectedTheme] = useState<string>('default');
  const [selectedLensPackage, setSelectedLensPackage] = useState<string>('basic');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [socialPostsToday, setSocialPostsToday] = useState<number>(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const fetchMetadata = useCallback(async () => {
    try {
      const [voicesRes, facesRes] = await Promise.all([
        fetch('/api/avatar/voices'),
        fetch('/api/avatar/faces')
      ]);
      
      const voicesJson = await voicesRes.json();
      const facesJson = await facesRes.json();
      
      if (voicesJson.success) {
        setVoices(voicesJson.voices);
        if (voicesJson.voices.length > 0) setSelectedVoice(voicesJson.voices[0].id);
      }
      
      if (facesJson.success) {
        setFaces(facesJson.faces);
        if (facesJson.faces.length > 0) setSelectedFace(facesJson.faces[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch avatar metadata:', err);
      setError('Service connection degraded');
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/avatar/status?list=true');
      const json = await res.json();
      if (json.success) {
        setJobs(json.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch avatar jobs:', err);
    }
  }, []);

  // Smart suggestion generator
  useEffect(() => {
    const generateSuggestion = () => {
      const suggestions = [];

      // Camera suggestions
      if (Math.abs(camera.pan) > 20 || Math.abs(camera.tilt) > 15) {
        suggestions.push("Camera positioned for intimate, personal connection - perfect for coaching or testimonials");
      } else if (camera.zoom > 1.5) {
        suggestions.push("Close-up shot creates focus and intensity - great for dramatic presentations");
      } else if (camera.orbit > 0) {
        suggestions.push("Dynamic camera movement adds energy and engagement");
      }

      // Visual suggestions
      if (visual.brightness > 1.2) {
        suggestions.push("Bright, energetic lighting enhances approachability");
      } else if (visual.contrast > 1.2) {
        suggestions.push("High contrast creates professional, polished look");
      }

      // Avatar suggestions
      if (avatar.emotion === 'confident') {
        suggestions.push("Confident expression builds trust and authority");
      } else if (avatar.speakingStyle === 'enthusiastic') {
        suggestions.push("Enthusiastic delivery increases viewer engagement");
      }

      setSmartSuggestion(suggestions[0] || "Standard professional presentation setup");
    };

    generateSuggestion();
  }, [camera, visual, avatar]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMetadata(), fetchJobs()]);
      setLoading(false);
    };
    init();

    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, [fetchMetadata, fetchJobs]);

  const handleGenerate = async () => {
    if (!script || !selectedVoice || !selectedFace) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          voiceId: selectedVoice,
          faceId: selectedFace,
          aspectRatio,
          style: 'social',
          enhanceFace: true,
          // New interactive controls
          camera,
          visual,
          avatar,
          // Premium features
          theme: selectedTheme,
          lensPackage: selectedLensPackage,
          projectId: currentProject?.id
        })
      });

      const json = await res.json();
      if (json.success) {
        setScript('');
        fetchJobs();

        // Save to current project if one exists
        if (currentProject) {
          const newJob: AvatarJob = {
            id: json.jobId,
            tenantId: 'demo-user',
            status: 'cloning_voice',
            progress: 0,
            script,
            voiceId: 'default',
            faceId: 'default',
            style: 'professional',
            aspectRatio: '16:9',
            enhanceFace: false,
            videoUrl: '',
            thumbnailUrl: '',
            costCents: 75,
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          setProjects(prev => prev.map(p =>
            p.id === currentProject.id
              ? { ...p, videos: [...p.videos, newJob] }
              : p
          ));

          // Update current project reference
          setCurrentProject(prev => prev ? {
            ...prev,
            videos: [...prev.videos, newJob]
          } : null);
        }
      } else {
        setError(json.error || 'Failed to start generation');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  const estimatedCost = (AVATAR_COSTS.USER_CHARGE / 100).toFixed(2);

  return (
    <div className="xom3-panel h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -translate-x-1/2" />

      <div className="xom3-panel-header relative z-10">
        <div>
          <div className="xom3-panel-title flex items-center gap-2">
            <span>Avatar Studio</span>
            <span className="xom3-badge xom3-badge-info">AI</span>
          </div>
          <div className="xom3-panel-subtitle">Generate realistic talking head videos.</div>
        </div>
        <div className="text-right">
             <button 
                className="xom3-btn xom3-btnPrimary disabled:opacity-50"
                disabled={isGenerating || !script || voices.length === 0 || faces.length === 0}
                onClick={handleGenerate}
             >
                <span>{isGenerating ? 'Initializing...' : `Generate ($${estimatedCost})`}</span>
                {!isGenerating && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
             </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 overflow-y-auto">
        
        {/* Creation Form */}
        <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            
            {/* Script Input */}
            <div className="space-y-2">
                <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Script</label>
                <textarea 
                    className="xom3-input h-32 py-2 resize-none" 
                    placeholder="Enter what the avatar should say..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                />
                <div className="text-right text-xs text-[var(--text-2)]">{script.length} characters</div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Face</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {faces.length === 0 && !loading && (
                          <div className="text-xs text-[var(--text-2)] italic">No face profiles found</div>
                        )}
                        {faces.map(face => (
                            <div 
                                key={face.id}
                                onClick={() => setSelectedFace(face.id)}
                                className={`p-2 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                                    selectedFace === face.id 
                                    ? 'bg-[var(--surface-2)] border-violet-500/50' 
                                    : 'border-[var(--border-0)] hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                                    <img src={face.imageUrl || '/avatars/placeholder.jpg'} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="text-sm font-medium text-[var(--text-1)] truncate">{face.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Voice</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {voices.length === 0 && !loading && (
                          <div className="text-xs text-[var(--text-2)] italic">No voice profiles found</div>
                        )}
                        {voices.map(voice => (
                            <div 
                                key={voice.id}
                                onClick={() => setSelectedVoice(voice.id)}
                                className={`p-2 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${
                                    selectedVoice === voice.id 
                                    ? 'bg-[var(--surface-2)] border-violet-500/50' 
                                    : 'border-[var(--border-0)] hover:bg-[rgba(255,255,255,0.03)]'
                                }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-violet-900/30 flex items-center justify-center text-violet-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="text-sm font-medium text-[var(--text-1)] truncate">{voice.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
                 <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Format</label>
                 <div className="flex gap-2">
                     <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                            aspectRatio === '16:9' ? 'bg-[var(--surface-2)] border-white/20 text-white' : 'border-transparent text-[var(--text-2)] hover:text-white'
                        }`}
                     >
                         16:9 Landscape
                     </button>
                     <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                            aspectRatio === '9:16' ? 'bg-[var(--surface-2)] border-white/20 text-white' : 'border-transparent text-[var(--text-2)] hover:text-white'
                        }`}
                     >
                         9:16 Vertical
                     </button>
                 </div>
            </div>

            {/* Theme and Lens Package Selection */}
            <div className="grid grid-cols-2 gap-4">
                {/* Controller Theme */}
                <div className="space-y-2">
                    <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                        🎨 Controller Theme
                        {selectedTheme !== 'default' && <span className="text-emerald-400 text-xs">Premium</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {controllerThemes.map(theme => (
                            <button
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                                    selectedTheme === theme.id
                                        ? 'border-violet-500/50 bg-violet-500/10 text-violet-400'
                                        : 'border-slate-600/50 bg-slate-800/50 text-slate-400 hover:border-slate-500/50'
                                }`}
                            >
                                <div className="truncate">{theme.name}</div>
                                {theme.price > 0 && <div className="text-emerald-400">${theme.price}</div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lens Package */}
                <div className="space-y-2">
                    <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                        📸 Lens Package
                        {selectedLensPackage !== 'basic' && <span className="text-emerald-400 text-xs">Premium</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {lensPackages.map(lens => (
                            <button
                                key={lens.id}
                                onClick={() => setSelectedLensPackage(lens.id)}
                                className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                                    selectedLensPackage === lens.id
                                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                                        : 'border-slate-600/50 bg-slate-800/50 text-slate-400 hover:border-slate-500/50'
                                }`}
                            >
                                <div className="truncate">{lens.name}</div>
                                {lens.price > 0 && <div className="text-emerald-400">${lens.price}</div>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Project Management */}
            <div className="space-y-2">
                <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">📁 Project</label>
                <div className="flex gap-2">
                    <select
                        value={currentProject?.id || ''}
                        onChange={(e) => {
                            const projectId = e.target.value;
                            const project = projects.find(p => p.id === projectId);
                            setCurrentProject(project || null);
                            if (project) {
                                // Load project settings
                                setCamera(project.settings.camera);
                                setVisual(project.settings.visual);
                                setAvatar(project.settings.avatar);
                                setSelectedTheme(project.theme);
                            }
                        }}
                        className="flex-1 xom3-input text-sm"
                    >
                        <option value="">No Project</option>
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            const projectName = prompt('Enter project name:');
                            if (projectName) {
                                const newProject: Project = {
                                    id: `project_${Date.now()}`,
                                    name: projectName,
                                    videos: [],
                                    theme: selectedTheme,
                                    settings: { camera, visual, avatar }
                                };
                                setProjects(prev => [...prev, newProject]);
                                setCurrentProject(newProject);
                            }
                        }}
                        className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium"
                    >
                        New
                    </button>
                </div>
            </div>

            {/* Interactive Controls Toggle */}
            <div className="space-y-2">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-colors flex items-center justify-between"
                >
                    <span className="text-sm font-medium text-violet-400">🎮 Advanced Controls</span>
                    <svg
                        className={`w-4 h-4 text-violet-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Advanced Interactive Controls */}
            {showAdvanced && (
                <div className="space-y-6 p-4 rounded-lg bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50">

                    {/* Camera Controls */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-cyan-400">📹</span>
                            <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Camera Controls</label>
                        </div>

                        {/* Joystick Visualization */}
                        <div className="flex justify-center">
                            <div className="relative w-32 h-32 bg-slate-800/50 rounded-full border border-slate-600/50">
                                <div
                                    className="absolute w-4 h-4 bg-cyan-400 rounded-full transform -translate-x-2 -translate-y-2 transition-all duration-200 cursor-pointer"
                                    style={{
                                        left: `${50 + (camera.pan / 180) * 40}%`,
                                        top: `${50 + (camera.tilt / 90) * 40}%`
                                    }}
                                    onMouseDown={(e) => {
                                        const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                                        const centerX = rect.left + rect.width / 2;
                                        const centerY = rect.top + rect.height / 2;

                                        const handleMouseMove = (e: MouseEvent) => {
                                            const deltaX = e.clientX - centerX;
                                            const deltaY = e.clientY - centerY;
                                            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                                            const maxDistance = 40;

                                            const clampedDistance = Math.min(distance, maxDistance);
                                            const angle = Math.atan2(deltaY, deltaX);

                                            const pan = (clampedDistance / maxDistance) * 45 * Math.cos(angle);
                                            const tilt = (clampedDistance / maxDistance) * 30 * Math.sin(angle);

                                            setCamera(prev => ({
                                                ...prev,
                                                pan: Math.round(pan),
                                                tilt: Math.round(tilt)
                                            }));
                                        };

                                        const handleMouseUp = () => {
                                            document.removeEventListener('mousemove', handleMouseMove);
                                            document.removeEventListener('mouseup', handleMouseUp);
                                        };

                                        document.addEventListener('mousemove', handleMouseMove);
                                        document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 pointer-events-none">
                                    Drag to adjust
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Pan: {camera.pan}°</label>
                                <input
                                    type="range"
                                    min="-45"
                                    max="45"
                                    value={camera.pan}
                                    onChange={(e) => setCamera(prev => ({ ...prev, pan: parseInt(e.target.value) }))}
                                    className="w-full accent-cyan-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Tilt: {camera.tilt}°</label>
                                <input
                                    type="range"
                                    min="-30"
                                    max="30"
                                    value={camera.tilt}
                                    onChange={(e) => setCamera(prev => ({ ...prev, tilt: parseInt(e.target.value) }))}
                                    className="w-full accent-cyan-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Zoom: {camera.zoom.toFixed(1)}x</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3.0"
                                    step="0.1"
                                    value={camera.zoom}
                                    onChange={(e) => setCamera(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                                    className="w-full accent-cyan-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Orbit: {camera.orbit}°</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={camera.orbit}
                                    onChange={(e) => setCamera(prev => ({ ...prev, orbit: parseInt(e.target.value) }))}
                                    className="w-full accent-cyan-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Visual Controls */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-400">🎨</span>
                            <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Visual Adjustments</label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Brightness: {visual.brightness.toFixed(1)}</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.1"
                                    value={visual.brightness}
                                    onChange={(e) => setVisual(prev => ({ ...prev, brightness: parseFloat(e.target.value) }))}
                                    className="w-full accent-amber-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Contrast: {visual.contrast.toFixed(1)}</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.1"
                                    value={visual.contrast}
                                    onChange={(e) => setVisual(prev => ({ ...prev, contrast: parseFloat(e.target.value) }))}
                                    className="w-full accent-amber-400"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Saturation: {visual.saturation.toFixed(1)}</label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.1"
                                    value={visual.saturation}
                                    onChange={(e) => setVisual(prev => ({ ...prev, saturation: parseFloat(e.target.value) }))}
                                    className="w-full accent-amber-400"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400">Temperature: {visual.temperature}K</label>
                                <input
                                    type="range"
                                    min="4000"
                                    max="8000"
                                    step="100"
                                    value={visual.temperature}
                                    onChange={(e) => setVisual(prev => ({ ...prev, temperature: parseInt(e.target.value) }))}
                                    className="w-full accent-amber-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Avatar Controls */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-400">🎭</span>
                            <label className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">Avatar Expression</label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Emotion Style</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['neutral', 'confident', 'friendly', 'professional'].map(emotion => (
                                    <button
                                        key={emotion}
                                        onClick={() => setAvatar(prev => ({ ...prev, emotion: emotion as any }))}
                                        className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                                            avatar.emotion === emotion
                                                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                                                : 'bg-slate-800/50 border border-slate-600/50 text-slate-400 hover:border-slate-500/50'
                                        }`}
                                    >
                                        {emotion}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">Gesture Intensity: {avatar.gestureIntensity.toFixed(1)}</label>
                            <input
                                type="range"
                                min="0.0"
                                max="1.0"
                                step="0.1"
                                value={avatar.gestureIntensity}
                                onChange={(e) => setAvatar(prev => ({ ...prev, gestureIntensity: parseFloat(e.target.value) }))}
                                className="w-full accent-emerald-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-400">Speaking Style</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['natural', 'formal', 'enthusiastic', 'calm'].map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setAvatar(prev => ({ ...prev, speakingStyle: style as any }))}
                                        className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                                            avatar.speakingStyle === style
                                                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                                                : 'bg-slate-800/50 border border-slate-600/50 text-slate-400 hover:border-slate-500/50'
                                        }`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Smart Suggestion */}
                    <div className="p-3 rounded-lg bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
                        <div className="flex items-start gap-2">
                            <span className="text-violet-400 text-sm">💡</span>
                            <div>
                                <div className="text-xs font-medium text-violet-400 mb-1">Smart Suggestion</div>
                                <div className="text-sm text-slate-300">{smartSuggestion}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>

        {/* Social Media Posting & Project Suggestions */}
        <div className="border-t border-[var(--border-0)] pt-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">📱 Social Posting</div>
                    <div className="text-sm text-[var(--text-1)]">{socialPostsToday}/3 posts used today</div>
                </div>
                {socialPostsToday >= 3 && (
                    <button
                        onClick={() => setShowUpgradePrompt(true)}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold rounded-full hover:shadow-lg transition-all"
                    >
                        Upgrade for More Posts
                    </button>
                )}
            </div>

            {currentProject && currentProject.videos.length > 0 && (
                <div className="space-y-2">
                    <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold">💡 Project Suggestions</div>
                    <div className="bg-slate-800/30 rounded-lg p-3">
                        <div className="text-sm text-slate-300 mb-2">Based on your project "{currentProject.name}":</div>
                        <div className="space-y-1 text-xs text-slate-400">
                            <div>• Follow-up video: "Implementation tips"</div>
                            <div>• Series continuation: "Advanced techniques"</div>
                            <div>• Q&A response: "Common questions answered"</div>
                        </div>
                        <button
                            onClick={() => setShowUpgradePrompt(true)}
                            className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline"
                        >
                            Unlock automated suggestions →
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Recent Jobs / Preview */}
        <div className="border-l border-[var(--border-0)] pl-6 space-y-4 overflow-y-auto">
             <div className="text-[var(--text-2)] text-xs uppercase tracking-wider font-semibold mb-4">Recent Generations</div>
             <div className="space-y-3 pb-4">
                 {jobs.length === 0 && !loading && (
                   <div className="text-sm text-[var(--text-2)] py-8 text-center italic">No generation history</div>
                 )}
                 {jobs.map(job => (
                     <div key={job.id} className="bg-[var(--surface-1)] border border-[var(--border-0)] rounded-lg p-3 hover:bg-[var(--surface-2)] transition-colors">
                         <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${
                                    job.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                                    job.status === 'failed' ? 'bg-red-500' : 
                                    'bg-amber-500 animate-pulse'
                                }`} />
                                <span className="text-sm font-medium text-white capitalize">{job.status.replace('_', ' ')}</span>
                             </div>
                             <span className="text-xs text-[var(--text-2)]">{new Date(job.createdAt).toLocaleDateString()}</span>
                         </div>
                         <p className="text-xs text-[var(--text-2)] line-clamp-2 mb-3">&ldquo;{job.script}&rdquo;</p>
                         
                         {job.status === 'completed' ? (
                             <a 
                                href={job.videoUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                 </svg>
                                 Play Video
                             </a>
                         ) : (
                             <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                 <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${job.progress}%` }} />
                             </div>
                         )}
                     </div>
                 ))}
             </div>
        </div>

      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🚀 Unlock Premium Features</h3>
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>📱</span>
                  <span className="font-medium">Unlimited Social Posts</span>
                </div>
                <div className="text-sm text-slate-300 ml-6">Post as many times as you want daily</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>🤖</span>
                  <span className="font-medium">AI-Powered Suggestions</span>
                </div>
                <div className="text-sm text-slate-300 ml-6">Get automated video series ideas</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>⚡</span>
                  <span className="font-medium">Priority Processing</span>
                </div>
                <div className="text-sm text-slate-300 ml-6">Faster video generation</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>🎨</span>
                  <span className="font-medium">All Themes & Lenses</span>
                </div>
                <div className="text-sm text-slate-300 ml-6">Access premium controller themes</div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  // Handle upgrade logic here
                  setShowUpgradePrompt(false);
                  alert('Redirecting to upgrade page...');
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Upgrade - $9/mo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


