'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase/client';
import CinematicControls, { 
  CinematicSettings, 
  getDefaultCinematicSettings 
} from './components/CinematicControls';
import FilmCrewStrip from './components/FilmCrewStrip';
import VideoEditor from './components/VideoEditor';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type StudioStep = 'upload' | 'customize' | 'generate' | 'preview';
type ProjectType = 'single_video' | 'music_video_style' | 'content_series';

interface VideoSettings {
  duration: number;
  voice: string;
  style: string;
  music: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
}

interface UsageInfo {
  videosThisMonth: number;
  creditsBalance: number;
  canCreate: boolean;
  tier: string;
  freeVideosRemaining: number;
}

interface FaceProfile {
  id: string;
  name: string;
  imageUrl?: string;
  category?: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  gender?: string;
  accent?: string;
  preview_url?: string;
}

interface HeyGenAvatar {
  id: string;
  name?: string;
  gender?: string;
  preview_url?: string;
  type?: 'public' | 'instant' | 'photo';
}

interface TimelineClip {
  id: string;
  url: string;
  label: string;
}

const VISITOR_ID_KEY = 'spacebaddie_visitor_id';

// Background Scene Options - Environments for the avatar
interface BackgroundScene {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt: string; // AI prompt to generate/describe the background
  category: 'professional' | 'creative' | 'nature' | 'abstract' | 'custom';
}

const BACKGROUND_SCENES: BackgroundScene[] = [
  // Professional
  { id: 'studio', name: 'Studio', icon: '🎬', description: 'Professional studio setup', prompt: 'professional video studio with soft lighting, neutral gray background, professional equipment visible', category: 'professional' },
  { id: 'office', name: 'Modern Office', icon: '🏢', description: 'Clean corporate look', prompt: 'modern minimalist office, natural lighting through large windows, plants, clean desk setup', category: 'professional' },
  { id: 'home-office', name: 'Home Office', icon: '🏠', description: 'Warm home workspace', prompt: 'cozy home office with bookshelf, warm lighting, plant, modern desk', category: 'professional' },
  { id: 'podcast', name: 'Podcast Studio', icon: '🎙️', description: 'Audio studio vibe', prompt: 'professional podcast studio with microphone, sound panels, warm ambient lighting, headphones', category: 'professional' },
  { id: 'conference', name: 'Conference Room', icon: '👥', description: 'Business meeting style', prompt: 'modern conference room with glass walls, city view, professional furniture', category: 'professional' },
  
  // Creative
  { id: 'neon', name: 'Neon Glow', icon: '🌈', description: 'Vibrant neon lights', prompt: 'dark room with vibrant neon lights, pink and blue glow, cyberpunk aesthetic, moody atmosphere', category: 'creative' },
  { id: 'gradient', name: 'Gradient Flow', icon: '🎨', description: 'Smooth color gradients', prompt: 'smooth flowing gradient background, purple to pink to blue, abstract and modern', category: 'creative' },
  { id: 'particles', name: 'Particle Magic', icon: '✨', description: 'Floating particles', prompt: 'dark background with floating glowing particles, magical sparkles, bokeh effect', category: 'creative' },
  { id: 'stage', name: 'Stage Lights', icon: '🎪', description: 'Performance stage', prompt: 'professional stage with dramatic spotlights, concert lighting, smoke effects', category: 'creative' },
  
  // Nature
  { id: 'beach', name: 'Beach Sunset', icon: '🏖️', description: 'Tropical paradise', prompt: 'beautiful beach at sunset, golden hour lighting, palm trees, calm ocean waves', category: 'nature' },
  { id: 'forest', name: 'Forest', icon: '🌲', description: 'Peaceful woods', prompt: 'serene forest with sunlight filtering through trees, lush green foliage, peaceful atmosphere', category: 'nature' },
  { id: 'mountain', name: 'Mountain View', icon: '⛰️', description: 'Majestic peaks', prompt: 'breathtaking mountain landscape, snow-capped peaks, clear blue sky, epic vista', category: 'nature' },
  { id: 'city-night', name: 'City Night', icon: '🌃', description: 'Urban skyline', prompt: 'city skyline at night, twinkling lights, modern buildings, urban atmosphere', category: 'nature' },
  
  // Abstract
  { id: 'minimal', name: 'Minimal White', icon: '⬜', description: 'Clean and simple', prompt: 'clean white background with subtle shadows, minimalist, professional', category: 'abstract' },
  { id: 'dark', name: 'Dark Mood', icon: '⬛', description: 'Dramatic dark', prompt: 'dark moody background with subtle lighting, dramatic shadows, cinematic feel', category: 'abstract' },
  { id: 'blur', name: 'Soft Blur', icon: '🔘', description: 'Dreamy bokeh', prompt: 'soft blurred background with beautiful bokeh lights, dreamy and ethereal', category: 'abstract' },
  
  // Custom
  { id: 'custom', name: 'Custom Scene', icon: '✏️', description: 'Describe your own', prompt: '', category: 'custom' },
];

// Avatar Scene Templates - Pre-configured scenarios optimized for Hedra
interface SceneTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  mode: 'standard' | 'cinematic';
  aspectRatio: '9:16' | '16:9' | '1:1';
  scriptPrompt?: string;
  voiceStyle?: string;
  // Hedra-specific settings
  expressionStyle?: 'confident' | 'excited' | 'serious' | 'friendly' | 'mysterious' | 'professional' | 'energetic' | 'calm' | 'storyteller';
  speakingStyle?: 'presenter' | 'storyteller' | 'news_anchor' | 'tutorial' | 'conversational' | 'dramatic' | 'sales_pitch';
  characterPosition?: 'center' | 'left' | 'right';
}

// Template categories for better organization
type TemplateCategory = 'social' | 'business' | 'story' | 'creative' | 'music' | 'all';

const AVATAR_SCENE_TEMPLATES: (SceneTemplate & { category: TemplateCategory })[] = [
  // === SOCIAL MEDIA TEMPLATES ===
  {
    id: 'social-intro',
    name: 'Social Media Intro',
    icon: '📱',
    description: 'Perfect for TikTok & Reels',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'Hey everyone! Welcome to my channel...',
    voiceStyle: 'energetic',
    expressionStyle: 'friendly',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'social',
  },
  {
    id: 'hype-promo',
    name: 'Hype Promo',
    icon: '🔥',
    description: 'Exciting announcements',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'You are NOT going to believe this...',
    voiceStyle: 'energetic',
    expressionStyle: 'excited',
    speakingStyle: 'sales_pitch',
    characterPosition: 'center',
    category: 'social',
  },
  {
    id: 'quick-tip',
    name: 'Quick Tip',
    icon: '💡',
    description: 'Fast helpful content',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'Quick tip for you...',
    voiceStyle: 'energetic',
    expressionStyle: 'friendly',
    speakingStyle: 'tutorial',
    characterPosition: 'center',
    category: 'social',
  },
  {
    id: 'reaction-video',
    name: 'Reaction Style',
    icon: '😲',
    description: 'Expressive reactions',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'Wait, what?! Let me react to this...',
    voiceStyle: 'energetic',
    expressionStyle: 'excited',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'social',
  },
  {
    id: 'storytime-reel',
    name: 'Storytime Reel',
    icon: '📖',
    description: 'Captivating personal stories',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'So this crazy thing happened...',
    voiceStyle: 'natural',
    expressionStyle: 'storyteller',
    speakingStyle: 'storyteller',
    characterPosition: 'center',
    category: 'social',
  },
  // === BUSINESS TEMPLATES ===
  {
    id: 'product-demo',
    name: 'Product Demo',
    icon: '🛍️',
    description: 'Showcase your product',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Let me show you this amazing product...',
    voiceStyle: 'professional',
    expressionStyle: 'confident',
    speakingStyle: 'sales_pitch',
    characterPosition: 'left',
    category: 'business',
  },
  {
    id: 'tutorial',
    name: 'Tutorial Style',
    icon: '📚',
    description: 'Educational content',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Today I will teach you how to...',
    voiceStyle: 'professional',
    expressionStyle: 'professional',
    speakingStyle: 'tutorial',
    characterPosition: 'left',
    category: 'business',
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    icon: '⭐',
    description: 'Customer review style',
    mode: 'cinematic',
    aspectRatio: '1:1',
    scriptPrompt: 'I have to tell you about my experience...',
    voiceStyle: 'natural',
    expressionStyle: 'friendly',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'business',
  },
  {
    id: 'news-update',
    name: 'News Anchor',
    icon: '📺',
    description: 'Professional broadcast',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Breaking news: Today we are reporting...',
    voiceStyle: 'professional',
    expressionStyle: 'professional',
    speakingStyle: 'news_anchor',
    characterPosition: 'center',
    category: 'business',
  },
  {
    id: 'ceo-message',
    name: 'Executive Message',
    icon: '👔',
    description: 'Leadership communication',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'I wanted to personally share with you...',
    voiceStyle: 'professional',
    expressionStyle: 'confident',
    speakingStyle: 'presenter',
    characterPosition: 'center',
    category: 'business',
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Presentation',
    icon: '📊',
    description: 'Investor/sales pitch',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'We are solving a billion dollar problem...',
    voiceStyle: 'professional',
    expressionStyle: 'confident',
    speakingStyle: 'sales_pitch',
    characterPosition: 'left',
    category: 'business',
  },
  // === STORY TEMPLATES ===
  {
    id: 'story-time',
    name: 'Story Time',
    icon: '📖',
    description: 'Engaging narratives',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Let me tell you a story...',
    voiceStyle: 'natural',
    expressionStyle: 'storyteller',
    speakingStyle: 'storyteller',
    characterPosition: 'center',
    category: 'story',
  },
  {
    id: 'mystery-tale',
    name: 'Mystery Tale',
    icon: '🔮',
    description: 'Suspenseful storytelling',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Something strange was about to happen...',
    voiceStyle: 'natural',
    expressionStyle: 'mysterious',
    speakingStyle: 'dramatic',
    characterPosition: 'center',
    category: 'story',
  },
  {
    id: 'calm-meditation',
    name: 'Calm & Relaxing',
    icon: '🧘',
    description: 'Wellness & meditation',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Take a deep breath and relax...',
    voiceStyle: 'natural',
    expressionStyle: 'calm',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'story',
  },
  {
    id: 'dramatic-reading',
    name: 'Dramatic Reading',
    icon: '🎭',
    description: 'Theatrical performance',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'To be, or not to be...',
    voiceStyle: 'natural',
    expressionStyle: 'storyteller',
    speakingStyle: 'dramatic',
    characterPosition: 'center',
    category: 'story',
  },
  // === CREATIVE TEMPLATES ===
  {
    id: 'music-intro',
    name: 'Music Video Intro',
    icon: '🎵',
    description: 'Artist introduction',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: '',
    voiceStyle: 'natural',
    expressionStyle: 'energetic',
    speakingStyle: 'presenter',
    characterPosition: 'center',
    category: 'creative',
  },
  {
    id: 'podcast-host',
    name: 'Podcast Host',
    icon: '🎙️',
    description: 'Audio show style',
    mode: 'cinematic',
    aspectRatio: '1:1',
    scriptPrompt: 'Welcome back to the show...',
    voiceStyle: 'natural',
    expressionStyle: 'friendly',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'creative',
  },
  {
    id: 'asmr-style',
    name: 'ASMR / Whisper',
    icon: '🌙',
    description: 'Soft and calming',
    mode: 'cinematic',
    aspectRatio: '16:9',
    scriptPrompt: 'Hey there, relax and listen...',
    voiceStyle: 'natural',
    expressionStyle: 'calm',
    speakingStyle: 'conversational',
    characterPosition: 'center',
    category: 'creative',
  },
  {
    id: 'motivational',
    name: 'Motivational Speaker',
    icon: '💪',
    description: 'Inspiring and empowering',
    mode: 'cinematic',
    aspectRatio: '9:16',
    scriptPrompt: 'You have the power to change your life...',
    voiceStyle: 'energetic',
    expressionStyle: 'confident',
    speakingStyle: 'presenter',
    characterPosition: 'center',
    category: 'creative',
  },
];

// Music Video Scene Suggestions based on mood/genre
interface MusicVideoSuggestion {
  id: string;
  genre: string;
  mood: string;
  icon: string;
  visualStyle: string;
  suggestedScenes: string[];
  cameraMotions: string[];
  colorPalette: string;
}

const MUSIC_VIDEO_SUGGESTIONS: MusicVideoSuggestion[] = [
  {
    id: 'emotional-ballad',
    genre: 'Ballad / Emotional',
    mood: 'Reflective & Deep',
    icon: '💔',
    visualStyle: 'Soft lighting, intimate close-ups, nature elements',
    suggestedScenes: [
      'Slow zoom on emotional face',
      'Rain on window with reflection',
      'Walking alone through empty spaces',
      'Sunset/sunrise silhouette',
      'Candlelit intimate setting',
    ],
    cameraMotions: ['push_in', 'static', 'crane_up', 'dolly_out'],
    colorPalette: 'Warm tones, soft blues, golden hour',
  },
  {
    id: 'upbeat-pop',
    genre: 'Pop / Upbeat',
    mood: 'Energetic & Fun',
    icon: '🎉',
    visualStyle: 'Bright colors, dynamic movement, fun locations',
    suggestedScenes: [
      'Dancing with colorful background',
      'City streets with neon lights',
      'Group celebration scene',
      'Confetti and sparkles',
      'Quick cuts between locations',
    ],
    cameraMotions: ['orbit_right', 'tracking_left', 'zoom_in', 'pan_right'],
    colorPalette: 'Vibrant, neon accents, high contrast',
  },
  {
    id: 'hip-hop',
    genre: 'Hip-Hop / Rap',
    mood: 'Bold & Confident',
    icon: '🔥',
    visualStyle: 'Urban aesthetic, dramatic lighting, powerful poses',
    suggestedScenes: [
      'Performance in urban setting',
      'Low angle power shot',
      'Car/street scenes',
      'Studio recording booth',
      'Smoke and dramatic lighting',
    ],
    cameraMotions: ['push_in', 'orbit_left', 'tracking_right', 'crane_down'],
    colorPalette: 'Dark with accent colors, gold, dramatic contrast',
  },
  {
    id: 'indie-folk',
    genre: 'Indie / Folk',
    mood: 'Warm & Authentic',
    icon: '🌿',
    visualStyle: 'Natural settings, vintage feel, acoustic instruments',
    suggestedScenes: [
      'Forest or field at golden hour',
      'Cozy cabin interior',
      'Acoustic performance',
      'Road trip scenery',
      'Vintage film grain effect',
    ],
    cameraMotions: ['pan_left', 'static', 'dolly_in', 'crane_up'],
    colorPalette: 'Earth tones, warm filters, soft greens',
  },
  {
    id: 'electronic',
    genre: 'Electronic / EDM',
    mood: 'Futuristic & Intense',
    icon: '⚡',
    visualStyle: 'Geometric shapes, light shows, abstract visuals',
    suggestedScenes: [
      'Abstract light patterns',
      'Silhouette against LED wall',
      'Futuristic cityscape',
      'Strobe/beat-synced lighting',
      'Particle effects and trails',
    ],
    cameraMotions: ['zoom_in', 'orbit_right', 'tracking_left', 'push_in'],
    colorPalette: 'Neon, laser colors, high saturation',
  },
  {
    id: 'rnb-soul',
    genre: 'R&B / Soul',
    mood: 'Smooth & Sensual',
    icon: '✨',
    visualStyle: 'Elegant settings, soft focus, romantic lighting',
    suggestedScenes: [
      'Elegant interior with candles',
      'Rooftop at night',
      'Mirror reflections',
      'Silk and soft textures',
      'Slow motion movement',
    ],
    cameraMotions: ['dolly_in', 'pan_right', 'static', 'crane_up'],
    colorPalette: 'Deep purples, golds, warm highlights',
  },
  {
    id: 'rock',
    genre: 'Rock / Alternative',
    mood: 'Raw & Powerful',
    icon: '🎸',
    visualStyle: 'Gritty, high energy, band performance',
    suggestedScenes: [
      'Live performance energy',
      'Dramatic industrial setting',
      'Fire and sparks',
      'Crowd energy scenes',
      'Moody warehouse',
    ],
    cameraMotions: ['tracking_right', 'zoom_in', 'orbit_left', 'crane_down'],
    colorPalette: 'High contrast, red accents, gritty textures',
  },
  {
    id: 'chill-lofi',
    genre: 'Lo-Fi / Chill',
    mood: 'Relaxed & Nostalgic',
    icon: '☕',
    visualStyle: 'Cozy aesthetics, anime-inspired, study vibes',
    suggestedScenes: [
      'Rainy window study scene',
      'Cozy bedroom at night',
      'Coffee shop ambiance',
      'City at night from window',
      'Gentle floating elements',
    ],
    cameraMotions: ['static', 'pan_left', 'zoom_out', 'dolly_out'],
    colorPalette: 'Muted tones, purple/blue haze, warm lamp light',
  },
];

// Music video style templates (from MUSIC_VIDEO_SUGGESTIONS) — used when "Music video style" is selected
const MUSIC_VIDEO_STYLE_TEMPLATES: (SceneTemplate & { category: 'music' })[] = MUSIC_VIDEO_SUGGESTIONS.map((s) => ({
  id: `music-${s.id}`,
  name: `Music Video – ${s.genre.split(' / ')[0]}`,
  icon: s.icon,
  description: s.visualStyle,
  mode: 'cinematic' as const,
  aspectRatio: '9:16' as const,
  scriptPrompt: s.suggestedScenes[0] || '',
  voiceStyle: 'energetic',
  expressionStyle: (s.mood.includes('Emotional') || s.mood.includes('Smooth') ? 'calm' : s.mood.includes('Bold') || s.mood.includes('Raw') ? 'confident' : 'energetic') as SceneTemplate['expressionStyle'],
  speakingStyle: (s.mood.includes('Reflective') ? 'storyteller' : 'presenter') as SceneTemplate['speakingStyle'],
  characterPosition: 'center' as const,
  category: 'music' as const,
}));

// Combined list for template picker (all categories including music)
const ALL_SCENE_TEMPLATES = [...AVATAR_SCENE_TEMPLATES, ...MUSIC_VIDEO_STYLE_TEMPLATES];

// Beginner "Vibe" presets: one choice maps to expression + speaking + position
const VIBE_PRESETS: { id: string; label: string; icon: string; expressionStyle: CinematicSettings['expressionStyle']; speakingStyle: CinematicSettings['speakingStyle']; characterPosition: CinematicSettings['characterPosition'] }[] = [
  { id: 'professional', label: 'Professional', icon: '👔', expressionStyle: 'professional', speakingStyle: 'presenter', characterPosition: 'center' },
  { id: 'friendly', label: 'Friendly', icon: '😊', expressionStyle: 'friendly', speakingStyle: 'conversational', characterPosition: 'center' },
  { id: 'exciting', label: 'Exciting', icon: '🎉', expressionStyle: 'excited', speakingStyle: 'sales_pitch', characterPosition: 'center' },
  { id: 'calm', label: 'Calm', icon: '🧘', expressionStyle: 'calm', speakingStyle: 'conversational', characterPosition: 'center' },
  { id: 'storyteller', label: 'Storyteller', icon: '📖', expressionStyle: 'storyteller', speakingStyle: 'storyteller', characterPosition: 'center' },
];

export default function SpaceBaddieStudioPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
      </div>
    }>
      <StudioContent />
    </Suspense>
  );
}

function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === 'true';
  const initialPrompt = searchParams.get('prompt');
  const productName = searchParams.get('product');
  
  // User state
  const [user, setUser] = useState<any>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Studio state
  const [step, setStep] = useState<StudioStep>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [voiceoverAudioUrl, setVoiceoverAudioUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [longRunning, setLongRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{ jobId: string; heygenVideoId?: string; musicUrl?: string; musicVolume?: number; provider?: string } | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEditor, setShowEditor] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLoadingRef = useRef<Promise<FFmpeg> | null>(null);
  const [ffmpegReady, setFfmpegReady] = useState(false);
  
  // Avatar profiles
  const [faces, setFaces] = useState<FaceProfile[]>([]);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>([]);
  const [selectedFace, setSelectedFace] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [avatarMode, setAvatarMode] = useState<'upload' | 'face' | 'heygen'>('upload');
  const [engine, setEngine] = useState<'heygen' | 'hedra'>('heygen');
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [heygenAvatars, setHeygenAvatars] = useState<HeyGenAvatar[]>([]);
  const [loadingHeygenAvatars, setLoadingHeygenAvatars] = useState(false);
  const [avatarFilter, setAvatarFilter] = useState<'all' | 'female' | 'male' | 'featured'>('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [useCustomImage, setUseCustomImage] = useState(true);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [ttsAvailable, setTtsAvailable] = useState<boolean | null>(null);
  const [maxVoiceoverChars, setMaxVoiceoverChars] = useState(2000);
  
  // Audio upload
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Background & Scene Instructions
  const [selectedBackground, setSelectedBackground] = useState<string>('studio');
  const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState<string>('');
  const [sceneInstruction, setSceneInstruction] = useState<string>('');
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [cinematicScene, setCinematicScene] = useState(false); // Real-life AI scenes via fal.ai
  
  const [settings, setSettings] = useState<VideoSettings>({
    duration: 15,
    voice: 'natural',
    style: 'modern',
    music: 'upbeat',
    aspectRatio: '9:16'
  });

  const [script, setScript] = useState('');
  
  // Cinematic settings for premium video generation
  const [cinematicSettings, setCinematicSettings] = useState<CinematicSettings>(getDefaultCinematicSettings());
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const additionalImageInputRef = useRef<HTMLInputElement>(null);
  
  // AI Script state
  const [useAIScript, setUseAIScript] = useState(false);
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptTone, setScriptTone] = useState('engaging');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [suggestedScripts, setSuggestedScripts] = useState<string[]>([]);
  const [quickSuggesting, setQuickSuggesting] = useState(false);
  const [quickSuggestions, setQuickSuggestions] = useState<{ title: string; script: string }[]>([]);

  // Pre-fill script from product link (commerce → studio flow)
  useEffect(() => {
    if (initialPrompt) {
      setScriptTopic(productName || '');
      setScript(initialPrompt);
      setUseAIScript(true);
    }
  }, [initialPrompt, productName]);
  
  // Experience level: Beginner (no-hassle) vs Advanced (Tao-style controls)
  type StudioLevel = 'beginner' | 'advanced';
  const [studioLevel, setStudioLevel] = useState<StudioLevel>(() => {
    if (typeof window === 'undefined') return 'beginner';
    try {
      const stored = localStorage.getItem('spacebaddie_studio_level');
      if (stored === 'advanced' || stored === 'beginner') return stored;
    } catch (_) {}
    return 'beginner';
  });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false); // Beginner: "Try Advanced-style" expansion

  // Project type: Single video | Music video style | Content series (centralized entry)
  const [projectType, setProjectType] = useState<ProjectType>(() => {
    if (typeof window === 'undefined') return 'single_video';
    try {
      const stored = localStorage.getItem('spacebaddie_studio_project_type');
      if (stored === 'music_video_style' || stored === 'content_series' || stored === 'single_video') return stored;
    } catch (_) {}
    return 'single_video';
  });

  // URL ?style=music-video → pre-select Music video style
  useEffect(() => {
    const style = searchParams.get('style');
    if (style === 'music-video') setProjectType('music_video_style');
  }, [searchParams]);

  // When Music video style is selected, default template category to Music so those templates show first
  useEffect(() => {
    if (projectType === 'music_video_style' && step === 'customize') setTemplateCategory('music');
  }, [projectType, step]);

  // Persist project type and level for returning users
  useEffect(() => {
    try {
      localStorage.setItem('spacebaddie_studio_project_type', projectType);
    } catch (_) {}
  }, [projectType]);
  useEffect(() => {
    try {
      localStorage.setItem('spacebaddie_studio_level', studioLevel);
    } catch (_) {}
  }, [studioLevel]);

  // Music Video / Template state
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('all');
  const [selectedMusicMood, setSelectedMusicMood] = useState<string | null>(null);
  const [showMusicVideoHelper, setShowMusicVideoHelper] = useState(false);

  // Timeline builder state (in-house editing)
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [timelineAudioUrl, setTimelineAudioUrl] = useState<string | null>(null);
  const [timelineAudioName, setTimelineAudioName] = useState<string | null>(null);
  const [timelineExporting, setTimelineExporting] = useState(false);
  const [timelineStatus, setTimelineStatus] = useState<{ status?: string; outputUrl?: string; error?: string } | null>(null);
  const [manualClipUrl, setManualClipUrl] = useState('');

  const clipGallery = timelineClips.map((clip) => ({
    id: clip.id,
    url: clip.url,
    duration: cinematicSettings.mode === 'cinematic' ? cinematicSettings.duration : settings.duration,
  }));
  const timelineAudioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
    loadAvatarProfiles();
    setVisitorId(getOrCreateVisitorId());
  }, []);
  
  // Load HeyGen avatars when user switches to HeyGen mode
  useEffect(() => {
    if (avatarMode === 'heygen' && heygenAvatars.length === 0 && !loadingHeygenAvatars) {
      loadHeygenAvatars();
    }
  }, [avatarMode, heygenAvatars.length, loadingHeygenAvatars]);

  useEffect(() => {
    const loadCinematicCapabilities = async () => {
      try {
        const response = await fetch('/api/spacebaddie/cinematic?action=capabilities');
        if (!response.ok) return;
        const data = await response.json();
        if (data?.voiceover) {
          if (typeof data.voiceover.ttsAvailable === 'boolean') {
            setTtsAvailable(data.voiceover.ttsAvailable);
          }
          if (typeof data.voiceover.maxChars === 'number') {
            setMaxVoiceoverChars(data.voiceover.maxChars);
          }
        }
      } catch (error) {
        console.warn('Failed to load cinematic voiceover capabilities:', error);
      }
    };
    loadCinematicCapabilities();
  }, []);

  const generateAIScript = async () => {
    if (!scriptTopic.trim()) return;
    
    setGeneratingScript(true);
    setSuggestedScripts([]);
    
    try {
      const response = await fetch('/api/spacebaddie/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: scriptTopic,
          tone: scriptTone,
          duration: settings.duration,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestedScripts(data.scripts || []);
        if (data.scripts?.length > 0) {
          setScript(data.scripts[0]);
        }
      }
    } catch (error) {
      console.error('Failed to generate script:', error);
    } finally {
      setGeneratingScript(false);
    }
  };

  const quickAISuggest = async () => {
    setQuickSuggesting(true);
    setQuickSuggestions([]);
    try {
      const response = await fetch('/api/spacebaddie/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: cinematicSettings.mode === 'cinematic' ? 'Cinematic Video' : 'Standard Video',
          expressionStyle: cinematicSettings.expressionStyle,
          speakingStyle: cinematicSettings.speakingStyle,
          topic: scriptTopic || undefined,
          tone: scriptTone,
          duration: cinematicSettings.mode === 'cinematic' ? cinematicSettings.duration : settings.duration,
          aspectRatio: cinematicSettings.mode === 'cinematic' ? cinematicSettings.aspectRatio : settings.aspectRatio,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.suggestions?.length > 0) {
          setQuickSuggestions(data.suggestions);
          // Auto-fill first suggestion
          setScript(data.suggestions[0].script);
        }
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
    } finally {
      setQuickSuggesting(false);
    }
  };

  const loadAvatarProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const [voicesRes, facesRes, avatarsRes] = await Promise.all([
        fetch('/api/avatar/voices'),
        fetch('/api/avatar/faces'),
        fetch('/api/avatar/list'),
      ]);
      
      if (voicesRes.ok) {
        const voicesData = await voicesRes.json();
        if (voicesData.voices?.length > 0) {
          setVoices(voicesData.voices);
          setSelectedVoice(voicesData.voices[0].id);
        }
      }
      
      if (facesRes.ok) {
        const facesData = await facesRes.json();
        if (facesData.faces?.length > 0) {
          setFaces(facesData.faces);
          setSelectedFace(facesData.faces[0].id);
        }
      }

      if (avatarsRes.ok) {
        const avatarsData = await avatarsRes.json();
        if (avatarsData.avatars?.length > 0) {
          setAvatars(avatarsData.avatars);
          setSelectedAvatar(avatarsData.avatars[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load avatar profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };
  
  // Load HeyGen full-body avatars
  const loadHeygenAvatars = async () => {
    setLoadingHeygenAvatars(true);
    try {
      const res = await fetch('/api/avatar/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.avatars?.length > 0) {
          // Filter to public avatars for full-body animation
          const publicAvatars = data.avatars.filter(
            (a: { type?: string }) => a.type === 'public' || a.type === 'instant'
          );
          setHeygenAvatars(publicAvatars);
          console.log('[Studio] Loaded', publicAvatars.length, 'HeyGen avatars');
        }
      }
    } catch (error) {
      console.error('Failed to load HeyGen avatars:', error);
    } finally {
      setLoadingHeygenAvatars(false);
    }
  };

  const getOrCreateVisitorId = () => {
    if (typeof window === 'undefined') return null;
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const created = `sb_visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  };

  const loadUserData = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      
      if (userData) {
        const res = await fetch(`/api/spacebaddie/checkout?userId=${userData.id}`);
        if (res.ok) {
          const data = await res.json();
          setUsage(data.usage);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/spacebaddie');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setStep('customize');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setStep('customize');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Handle audio upload for custom voice
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Max 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert('Audio file must be under 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedAudio(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Handle adding additional images for cinematic multi-image mode
  const handleAdditionalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newUrl = ev.target?.result as string;
        setAdditionalImages(prev => [...prev, newUrl]);
        setCinematicSettings(prev => ({
          ...prev,
          imageUrls: [...prev.imageUrls, newUrl]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
    setCinematicSettings(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  // Timeline helpers
  const addTimelineClip = (url: string, label?: string) => {
    setTimelineClips(prev => ([
      ...prev,
      {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        url,
        label: label || `Clip ${prev.length + 1}`,
      }
    ]));
  };

  const moveTimelineClip = (index: number, direction: 'up' | 'down') => {
    setTimelineClips(prev => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const removeTimelineClip = (id: string) => {
    setTimelineClips(prev => prev.filter(clip => clip.id !== id));
  };

  const handleTimelineAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Audio upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Upload failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data.voiceoverUrl && typeof data.voiceoverUrl === 'string') {
        setVoiceoverAudioUrl(data.voiceoverUrl);
      }

      setTimelineAudioUrl(data.url);
      setTimelineAudioName(file.name);
    } catch (error) {
      console.error('Timeline audio upload failed:', error);
      alert(error instanceof Error ? error.message : 'Audio upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const exportTimeline = async () => {
    if (timelineClips.length === 0) {
      alert('Add at least one clip to the timeline first.');
      return;
    }

    setTimelineExporting(true);
    setTimelineStatus({ status: 'processing' });

    try {
      const response = await fetch('/api/spacebaddie/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: timelineClips.map(clip => ({ url: clip.url, label: clip.label })),
          audioUrl: timelineAudioUrl || undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Timeline export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Export failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      const jobId = data.jobId as string;
      let attempts = 0;

      while (attempts < 180) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusRes = await fetch(`/api/spacebaddie/timeline?jobId=${jobId}`);
        
        if (!statusRes.ok) {
          console.warn(`Timeline status poll failed (${statusRes.status}), retrying...`);
          attempts += 1;
          continue;
        }
        
        let statusData;
        try {
          statusData = await statusRes.json();
        } catch {
          console.warn('Failed to parse timeline status response, retrying...');
          attempts += 1;
          continue;
        }
        
        if (statusData.job) {
          setTimelineStatus(statusData.job);
          if (statusData.job.status === 'completed' || statusData.job.status === 'failed') {
            break;
          }
        }
        attempts += 1;
      }
    } catch (error) {
      console.error('Timeline export error:', error);
      setTimelineStatus({ status: 'failed', error: error instanceof Error ? error.message : 'Export failed' });
    } finally {
      setTimelineExporting(false);
    }
  };

  // Apply a scene template - sets all relevant settings (Hedra-optimized)
  const applySceneTemplate = (template: SceneTemplate) => {
    // Update cinematic settings with Hedra-specific options
    setCinematicSettings(prev => ({
      ...prev,
      mode: template.mode,
      aspectRatio: template.aspectRatio as any,
      // Hedra-specific style options
      expressionStyle: template.expressionStyle || prev.expressionStyle,
      speakingStyle: template.speakingStyle || prev.speakingStyle,
      characterPosition: template.characterPosition || prev.characterPosition,
    }));
    
    // Update basic settings
    setSettings(prev => ({
      ...prev,
      aspectRatio: template.aspectRatio,
      voice: template.voiceStyle || prev.voice,
    }));
    
    // Set script prompt if provided and script is empty
    if (template.scriptPrompt && !script) {
      setScript(template.scriptPrompt);
    }
  };

  const loadFfmpeg = useCallback(async () => {
    if (ffmpegReady && ffmpegRef.current) return ffmpegRef.current;
    if (ffmpegLoadingRef.current) return ffmpegLoadingRef.current;
    const ffmpeg = ffmpegRef.current ?? new FFmpeg();
    ffmpegRef.current = ffmpeg;
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    const loadPromise = (async () => {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setFfmpegReady(true);
      return ffmpeg;
    })();
    ffmpegLoadingRef.current = loadPromise.finally(() => {
      ffmpegLoadingRef.current = null;
    });
    return ffmpegLoadingRef.current;
  }, [ffmpegReady]);

  const mergeVideoWithAudio = useCallback(async (videoUrl: string, audioUrl: string, musicUrl?: string, musicVolume = 0.3, voiceVol = 1.0) => {
    const ffmpeg = await loadFfmpeg();
    const audioExtFromData = audioUrl.startsWith('data:audio/')
      ? audioUrl.split(';')[0]?.split('/')[1] || 'mp3'
      : null;
    let audioExt = audioExtFromData || 'mp3';
    if (!audioExtFromData) {
      try {
        const parsedUrl = new URL(audioUrl);
        const ext = parsedUrl.pathname.split('.').pop();
        if (ext) audioExt = ext;
      } catch {
        // Keep default extension
      }
    }
    if (audioExt === 'mpeg') audioExt = 'mp3';
    const audioFileName = `input_audio.${audioExt}`;
    await ffmpeg.writeFile('input_video.mp4', await fetchFile(videoUrl));
    await ffmpeg.writeFile(audioFileName, await fetchFile(audioUrl));
    
    let inputs = ['-i', 'input_video.mp4', '-i', audioFileName];
    let filterComplex = '';
    let mapAudio = '-map 1:a:0';
    
    if (musicUrl) {
      // Handle music track
      const musicExt = musicUrl.split('.').pop() || 'mp3';
      const musicFileName = `input_music.${musicExt}`;
      await ffmpeg.writeFile(musicFileName, await fetchFile(musicUrl));
      
      inputs.push('-i', musicFileName);
      
      // Mix voice (input 1) and music (input 2)
      // Apply voice volume and reduce music volume, then mix
      const voiceFilter = voiceVol < 1.0 ? `[1:a]volume=${voiceVol}[voice];` : '';
      const voiceRef = voiceVol < 1.0 ? '[voice]' : '[1:a]';
      filterComplex = `${voiceFilter}[2:a]volume=${musicVolume}[music];${voiceRef}[music]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
      mapAudio = '-map [aout]';
    }

    const command = [
      ...inputs,
      '-c:v', 'copy', // Copy video stream
      ...(filterComplex ? ['-filter_complex', filterComplex] : []), // Use filter if mixing
      ...(filterComplex ? ['-map', '0:v:0', '-map', '[aout]'] : ['-map', '0:v:0', '-map', '1:a:0']), // Map streams
      '-c:a', 'aac', // Encode audio to AAC
      '-shortest', // Cut to shortest stream (video usually)
      'output.mp4',
    ];
    
    console.log('[FFmpeg] Running command:', command);
    await ffmpeg.exec(command);
    
    const data = await ffmpeg.readFile('output.mp4');
    const blob = new Blob([data], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return { blob, url };
  }, [loadFfmpeg]);

  const uploadMergedVideo = useCallback(async (blob: Blob, jobId: string) => {
    if (!user) return null;
    try {
      const file = new File([blob], `spacebaddie_cinematic_${jobId}.mp4`, { type: 'video/mp4' });
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!uploadResponse.ok) {
        return null;
      }
      const uploadData = await uploadResponse.json();
      if (uploadData?.url) {
        await supabase
          .from('spacebaddie_projects')
          .update({
            video_url: uploadData.url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', `proj_${jobId}`);
        return uploadData.url as string;
      }
    } catch (error) {
      console.warn('Failed to upload merged video:', error);
    }
    return null;
  }, [user]);

  const handleGenerate = async () => {
    setStep('generate');
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    setLongRunning(false);
    setStatusMessage(null);
    setVoiceoverAudioUrl(null);

    try {
      // Choose API based on mode
      const isCinematic = cinematicSettings.mode === 'cinematic';
      const apiUrl = isCinematic ? '/api/spacebaddie/cinematic' : '/api/spacebaddie/video';
      
      // Build background prompt
      const bgScene = BACKGROUND_SCENES.find(b => b.id === selectedBackground);
      const backgroundPrompt = selectedBackground === 'custom' 
        ? customBackgroundPrompt 
        : bgScene?.prompt || '';
      
      // Combine scene instruction with script for enhanced prompt
      const enhancedPrompt = [
        script || 'Talking video of the subject',
        sceneInstruction ? `Scene direction: ${sceneInstruction}` : '',
        backgroundPrompt ? `Background: ${backgroundPrompt}` : '',
      ].filter(Boolean).join('. ');
      
      // Check if using HeyGen full-body avatar
      const isUsingHeygenAvatar = avatarMode === 'heygen' && selectedAvatar;
      
      // Get the image URL - use uploaded image, or fall back to selected face's image
      // HeyGen avatars don't need an uploaded image
      let imageUrlToUse = uploadedImage;
      if (!imageUrlToUse && selectedFace && avatarMode === 'face') {
        const selectedFaceData = faces.find(f => f.id === selectedFace);
        if (selectedFaceData?.imageUrl) {
          imageUrlToUse = selectedFaceData.imageUrl;
          console.log('[Studio] Using selected face image:', selectedFace);
        }
      }
      
      // Validate that we have an image OR a HeyGen avatar selected
      if (!imageUrlToUse && !isUsingHeygenAvatar) {
        setGenerationError('Please upload an image or select an avatar');
        setIsGenerating(false);
        setStep('upload');
        return;
      }
      
      // For HeyGen avatars with placeholder, resolve to actual image
      if (isUsingHeygenAvatar && imageUrlToUse === 'heygen-avatar-placeholder') {
        if (isCinematic) {
          // Cinematic mode (Hedra) needs a real face image -- use the avatar's preview URL
          const avatarData = heygenAvatars.find(a => a.id === selectedAvatar);
          if (avatarData?.preview_url) {
            imageUrlToUse = avatarData.preview_url;
            console.log('[Studio] Using HeyGen avatar preview as face image for Hedra:', avatarData.preview_url);
          } else {
            imageUrlToUse = null;
          }
        } else {
          // Standard HeyGen mode sends avatarId, doesn't need image
          imageUrlToUse = null;
        }
      }
      
      // Cinematic mode requires a face image (uses Hedra)
      if (isCinematic && !imageUrlToUse) {
        setGenerationError('Cinematic mode requires a face photo. Please upload an image or select an avatar with a preview image.');
        setIsGenerating(false);
        setStep('upload');
        return;
      }
      
      if (isCinematic && !uploadedAudio && script.trim().length > maxVoiceoverChars) {
        setGenerationError(`Voiceover script too long. Max ${maxVoiceoverChars} characters or upload audio.`);
        setIsGenerating(false);
        setStep('customize');
        return;
      }
      
      // Build request based on mode
      const requestBody = isCinematic ? {
        // Cinematic mode - Hedra (expressive talking avatar)
        userId: user?.id,
        prompt: enhancedPrompt,
        script: script || undefined,
        voiceStyle: settings.voice,
        audioUrl: uploadedAudio || undefined,
        imageUrl: imageUrlToUse || undefined,
        aspectRatio: cinematicSettings.aspectRatio,
        resolution: cinematicSettings.resolution,
        // Hedra-specific style options
        expressionStyle: cinematicSettings.expressionStyle,
        speakingStyle: cinematicSettings.speakingStyle,
        characterPosition: cinematicSettings.characterPosition,
        enhancePrompt: cinematicSettings.enhancePrompt,
        batchSize: cinematicSettings.batchSize,
        directorNotes: cinematicSettings.directorNotes?.trim() || undefined,
        // Music
        music: cinematicSettings.musicTrack,
        musicVolume: cinematicSettings.musicVolume,
        async: true, // Use async for progress tracking
      } : {
        // Standard mode - HeyGen talking head
        imageUrl: imageUrlToUse || undefined,
        script: uploadedAudio ? undefined : (script || undefined), // Skip script if custom audio
        voiceStyle: settings.voice,
        voiceId: selectedVoice || undefined,
        voiceGender: voiceGender, // Pass male/female for fallback voice mapping
        faceId: selectedFace || undefined,
        aspectRatio: settings.aspectRatio,
        // HeyGen full-body avatar (if selected)
        avatarId: isUsingHeygenAvatar ? selectedAvatar : undefined,
        duration: settings.duration,
        music: settings.music,
        provider: cinematicScene ? 'fal-avatar' : engine,
        visitorId: visitorId || undefined,
        userId: user?.id,
        // Custom audio support
        uploadedAudio: uploadedAudio || undefined,
        // Background & Scene
        backgroundScene: selectedBackground,
        backgroundPrompt: backgroundPrompt || undefined,
        sceneInstruction: sceneInstruction || undefined,
        // Cinematic scene mode - places avatar in a real AI-generated scene
        cinematicScene: cinematicScene,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to start video generation';
        try {
          const errorData = await response.json();
          // Handle both string and object errors
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (typeof errorData.error === 'object') {
              errorMessage = errorData.error.message || errorData.error.error || JSON.stringify(errorData.error);
            }
          }
          // Also log debug info if available
          if (errorData.debug) {
            console.error('Video generation debug info:', errorData.debug);
          }
        } catch {
          // Response wasn't JSON (e.g., HTML error page)
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.mode === 'demo' || data.status === 'demo') {
        setGenerationError('Video worker is unavailable. Please try again later.');
        setIsGenerating(false);
        setStep('preview');
        return;
      }

      const jobId = data.jobId;
      const heygenVideoId = data.heygenVideoId;
      const provider = data.provider;
      const cinematicModel = data.model; // 'ai-avatar' or 'ltx-video' for cinematic mode
      const isCinematicJob = cinematicSettings.mode === 'cinematic';
      
      // Capture voiceover URL from cinematic API response (TTS generated on server)
      if (isCinematicJob && data.voiceoverUrl) {
        setVoiceoverAudioUrl(data.voiceoverUrl);
        console.log('[Studio] Voiceover URL received from API:', data.voiceoverUrl);
      }
      
      // Capture music URL from cinematic API response
      if (isCinematicJob && data.musicUrl) {
        console.log('[Studio] Music URL received from API:', data.musicUrl);
      }
      
      setActiveJob({ jobId, heygenVideoId, musicUrl: data.musicUrl, musicVolume: data.musicVolume, provider });
      let attempts = 0;
      const maxAttempts = 300;
      
      setGenerationProgress(5);
      // Update status message based on which model is being used
      const isAvatarModel = cinematicModel === 'ai-avatar';
      setStatusMessage(isCinematicJob 
        ? (isAvatarModel ? 'Generating avatar video with lip-sync...' : 'Generating cinematic video with LTX-2...')
        : `Creating video with ${provider === 'hedra' ? 'Hedra' : 'HeyGen'}...`);
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Use appropriate status endpoint based on mode
        // Include userId in poll URL so fallback path can save with proper user association
        const userIdParam = user?.id ? `&userId=${user.id}` : '';
        const providerParam = provider ? `&provider=${provider}` : '';
        const idParam = provider === 'hedra' ? (data.providerJobId ? `&hedraJobId=${data.providerJobId}` : '') : (heygenVideoId ? `&heygenVideoId=${heygenVideoId}` : '');
        
        // Include model parameter for cinematic jobs so status endpoint uses correct fal.ai API
        const modelParam = cinematicModel ? `&model=${cinematicModel}` : '';
        const pollUrl = isCinematicJob
          ? `/api/spacebaddie/cinematic/status?jobId=${jobId}${modelParam}`
          : `/api/spacebaddie/video?jobId=${jobId}${userIdParam}${providerParam}${idParam}`;
        const statusResponse = await fetch(pollUrl);
        if (!statusResponse.ok) {
          // Don't crash on polling errors - just retry
          console.warn(`Status poll failed (${statusResponse.status}), retrying...`);
          attempts++;
          continue;
        }
        
        let statusData;
        try {
          statusData = await statusResponse.json();
        } catch {
          console.warn('Failed to parse status response, retrying...');
          attempts++;
          continue;
        }

        // Validate statusData is a valid object before accessing properties
        if (!statusData || typeof statusData !== 'object') {
          console.warn('Invalid status response format, retrying...');
          attempts++;
          continue;
        }

        // Validate progress is a number before using Math.min
        if (typeof statusData.progress === 'number') {
          setGenerationProgress(Math.min(statusData.progress, 99));
        }
        
        // Update status message based on job progress
        if (isCinematicJob && statusData.logs?.length) {
          setStatusMessage(statusData.logs[statusData.logs.length - 1]);
        }

        if (statusData.status === 'completed') {
          if (!statusData.videoUrl) {
            console.warn('Status completed but video URL missing, retrying...');
            setStatusMessage('Finalizing video assets...');
            attempts++;
            continue;
          }
          setGenerationProgress(100);
          let finalVideoUrl = statusData.videoUrl || null;
          // Use voiceover from: state (captured from initial API) > status response (from DB) > uploaded audio
          const voiceoverSource = voiceoverAudioUrl || statusData.voiceoverUrl || (isCinematicJob ? uploadedAudio : null);
          // Use music from: activeJob (captured from initial API) > status response (from DB)
          const musicSource = activeJob?.musicUrl || statusData.musicUrl || null;
          const musicVol = activeJob?.musicVolume || statusData.musicVolume || 0.3;
          
          if (isCinematicJob && (voiceoverSource || musicSource) && statusData.videoUrl) {
            setStatusMessage('Adding audio to cinematic video...');
            try {
              // If only music, use music as audio source. If both, mix them.
              let merged;
              const voiceVol = cinematicSettings.voiceVolume ?? 1.0;
              if (voiceoverSource) {
                merged = await mergeVideoWithAudio(statusData.videoUrl, voiceoverSource, musicSource, musicVol, voiceVol);
              } else if (musicSource) {
                // Just music - treat as "voice" arg but it's really the main audio
                merged = await mergeVideoWithAudio(statusData.videoUrl, musicSource);
              } else {
                // Should not happen due to check above
                merged = { url: statusData.videoUrl, blob: await (await fetch(statusData.videoUrl)).blob() };
              }
              
              finalVideoUrl = merged.url;
              const uploadedUrl = await uploadMergedVideo(merged.blob, jobId);
              if (uploadedUrl) {
                finalVideoUrl = uploadedUrl;
              }
            } catch (mergeError) {
              console.warn('Audio merge failed, using original video:', mergeError);
              finalVideoUrl = statusData.videoUrl || null;
            }
          }
          setGeneratedVideo(finalVideoUrl);
          setIsGenerating(false);
          setStep('preview');
          setStatusMessage(null);
          // Refresh usage - wrapped in try-catch to prevent crashes
          if (user) {
            try {
              const res = await fetch(`/api/spacebaddie/checkout?userId=${user.id}`);
              if (res.ok) {
                const data = await res.json();
                setUsage(data.usage);
              }
            } catch (usageErr) {
              console.warn('Failed to refresh usage:', usageErr);
            }
          }
          return;
        }
        
        if (statusData.status === 'failed') {
          // Extract error message - handle both string and object errors
          let errorMsg = 'Video generation failed';
          if (statusData.error) {
            if (typeof statusData.error === 'string') {
              errorMsg = statusData.error;
            } else if (typeof statusData.error === 'object') {
              // Try to extract message from error object
              errorMsg = statusData.error.message || statusData.error.error || JSON.stringify(statusData.error);
            }
          }
          console.error('Video generation failed with error:', statusData.error);
          throw new Error(errorMsg);
        }
        
        attempts++;
        if (attempts > 45) {
          setLongRunning(true);
          setStatusMessage(isCinematicJob 
            ? (isAvatarModel ? 'Avatar video takes 1-2 minutes. Almost there...' : 'LTX-2 generation takes 2-5 minutes for quality. Almost there...')
            : 'Still processing. This can take a few more minutes.'
          );
        }
      }
      
      setLongRunning(true);
      setStatusMessage('Still processing. Check back later.');
      setIsGenerating(false);
      
    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
      setIsGenerating(false);
      setStep('preview');
    }
  };

  const handleStartOver = () => {
    setGenerationProgress(0);
    setIsGenerating(false);
    setGeneratedVideo(null);
    setVoiceoverAudioUrl(null);
    setGenerationError(null);
    setLongRunning(false);
    setStatusMessage(null);
    setActiveJob(null);
    setUploadedImage(null);
    setScript('');
    setStep('upload');
  };

  const steps: StudioStep[] = ['upload', 'customize', 'generate', 'preview'];
  const currentStepIndex = steps.indexOf(step);

  // Calculate estimated cost
  const estimatedCost = cinematicSettings.mode === 'cinematic'
    ? Math.round(cinematicSettings.duration * 6 * (cinematicSettings.resolution === '1080p' ? 1.5 : 1)) // cents
    : settings.duration <= 15 ? 5 : 5 + Math.ceil((settings.duration - 15) * 0.2); // credits

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1f 50%, #0a0a0f 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header with Step Indicator */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/spacebaddie" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <span style={{ fontSize: '24px' }}>🎬</span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                SpaceBaddie
              </span>
            </Link>
            <span style={{ color: '#666' }}>Studio</span>
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3, 4].map((num, i) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: i < currentStepIndex ? '#22c55e' :
                    i === currentStepIndex ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' :
                    'rgba(255,255,255,0.1)',
                  color: i <= currentStepIndex ? '#fff' : '#666',
                }}>
                  {i < currentStepIndex ? '✓' : num}
                </div>
                {i < 3 && <div style={{
                  width: '32px',
                  height: '2px',
                  margin: '0 4px',
                  background: i < currentStepIndex ? '#22c55e' : 'rgba(255,255,255,0.1)',
                }} />}
              </div>
            ))}
          </div>

          {/* Right Side - Credits & User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Credits Display */}
            {user && usage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <span style={{ fontSize: '16px' }}>💎</span>
                <span style={{ fontWeight: 600, color: '#FF6B9D' }}>
                  {usage.creditsBalance}
                </span>
                <Link href="/spacebaddie/pricing" style={{
                  marginLeft: '4px',
                  padding: '4px 8px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: '#fff',
                }}>
                  + Add
                </Link>
              </div>
            )}
            
            {authLoading ? (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            ) : user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {user.email?.charAt(0).toUpperCase() || 'P'}
                </button>
                
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '48px',
                    width: '224px',
                    background: '#1a1a24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '12px', color: '#888' }}>Signed in as</p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>{user.email}</p>
                    </div>
                    <div style={{ padding: '8px' }}>
                      <Link href="/spacebaddie/dashboard" style={{
                        display: 'block',
                        padding: '8px 12px',
                        color: '#ccc',
                        textDecoration: 'none',
                        borderRadius: '8px',
                      }}>
                        Dashboard
                      </Link>
                      <Link href="/spacebaddie/projects" style={{
                        display: 'block',
                        padding: '8px 12px',
                        color: '#ccc',
                        textDecoration: 'none',
                        borderRadius: '8px',
                      }}>
                        My Projects
                      </Link>
                      <button
                        onClick={handleSignOut}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          color: '#FF6B9D',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/spacebaddie/login"
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  color: '#fff',
                }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Success Banner */}
      {showSuccess && (
        <div style={{
          background: 'rgba(34,197,94,0.2)',
          borderBottom: '1px solid rgba(34,197,94,0.3)',
          padding: '12px 24px',
          textAlign: 'center',
        }}>
          <span style={{ color: '#22c55e' }}>✓ Credits added successfully!</span>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, maxWidth: '900px', margin: '0 auto', width: '100%', padding: '48px 24px' }}>
          {/* Upload Step */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 style={{
                fontSize: '40px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Create Your Video
              </h1>
              <p style={{ color: '#888', textAlign: 'center', marginBottom: '24px' }}>
                Upload a photo to transform into a talking video
              </p>

              {/* What are you making? (centralized entry) */}
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '12px', fontWeight: 600 }}>
                What are you making?
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '32px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <button
                  onClick={() => setProjectType('single_video')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    background: projectType === 'single_video' ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'rgba(255,255,255,0.05)',
                    border: projectType === 'single_video' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: projectType === 'single_video' ? '#fff' : '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    maxWidth: '280px',
                    minWidth: '200px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🎬</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>Single video</p>
                    <p style={{ fontSize: '12px', opacity: 0.9 }}>One talking-head or cinematic clip</p>
                  </div>
                </button>
                <button
                  onClick={() => setProjectType('music_video_style')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    background: projectType === 'music_video_style' ? 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)' : 'rgba(255,255,255,0.05)',
                    border: projectType === 'music_video_style' ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: projectType === 'music_video_style' ? '#fff' : '#888',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    maxWidth: '280px',
                    minWidth: '200px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🎵</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>Music video style</p>
                    <p style={{ fontSize: '12px', opacity: 0.9 }}>Mood-based templates and scene suggestions</p>
                  </div>
                </button>
                <button
                  onClick={() => { setProjectType('content_series'); router.push('/spacebaddie/studio/series'); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 24px',
                    background: 'rgba(0,212,212,0.1)',
                    border: '1px solid rgba(0,212,212,0.4)',
                    borderRadius: '12px',
                    color: '#00D4D4',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flex: '1',
                    maxWidth: '280px',
                    minWidth: '200px',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🤖</span>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px' }}>Content series</p>
                    <p style={{ fontSize: '12px', opacity: 0.9 }}>Auto-generate episodes with AI storytelling</p>
                  </div>
                  <span>→</span>
                </button>
              </div>

              {/* Pricing Info */}
              <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '32px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                <div style={{
                  padding: '16px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Basic Video (15s)</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#FF6B9D' }}>5 credits</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>~$0.50</p>
                </div>
                <div style={{
                  padding: '16px 24px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}>Longer Videos</p>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: '#C77DFF' }}>+0.2/sec</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>after 15s</p>
                </div>
                {usage && usage.freeVideosRemaining > 0 && (
                  <div style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(34,197,94,0.1) 100%)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '14px', color: '#22c55e', marginBottom: '4px' }}>Free Videos</p>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{usage.freeVideosRemaining}</p>
                    <p style={{ fontSize: '12px', color: '#22c55e' }}>remaining</p>
                  </div>
                )}
              </div>

              {/* Avatar Mode Toggle - Three Options */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '32px',
                background: 'rgba(255,255,255,0.05)',
                padding: '6px',
                borderRadius: '16px',
              }}>
                <button
                  onClick={() => { setAvatarMode('upload'); setUseCustomImage(true); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    background: avatarMode === 'upload' ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                    color: avatarMode === 'upload' ? '#fff' : '#888',
                  }}
                >
                  📷 Upload Photo
                </button>
                <button
                  onClick={() => { setAvatarMode('face'); setUseCustomImage(false); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    background: avatarMode === 'face' ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                    color: avatarMode === 'face' ? '#fff' : '#888',
                  }}
                >
                  🎭 Face Avatar
                </button>
                <button
                  onClick={() => { setAvatarMode('heygen'); setUseCustomImage(false); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    background: avatarMode === 'heygen' ? 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)' : 'transparent',
                    color: avatarMode === 'heygen' ? '#fff' : '#888',
                  }}
                  title="Professional full-body avatars with gestures"
                >
                  🧍 Full-Body Avatar
                </button>
              </div>

              {/* Engine Selector (for Photo Avatars) */}
              {(avatarMode === 'upload' || avatarMode === 'face') && (
                <div style={{
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  maxWidth: '700px',
                  width: '100%',
                }}>
                  <span style={{ fontSize: '14px', color: '#ccc', fontWeight: 600 }}>Engine:</span>
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <button
                      onClick={() => setEngine('heygen')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: engine === 'heygen' ? '1px solid #C77DFF' : '1px solid transparent',
                        background: engine === 'heygen' ? 'rgba(199,125,255,0.1)' : 'transparent',
                        color: engine === 'heygen' ? '#fff' : '#888',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      Standard (HeyGen)
                    </button>
                    <button
                      onClick={() => setEngine('hedra')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: engine === 'hedra' ? '1px solid #C77DFF' : '1px solid transparent',
                        background: engine === 'hedra' ? 'rgba(199,125,255,0.1)' : 'transparent',
                        color: engine === 'hedra' ? '#fff' : '#888',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                      title="More expressive, emotional characters"
                    >
                      Expressive (Hedra)
                    </button>
                  </div>
                </div>
              )}

              {avatarMode === 'upload' ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    width: '100%',
                    maxWidth: '700px',
                    border: '2px dashed rgba(199,125,255,0.3)',
                    borderRadius: '24px',
                    padding: '64px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(199,125,255,0.05) 0%, rgba(255,107,157,0.05) 100%)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(199,125,255,0.5)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(199,125,255,0.1) 0%, rgba(255,107,157,0.1) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(199,125,255,0.3)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(199,125,255,0.05) 0%, rgba(255,107,157,0.05) 100%)';
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📷</div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Drop your image here</h3>
                  <p style={{ color: '#888', marginBottom: '16px' }}>or click to browse files</p>
                  <p style={{ color: '#666', fontSize: '14px' }}>Supports JPG, PNG, WebP • Max 10MB</p>
                  <div style={{ marginTop: '20px', padding: '12px 16px', background: 'rgba(199,125,255,0.08)', borderRadius: '10px', border: '1px solid rgba(199,125,255,0.15)' }}>
                    <p style={{ color: '#C77DFF', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>SpaceBaddie Tip</p>
                    <p style={{ color: '#999', fontSize: '12px', lineHeight: '1.5' }}>
                      Upload bold, creative, or stylized photos for unique avatar personalities. 
                      AI-generated portraits, cosplay shots, and artistic selfies all work great!
                    </p>
                  </div>
                </div>
              ) : avatarMode === 'face' ? (
                <div style={{ width: '100%', maxWidth: '700px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#ccc' }}>
                    Select a Face Avatar
                  </h3>
                  {loadingProfiles ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                      <p style={{ color: '#888' }}>Loading avatars...</p>
                    </div>
                  ) : faces.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎭</div>
                      <p style={{ color: '#888', marginBottom: '16px' }}>No face avatars available yet</p>
                      <p style={{ color: '#666', fontSize: '14px' }}>Upload your own photo instead</p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '16px',
                      marginBottom: '24px',
                    }}>
                      {faces.map((face) => (
                        <button
                          key={face.id}
                          onClick={() => {
                            setSelectedFace(face.id);
                            // Use face image as the uploaded image
                            if (face.imageUrl) {
                              setUploadedImage(face.imageUrl);
                              setStep('customize');
                            }
                          }}
                          style={{
                            padding: '12px',
                            borderRadius: '16px',
                            border: selectedFace === face.id ? '2px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                            background: selectedFace === face.id ? 'rgba(255,107,157,0.1)' : 'rgba(255,255,255,0.05)',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            margin: '0 auto 8px',
                            background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}>
                            {face.imageUrl ? (
                              <img src={face.imageUrl} alt={face.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '32px' }}>🎭</span>
                            )}
                          </div>
                          <p style={{ fontSize: '12px', color: '#ccc', fontWeight: 500 }}>{face.name}</p>
                          {face.category && <p style={{ fontSize: '10px', color: '#666' }}>{face.category}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {faces.length > 0 && selectedFace && (
                    <button
                      onClick={() => {
                        const face = faces.find(f => f.id === selectedFace);
                        if (face?.imageUrl) {
                          setUploadedImage(face.imageUrl);
                          setStep('customize');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Continue with Selected Avatar
                    </button>
                  )}
                </div>
              ) : (
                /* HeyGen Full-Body Avatar Selection */
                <div style={{ width: '100%', maxWidth: '800px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#ccc' }}>
                      Select a Full-Body Avatar
                    </h3>
                    <p style={{ fontSize: '14px', color: '#888' }}>
                      Professional HeyGen avatars with natural gestures and body language
                    </p>
                  </div>
                  
                  {loadingHeygenAvatars ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                      <p style={{ color: '#888' }}>Loading HeyGen avatars...</p>
                    </div>
                  ) : heygenAvatars.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧍</div>
                      <p style={{ color: '#888', marginBottom: '16px' }}>No HeyGen avatars available</p>
                      <p style={{ color: '#666', fontSize: '14px' }}>Check your HeyGen API configuration or upload a photo instead</p>
                    </div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <input
                          type="text"
                          placeholder="Search avatars by name..."
                          value={avatarSearch}
                          onChange={(e) => setAvatarSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                      </div>
                      
                      {/* Category Filter Tabs */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {(['all', 'featured', 'female', 'male'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setAvatarFilter(filter)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: '20px',
                              border: avatarFilter === filter ? '1px solid #C77DFF' : '1px solid rgba(255,255,255,0.15)',
                              background: avatarFilter === filter
                                ? 'linear-gradient(135deg, rgba(199,125,255,0.25) 0%, rgba(59,130,246,0.25) 100%)'
                                : 'rgba(255,255,255,0.05)',
                              color: avatarFilter === filter ? '#C77DFF' : '#888',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {filter === 'all' ? 'All' : filter === 'featured' ? 'Featured' : filter === 'female' ? 'Female' : 'Male'}
                            {filter !== 'all' && (
                              <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>
                                {filter === 'featured'
                                  ? heygenAvatars.filter(a => (a.name || '').toLowerCase().match(/^(anna|sophia|alex|marcus|lisa|emma|james|rachel|sarah|michael)/)).length
                                  : heygenAvatars.filter(a => (a.gender || '').toLowerCase() === filter).length}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* SpaceBaddie Exclusive Section */}
                      {avatarFilter === 'all' && !avatarSearch && (
                        <div style={{
                          marginBottom: '20px',
                          padding: '16px',
                          background: 'linear-gradient(135deg, rgba(199,125,255,0.08) 0%, rgba(255,107,157,0.08) 100%)',
                          border: '1px solid rgba(199,125,255,0.2)',
                          borderRadius: '16px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '16px' }}>💎</span>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#C77DFF', margin: 0 }}>SpaceBaddie Picks</h4>
                            <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>Bold • Expressive • Unique</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {heygenAvatars
                              .filter(a => {
                                const name = (a.name || '').toLowerCase();
                                // Pick the first 6 unique-looking avatars as "exclusive" picks
                                const picks = ['sophia', 'anna', 'alex', 'rachel', 'marcus', 'lisa', 'emma', 'james'];
                                return picks.some(p => name.startsWith(p));
                              })
                              .slice(0, 6)
                              .map((avatar) => (
                                <button
                                  key={`pick-${avatar.id}`}
                                  onClick={() => setSelectedAvatar(avatar.id)}
                                  style={{
                                    flex: '0 0 100px',
                                    padding: '8px',
                                    borderRadius: '12px',
                                    border: selectedAvatar === avatar.id ? '2px solid #C77DFF' : '1px solid rgba(199,125,255,0.2)',
                                    background: selectedAvatar === avatar.id ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div style={{
                                    width: '100%',
                                    aspectRatio: '3/4',
                                    borderRadius: '8px',
                                    marginBottom: '6px',
                                    background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                                    overflow: 'hidden',
                                  }}>
                                    {avatar.preview_url && (
                                      <img src={avatar.preview_url} alt={avatar.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    )}
                                  </div>
                                  <p style={{ fontSize: '10px', color: '#C77DFF', fontWeight: 600 }}>{avatar.name || 'Avatar'}</p>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Avatar Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '16px',
                        marginBottom: '24px',
                        maxHeight: '480px',
                        overflowY: 'auto',
                        paddingRight: '4px',
                      }}>
                        {heygenAvatars
                          .filter((avatar) => {
                            // Search filter
                            if (avatarSearch) {
                              const q = avatarSearch.toLowerCase();
                              const name = (avatar.name || '').toLowerCase();
                              const gender = (avatar.gender || '').toLowerCase();
                              if (!name.includes(q) && !gender.includes(q)) return false;
                            }
                            // Category filter
                            if (avatarFilter === 'female') return (avatar.gender || '').toLowerCase() === 'female';
                            if (avatarFilter === 'male') return (avatar.gender || '').toLowerCase() === 'male';
                            if (avatarFilter === 'featured') {
                              // Feature first ~10 avatars as "featured" picks
                              const featuredNames = ['anna', 'sophia', 'alex', 'marcus', 'lisa', 'emma', 'james', 'rachel', 'sarah', 'michael'];
                              return featuredNames.some(n => (avatar.name || '').toLowerCase().startsWith(n));
                            }
                            return true;
                          })
                          .map((avatar) => (
                          <button
                            key={avatar.id}
                            onClick={() => {
                              setSelectedAvatar(avatar.id);
                            }}
                            style={{
                              padding: '12px',
                              borderRadius: '16px',
                              border: selectedAvatar === avatar.id 
                                ? '2px solid #3B82F6' 
                                : '1px solid rgba(255,255,255,0.1)',
                              background: selectedAvatar === avatar.id 
                                ? 'rgba(59,130,246,0.15)' 
                                : 'rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                            }}
                          >
                            <div style={{
                              width: '100%',
                              aspectRatio: '3/4',
                              borderRadius: '12px',
                              marginBottom: '8px',
                              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}>
                              {avatar.preview_url ? (
                                <img 
                                  src={avatar.preview_url} 
                                  alt={avatar.name || 'Avatar'} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                              ) : (
                                <span style={{ fontSize: '48px' }}>🧍</span>
                              )}
                            </div>
                            <p style={{ 
                              fontSize: '12px', 
                              color: selectedAvatar === avatar.id ? '#3B82F6' : '#ccc', 
                              fontWeight: 600,
                              marginBottom: '2px',
                            }}>
                              {avatar.name || 'Avatar'}
                            </p>
                            {avatar.gender && (
                              <p style={{ fontSize: '10px', color: '#666' }}>
                                {avatar.gender}
                              </p>
                            )}
                            {avatar.type && (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '9px',
                                fontWeight: 600,
                                marginTop: '4px',
                                background: avatar.type === 'public' 
                                  ? 'rgba(34,197,94,0.2)' 
                                  : 'rgba(59,130,246,0.2)',
                                color: avatar.type === 'public' ? '#22c55e' : '#3B82F6',
                              }}>
                                {avatar.type === 'public' ? 'Public' : 'Instant'}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {selectedAvatar && (
                        <button
                          onClick={() => {
                            // For HeyGen avatars, we don't need an uploaded image
                            // We'll pass the avatarId directly in handleGenerate
                            setUploadedImage('heygen-avatar-placeholder');
                            setStep('customize');
                          }}
                          style={{
                            width: '100%',
                            padding: '16px',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '16px',
                          }}
                        >
                          Continue with Full-Body Avatar
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Customize Step */}
          {step === 'customize' && uploadedImage && (
            <div>
              <h1 style={{
                fontSize: '40px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Customize Your Video
              </h1>
              <p style={{ color: '#888', textAlign: 'center', marginBottom: '24px' }}>
                Pick a template or customize your own settings
              </p>

              <FilmCrewStrip showTagline={true} />

              {/* Experience level: Beginner vs Advanced */}
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: '#888', fontWeight: 600 }}>Experience level</p>
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px' }}>
                  <button
                    onClick={() => setStudioLevel('beginner')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: studioLevel === 'beginner' ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                      color: studioLevel === 'beginner' ? '#fff' : '#888',
                    }}
                  >
                    🌟 Beginner
                  </button>
                  <button
                    onClick={() => setStudioLevel('advanced')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: studioLevel === 'advanced' ? 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)' : 'transparent',
                      color: studioLevel === 'advanced' ? '#fff' : '#888',
                    }}
                  >
                    🎬 Advanced
                  </button>
                </div>
                {studioLevel === 'beginner' && (
                  <>
                    <p style={{ fontSize: '12px', color: '#888' }}>Vibe (Director & DP set this for you)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                      {VIBE_PRESETS.map((vibe) => (
                        <button
                          key={vibe.id}
                          onClick={() => setCinematicSettings((prev) => ({
                            ...prev,
                            expressionStyle: vibe.expressionStyle,
                            speakingStyle: vibe.speakingStyle,
                            characterPosition: vibe.characterPosition,
                          }))}
                          style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            border: cinematicSettings.expressionStyle === vibe.expressionStyle ? '2px solid #C77DFF' : '1px solid rgba(255,255,255,0.2)',
                            background: cinematicSettings.expressionStyle === vibe.expressionStyle ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.05)',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>{vibe.icon}</span>
                          {vibe.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '8px',
                        color: '#aaa',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {showAdvancedOptions ? 'Hide Advanced-style options' : 'Try Advanced-style options'}
                    </button>
                  </>
                )}
              </div>

              {/* Scene Templates with Categories */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                    🎬 Quick Start Templates
                  </h3>
                  <button
                    onClick={() => setShowMusicVideoHelper(!showMusicVideoHelper)}
                    style={{
                      padding: '8px 16px',
                      background: showMusicVideoHelper 
                        ? 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)' 
                        : 'rgba(199,125,255,0.15)',
                      border: '1px solid rgba(199,125,255,0.4)',
                      borderRadius: '20px',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🎵 Music video style suggestions
                  </button>
                </div>

                {/* Music Video Helper Panel */}
                {showMusicVideoHelper && (
                  <div style={{
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(199,125,255,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                    border: '1px solid rgba(199,125,255,0.3)',
                    borderRadius: '16px',
                    marginBottom: '20px',
                  }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#C77DFF', marginBottom: '12px' }}>
                      🎤 What's the mood of your song?
                    </h4>
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                      Select a genre/mood to get AI-powered scene suggestions for your music video
                    </p>
                    
                    {/* Mood Selection */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                      gap: '10px',
                      marginBottom: '16px',
                    }}>
                      {MUSIC_VIDEO_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => setSelectedMusicMood(selectedMusicMood === suggestion.id ? null : suggestion.id)}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            border: selectedMusicMood === suggestion.id 
                              ? '2px solid #C77DFF' 
                              : '1px solid rgba(255,255,255,0.1)',
                            background: selectedMusicMood === suggestion.id 
                              ? 'rgba(199,125,255,0.2)' 
                              : 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>{suggestion.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>{suggestion.genre}</span>
                          </div>
                          <p style={{ fontSize: '10px', color: '#888' }}>{suggestion.mood}</p>
                        </button>
                      ))}
                    </div>
                    
                    {/* Show suggestions for selected mood */}
                    {selectedMusicMood && (
                      <div style={{
                        padding: '16px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '12px',
                      }}>
                        {(() => {
                          const suggestion = MUSIC_VIDEO_SUGGESTIONS.find(s => s.id === selectedMusicMood);
                          if (!suggestion) return null;
                          return (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '24px' }}>{suggestion.icon}</span>
                                <div>
                                  <h5 style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                                    {suggestion.genre} Visual Style
                                  </h5>
                                  <p style={{ fontSize: '11px', color: '#C77DFF' }}>{suggestion.visualStyle}</p>
                                </div>
                              </div>
                              
                              <div style={{ marginBottom: '12px' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>💡 Suggested Scenes:</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {suggestion.suggestedScenes.map((scene, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSceneInstruction(scene)}
                                      style={{
                                        padding: '6px 10px',
                                        background: 'rgba(199,125,255,0.15)',
                                        border: '1px solid rgba(199,125,255,0.3)',
                                        borderRadius: '6px',
                                        color: '#C77DFF',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {scene}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div>
                                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>🎨 Color Palette:</p>
                                  <p style={{ fontSize: '11px', color: '#fff' }}>{suggestion.colorPalette}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>📹 Best Camera Motions:</p>
                                  <p style={{ fontSize: '11px', color: '#fff' }}>
                                    {suggestion.cameraMotions.map(m => m.replace('_', ' ')).join(', ')}
                                  </p>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: 'rgba(59,130,246,0.1)', 
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '8px',
                    }}>
                      <p style={{ fontSize: '12px', color: '#3B82F6' }}>
                        💡 <strong>Tip for music videos:</strong> Generate multiple short clips (5-10 seconds each) using different templates, then combine them in your video editor to match the song's beats and transitions.
                      </p>
                    </div>
                  </div>
                )}

                {/* Category Tabs */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  overflowX: 'auto',
                  padding: '4px 0',
                }}>
                  {[
                    { id: 'all', label: '✨ All', count: ALL_SCENE_TEMPLATES.length },
                    { id: 'social', label: '📱 Social', count: ALL_SCENE_TEMPLATES.filter(t => t.category === 'social').length },
                    { id: 'business', label: '💼 Business', count: ALL_SCENE_TEMPLATES.filter(t => t.category === 'business').length },
                    { id: 'story', label: '📖 Story', count: ALL_SCENE_TEMPLATES.filter(t => t.category === 'story').length },
                    { id: 'creative', label: '🎨 Creative', count: ALL_SCENE_TEMPLATES.filter(t => t.category === 'creative').length },
                    { id: 'music', label: '🎵 Music', count: ALL_SCENE_TEMPLATES.filter(t => t.category === 'music').length },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setTemplateCategory(cat.id as TemplateCategory)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: templateCategory === cat.id 
                          ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' 
                          : 'rgba(255,255,255,0.05)',
                        color: templateCategory === cat.id ? '#fff' : '#888',
                      }}
                    >
                      {cat.label} ({cat.count})
                    </button>
                  ))}
                </div>
                
                {/* Template Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '12px',
                  maxWidth: '900px',
                  margin: '0 auto',
                }}>
                  {ALL_SCENE_TEMPLATES
                    .filter(t => templateCategory === 'all' || t.category === templateCategory)
                    .map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applySceneTemplate(template)}
                      style={{
                        padding: '16px 12px',
                        borderRadius: '12px',
                        border: template.category === 'creative' || template.category === 'music'
                          ? '1px solid rgba(199,125,255,0.3)'
                          : '1px solid rgba(255,255,255,0.1)',
                        background: template.category === 'creative' || template.category === 'music'
                          ? 'rgba(199,125,255,0.05)'
                          : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,107,157,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255,107,157,0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = template.category === 'creative' || template.category === 'music'
                          ? 'rgba(199,125,255,0.05)'
                          : 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = template.category === 'creative' || template.category === 'music'
                          ? 'rgba(199,125,255,0.3)'
                          : 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{template.icon}</div>
                      <p style={{ fontWeight: 600, fontSize: '13px', color: '#fff', marginBottom: '4px' }}>{template.name}</p>
                      <p style={{ fontSize: '11px', color: '#666' }}>{template.description}</p>
                      {/* Show expression style badge */}
                      {template.expressionStyle && (
                        <span style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          padding: '2px 6px',
                          background: 'rgba(255,107,157,0.2)',
                          borderRadius: '4px',
                          fontSize: '9px',
                          color: '#FF6B9D',
                        }}>
                          {template.expressionStyle}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Hints (Scene direction) & Scene Instructions */}
              <div style={{ 
                maxWidth: '900px', 
                margin: '0 auto 32px',
                padding: '24px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
              }}>
                {/* Scene & Background Settings */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ccc' }}>
                      🎬 Scene & Background
                    </h3>
                    <button
                      onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(199,125,255,0.2)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#C77DFF',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {showBackgroundPicker ? 'Hide options' : 'Change scene'}
                    </button>
                  </div>

                  {/* Cinematic Scene Toggle */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    marginBottom: '12px',
                    background: cinematicScene
                      ? 'linear-gradient(135deg, rgba(255,0,110,0.12) 0%, rgba(138,43,226,0.12) 100%)'
                      : 'rgba(255,255,255,0.03)',
                    border: cinematicScene ? '1px solid rgba(255,0,110,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setCinematicScene(!cinematicScene)}
                  >
                    <div style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: cinematicScene ? 'linear-gradient(135deg, #FF006E, #8A2BE2)' : 'rgba(255,255,255,0.15)',
                      position: 'relative',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '2px',
                        left: cinematicScene ? '22px' : '2px',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: cinematicScene ? '#fff' : '#aaa', margin: 0 }}>
                        Cinematic Scene Mode
                      </p>
                      <p style={{ fontSize: '11px', color: cinematicScene ? '#ccc' : '#666', margin: '2px 0 0' }}>
                        {cinematicScene
                          ? 'AI places you IN the selected scene with realistic environments'
                          : 'Enable for real-life scenes (beach, office, studio, etc.)'}
                      </p>
                    </div>
                  </div>

                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
                    {cinematicScene
                      ? 'Select a scene below — AI will generate you speaking in that real environment'
                      : 'Choose a background style for your video'}
                  </p>
                  
                  {/* Current Background Display */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    marginBottom: showBackgroundPicker ? '16px' : '0',
                  }}>
                    <span style={{ fontSize: '24px' }}>
                      {BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.icon || '🎨'}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                        {BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.name || 'Custom'}
                      </p>
                      <p style={{ fontSize: '12px', color: '#666' }}>
                        {selectedBackground === 'custom' 
                          ? (customBackgroundPrompt || 'Describe your background below')
                          : BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Background Picker Grid */}
                  {showBackgroundPicker && (
                    <div>
                      {/* Category Tabs */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {['professional', 'creative', 'nature', 'abstract', 'custom'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              const first = BACKGROUND_SCENES.find(b => b.category === cat);
                              if (first) setSelectedBackground(first.id);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              background: BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.category === cat
                                ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                                : 'rgba(255,255,255,0.05)',
                              color: BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.category === cat ? '#fff' : '#888',
                              textTransform: 'capitalize',
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      
                      {/* Background Options */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '8px',
                      }}>
                        {BACKGROUND_SCENES.filter(b => 
                          b.category === (BACKGROUND_SCENES.find(bg => bg.id === selectedBackground)?.category || 'professional')
                        ).map((bg) => (
                          <button
                            key={bg.id}
                            onClick={() => setSelectedBackground(bg.id)}
                            style={{
                              padding: '12px 8px',
                              borderRadius: '8px',
                              border: selectedBackground === bg.id ? '2px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                              background: selectedBackground === bg.id ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.03)',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{bg.icon}</div>
                            <p style={{ fontSize: '11px', color: selectedBackground === bg.id ? '#fff' : '#888', fontWeight: 500 }}>{bg.name}</p>
                          </button>
                        ))}
                      </div>
                      
                      {/* Custom Background Prompt */}
                      {selectedBackground === 'custom' && (
                        <div style={{ marginTop: '12px' }}>
                          <textarea
                            value={customBackgroundPrompt}
                            onChange={(e) => setCustomBackgroundPrompt(e.target.value)}
                            placeholder="Describe your style or scene... e.g., 'A cozy coffee shop with warm lighting' (influences AI style only)"
                            style={{
                              width: '100%',
                              height: '80px',
                              padding: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              resize: 'none',
                              outline: 'none',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Scene Instruction */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#ccc', marginBottom: '8px' }}>
                    🎬 Scene Instructions <span style={{ fontWeight: 400, color: '#666' }}>(Optional)</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                    Describe what the avatar should do, their expression, or actions in the scene
                  </p>
                  <textarea
                    value={sceneInstruction}
                    onChange={(e) => setSceneInstruction(e.target.value)}
                    placeholder="e.g., 'Avatar is excited and gesturing with hands while explaining', 'Looking thoughtful with a slight smile', 'Presenting a product with enthusiasm'"
                    style={{
                      width: '100%',
                      height: '80px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      resize: 'none',
                      outline: 'none',
                      fontSize: '13px',
                    }}
                  />
                  <p style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>
                    💡 Tip: Be specific about emotions, gestures, and camera angles for best results
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                {/* Preview */}
                <div>
                  <div style={{
                    aspectRatio: '9/16',
                    maxHeight: '500px',
                    background: 'linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(255,107,157,0.3) 100%)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {/* Show HeyGen avatar preview or uploaded image */}
                    {avatarMode === 'heygen' && selectedAvatar ? (
                      (() => {
                        const avatar = heygenAvatars.find(a => a.id === selectedAvatar);
                        return avatar?.preview_url ? (
                          <img src={avatar.preview_url} alt={avatar.name || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                          }}>
                            <span style={{ fontSize: '80px', marginBottom: '16px' }}>🧍</span>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{avatar?.name || 'Full-Body Avatar'}</p>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginTop: '4px' }}>HeyGen Avatar Selected</p>
                          </div>
                        );
                      })()
                    ) : (
                      <img src={uploadedImage || ''} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {/* Background & Scene Info Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#C77DFF',
                      }}>
                        {BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.icon} {BACKGROUND_SCENES.find(b => b.id === selectedBackground)?.name}
                      </span>
                      {sceneInstruction && (
                        <span style={{
                          padding: '4px 8px',
                          background: 'rgba(0,0,0,0.6)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: '#FF6B9D',
                        }}>
                          🎬 Scene set
                        </span>
                      )}
                    </div>
                    {script && (
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '12px',
                        padding: '12px',
                      }}>
                        <p style={{ fontSize: '14px', color: '#ccc' }}>{script.slice(0, 100)}{script.length > 100 ? '...' : ''}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => { setUploadedImage(null); setStep('upload'); }}
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      color: '#888',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    ← Change image
                  </button>
                </div>

                {/* Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Cinematic Controls - shown in Advanced or when Beginner expands "Try Advanced-style" */}
                  {(studioLevel === 'advanced' || showAdvancedOptions) && (
                    <CinematicControls
                      settings={cinematicSettings}
                      onChange={setCinematicSettings}
                      onRemoveImage={handleRemoveAdditionalImage}
                    />
                  )}
                  
                  {/* Add More Images Button (for cinematic mode) */}
                  {cinematicSettings.mode === 'cinematic' && (
                    <div>
                      <input
                        ref={additionalImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAdditionalImageUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => additionalImageInputRef.current?.click()}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'rgba(199,125,255,0.1)',
                          border: '1px dashed rgba(199,125,255,0.4)',
                          borderRadius: '12px',
                          color: '#C77DFF',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>➕</span> Add More Images for Multi-Scene Video
                      </button>
                      {additionalImages.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '8px', textAlign: 'center' }}>
                          {additionalImages.length + 1} images added • Creates a {(additionalImages.length + 1) * cinematicSettings.imageDuration}s video
                        </p>
                      )}
                    </div>
                  )}

                  {/* Script Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 500, color: '#ccc' }}>
                        Script / What should they say?
                      </label>
                      <div style={{
                        display: 'flex',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '2px',
                      }}>
                        <button
                          onClick={() => setUseAIScript(false)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            background: !useAIScript ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                            color: !useAIScript ? '#fff' : '#888',
                          }}
                        >
                          ✍️ Write
                        </button>
                        <button
                          onClick={() => setUseAIScript(true)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            background: useAIScript ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                            color: useAIScript ? '#fff' : '#888',
                          }}
                        >
                          ✨ AI Suggest
                        </button>
                      </div>
                    </div>

                    {useAIScript ? (
                      <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                      }}>
                        {/* Topic Input */}
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                            What's your video about?
                          </label>
                          <input
                            type="text"
                            value={scriptTopic}
                            onChange={(e) => setScriptTopic(e.target.value)}
                            placeholder="e.g., Morning skincare routine, Product launch, Motivation..."
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              outline: 'none',
                            }}
                          />
                        </div>

                        {/* Tone Selection */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                            Tone & Style
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {[
                              { id: 'engaging', label: '🎯 Engaging', desc: 'Hook viewers' },
                              { id: 'professional', label: '💼 Professional', desc: 'Business tone' },
                              { id: 'friendly', label: '😊 Friendly', desc: 'Casual & warm' },
                              { id: 'funny', label: '😂 Funny', desc: 'Humorous' },
                              { id: 'inspirational', label: '✨ Inspirational', desc: 'Motivating' },
                              { id: 'educational', label: '📚 Educational', desc: 'Informative' },
                            ].map((tone) => (
                              <button
                                key={tone.id}
                                onClick={() => setScriptTone(tone.id)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: scriptTone === tone.id ? '1px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                                  background: scriptTone === tone.id ? 'rgba(255,107,157,0.15)' : 'transparent',
                                  color: scriptTone === tone.id ? '#fff' : '#888',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                {tone.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Generate Button */}
                        <button
                          onClick={generateAIScript}
                          disabled={!scriptTopic.trim() || generatingScript}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: !scriptTopic.trim() || generatingScript
                              ? 'rgba(255,255,255,0.1)'
                              : 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: !scriptTopic.trim() || generatingScript ? 'not-allowed' : 'pointer',
                            marginBottom: '12px',
                          }}
                        >
                          {generatingScript ? '✨ Generating ideas...' : '✨ Generate Script Ideas'}
                        </button>

                        {/* Suggested Scripts */}
                        {suggestedScripts.length > 0 && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                              Choose a script or edit below:
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {suggestedScripts.map((suggested, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setScript(suggested)}
                                  style={{
                                    padding: '12px',
                                    background: script === suggested ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.05)',
                                    border: script === suggested ? '1px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#ccc',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    lineHeight: '1.5',
                                  }}
                                >
                                  {suggested}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Editable Script */}
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          placeholder="Your script will appear here... or type your own!"
                          style={{
                            width: '100%',
                            height: '80px',
                            padding: '12px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            resize: 'none',
                            outline: 'none',
                            fontSize: '13px',
                          }}
                        />
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                          💡 Tip: Edit the script to make it your own!
                        </p>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          value={script}
                          onChange={(e) => setScript(e.target.value)}
                          placeholder="Enter what you want your avatar to say..."
                          style={{
                            width: '100%',
                            height: '112px',
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            resize: 'none',
                            outline: 'none',
                          }}
                        />
                        {/* Quick AI Suggest Button */}
                        <button
                          onClick={quickAISuggest}
                          disabled={quickSuggesting}
                          style={{
                            marginTop: '8px',
                            padding: '8px 16px',
                            background: quickSuggesting
                              ? 'rgba(255,255,255,0.1)'
                              : 'linear-gradient(135deg, rgba(199,125,255,0.3) 0%, rgba(59,130,246,0.3) 100%)',
                            border: '1px solid rgba(199,125,255,0.3)',
                            borderRadius: '8px',
                            color: '#C77DFF',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: quickSuggesting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {quickSuggesting ? 'Generating...' : 'AI Suggest Script'}
                        </button>

                        {/* Quick Suggestions */}
                        {quickSuggestions.length > 0 && (
                          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <p style={{ fontSize: '11px', color: '#888' }}>Pick a suggestion:</p>
                            {quickSuggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => setScript(s.script)}
                                style={{
                                  padding: '10px 12px',
                                  background: script === s.script ? 'rgba(199,125,255,0.15)' : 'rgba(255,255,255,0.04)',
                                  border: script === s.script ? '1px solid #C77DFF' : '1px solid rgba(255,255,255,0.08)',
                                  borderRadius: '8px',
                                  color: '#ccc',
                                  fontSize: '12px',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  lineHeight: '1.5',
                                }}
                              >
                                <span style={{ color: '#C77DFF', fontWeight: 600, fontSize: '11px' }}>{s.title}</span>
                                <br />
                                {s.script.length > 120 ? s.script.slice(0, 120) + '...' : s.script}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {cinematicSettings.mode === 'cinematic' && !uploadedAudio && (
                      <p style={{ fontSize: '11px', marginTop: '8px', color: script.length > maxVoiceoverChars ? '#FCA5A5' : '#666' }}>
                        Voiceover limit: {script.length}/{maxVoiceoverChars} characters
                      </p>
                    )}
                  </div>

                  {/* Voice & Audio Section */}
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
                      Voice / Audio
                    </label>
                    
                    {/* Cinematic Mode Notice - voiceover support */}
                    {cinematicSettings.mode === 'cinematic' && (
                      <div style={{
                        padding: '12px 16px',
                        marginBottom: '12px',
                        background: 'rgba(234, 179, 8, 0.1)',
                        border: '1px solid rgba(234, 179, 8, 0.3)',
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '13px', color: '#EAB308', margin: 0 }}>
                          <strong>Note:</strong> Cinematic mode renders video first, then we add your voiceover.
                        </p>
                      </div>
                    )}

                    {cinematicSettings.mode === 'cinematic' && !uploadedAudio && ttsAvailable === false && (
                      <div style={{
                        padding: '12px 16px',
                        marginBottom: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '8px',
                      }}>
                        <p style={{ fontSize: '13px', color: '#FCA5A5', margin: 0 }}>
                          <strong>Voiceover disabled:</strong> AI voice requires `OPENAI_API_KEY`. Upload audio to include voice in cinematic mode.
                        </p>
                      </div>
                    )}
                    
                    {/* Voice Mode Tabs */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      padding: '4px',
                      marginBottom: '12px',
                    }}>
                      <button
                        onClick={() => setUploadedAudio(null)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: !uploadedAudio ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                          color: !uploadedAudio ? '#fff' : '#888',
                        }}
                      >
                        🎙️ AI Voice
                      </button>
                      <button
                        onClick={() => audioInputRef.current?.click()}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: uploadedAudio ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)' : 'transparent',
                          color: uploadedAudio ? '#fff' : '#888',
                        }}
                      >
                        🎧 Upload Audio
                      </button>
                    </div>
                    
                    {/* Hidden Audio Input */}
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/*"
                      onChange={handleAudioUpload}
                      style={{ display: 'none' }}
                    />
                    
                    {uploadedAudio ? (
                      /* Uploaded Audio Display */
                      <div style={{
                        padding: '16px',
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: '12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '24px' }}>🎵</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>Custom Audio Uploaded</p>
                            <p style={{ fontSize: '11px', color: '#888' }}>Your avatar will speak with this audio</p>
                          </div>
                          <button
                            onClick={() => setUploadedAudio(null)}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(255,59,48,0.2)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#FF3B30',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                        <audio 
                          controls 
                          src={uploadedAudio} 
                          style={{ width: '100%', height: '32px' }}
                        />
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                          💡 The avatar's lips will sync to this audio
                        </p>
                      </div>
                    ) : voices.length > 0 ? (
                      /* AI Voice Selection */
                      <div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '8px',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          padding: '4px',
                        }}>
                          {voices.map((voice) => (
                            <button
                              key={voice.id}
                              onClick={() => setSelectedVoice(voice.id)}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                fontWeight: 500,
                                border: selectedVoice === voice.id ? '2px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                background: selectedVoice === voice.id
                                  ? 'rgba(255,107,157,0.15)'
                                  : 'rgba(255,255,255,0.05)',
                                color: selectedVoice === voice.id ? '#fff' : '#888',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ fontSize: '16px', marginBottom: '4px' }}>🎙️</div>
                              <p style={{ fontSize: '13px', fontWeight: 600 }}>{voice.name}</p>
                              {voice.gender && <p style={{ fontSize: '11px', color: '#666' }}>{voice.gender}</p>}
                            </button>
                          ))}
                        </div>
                        <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                          💡 Select a voice or upload your own audio above
                        </p>
                      </div>
                    ) : (
                      /* Fallback Voice Styles */
                      <div>
                        {/* Voice Gender Toggle */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          {(['female', 'male'] as const).map((g) => (
                            <button
                              key={g}
                              onClick={() => setVoiceGender(g)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '13px',
                                border: voiceGender === g ? '2px solid #FF6B9D' : '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                background: voiceGender === g ? 'rgba(255,107,157,0.15)' : 'rgba(255,255,255,0.03)',
                                color: voiceGender === g ? '#FF6B9D' : '#888',
                              }}
                            >
                              {g === 'female' ? '♀ Female' : '♂ Male'}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                          {['Natural', 'Energetic', 'Professional'].map((voice) => (
                            <button
                              key={voice}
                              onClick={() => setSettings({ ...settings, voice: voice.toLowerCase() })}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                fontWeight: 500,
                                border: 'none',
                                cursor: 'pointer',
                                background: settings.voice === voice.toLowerCase()
                                  ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                                  : 'rgba(255,255,255,0.05)',
                                color: settings.voice === voice.toLowerCase() ? '#fff' : '#888',
                              }}
                            >
                              {voice}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => audioInputRef.current?.click()}
                          style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '12px',
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px dashed rgba(59,130,246,0.4)',
                            borderRadius: '8px',
                            color: '#3B82F6',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          🎧 Or upload your own audio file (MP3, WAV, M4A)
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>Aspect Ratio</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { value: '9:16', label: 'Vertical' },
                        { value: '16:9', label: 'Horizontal' },
                        { value: '1:1', label: 'Square' }
                      ].map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setSettings({ ...settings, aspectRatio: ratio.value as VideoSettings['aspectRatio'] })}
                          style={{
                            padding: '12px',
                            borderRadius: '12px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            background: settings.aspectRatio === ratio.value
                              ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
                              : 'rgba(255,255,255,0.05)',
                            color: settings.aspectRatio === ratio.value ? '#fff' : '#888',
                          }}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#ccc', marginBottom: '8px' }}>
                      Duration: {settings.duration}s
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={settings.duration}
                      onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#8A2BE2' }}
                    />
                  </div>

                  {/* Cost Display */}
                  <div style={{
                    padding: '16px',
                    background: cinematicSettings.mode === 'cinematic' 
                      ? 'linear-gradient(135deg, rgba(199,125,255,0.1) 0%, rgba(59,130,246,0.1) 100%)'
                      : 'rgba(255,255,255,0.05)',
                    border: cinematicSettings.mode === 'cinematic'
                      ? '1px solid rgba(199,125,255,0.3)'
                      : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#888' }}>Estimated Cost</span>
                        {cinematicSettings.mode === 'cinematic' && (
                          <p style={{ fontSize: '11px', color: '#C77DFF', marginTop: '4px' }}>
                            AI Film Crew · Hedra Cinematic
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: '24px', fontWeight: 700, color: cinematicSettings.mode === 'cinematic' ? '#C77DFF' : '#FF6B9D' }}>
                        {cinematicSettings.mode === 'cinematic' ? (
                          `~${estimatedCost}¢`
                        ) : usage && usage.freeVideosRemaining > 0 ? (
                          <span style={{ color: '#22c55e' }}>FREE</span>
                        ) : (
                          `${estimatedCost} credits`
                        )}
                      </span>
                    </div>
                    {cinematicSettings.mode !== 'cinematic' && usage && usage.freeVideosRemaining > 0 && (
                      <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>
                        Using 1 of your {usage.freeVideosRemaining} free videos
                      </p>
                    )}
                    {cinematicSettings.mode === 'cinematic' && (
                      <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
                        Resolution: {cinematicSettings.resolution} • Style: {cinematicSettings.expressionStyle} • {cinematicSettings.speakingStyle.replace('_', ' ')}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!usage?.canCreate && !usage?.freeVideosRemaining}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: (!usage?.canCreate && !usage?.freeVideosRemaining)
                        ? 'rgba(255,255,255,0.1)'
                        : cinematicSettings.mode === 'cinematic'
                          ? 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)'
                          : 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '18px',
                      border: 'none',
                      cursor: (!usage?.canCreate && !usage?.freeVideosRemaining) ? 'not-allowed' : 'pointer',
                      color: '#fff',
                      boxShadow: cinematicSettings.mode === 'cinematic'
                        ? '0 10px 30px rgba(199,125,255,0.3)'
                        : '0 10px 30px rgba(255,0,110,0.3)',
                    }}
                  >
                    {cinematicSettings.mode === 'cinematic' 
                      ? `Your multi-line team will generate this video (~${estimatedCost}¢)`
                      : usage && usage.freeVideosRemaining > 0 
                        ? 'Generate Free Video' 
                        : `Generate Video (${estimatedCost} credits)`
                    }
                  </button>

                  {!usage?.canCreate && !usage?.freeVideosRemaining && (
                    <Link
                      href="/spacebaddie/pricing"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px',
                        color: '#FF6B9D',
                        textDecoration: 'none',
                      }}
                    >
                      Get credits to continue →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Generate Step */}
          {step === 'generate' && (
            <div style={{ textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {cinematicSettings.mode === 'cinematic' && (
                <div style={{ width: '100%', maxWidth: '600px', marginBottom: '16px' }}>
                  <FilmCrewStrip compact showTagline={false} />
                </div>
              )}
              <div style={{ fontSize: '80px', marginBottom: '24px', animation: 'bounce 1s infinite' }}>🎬</div>
              <h1 style={{
                fontSize: '40px',
                fontWeight: 700,
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Creating Your Video
              </h1>
              
              {/* Progress Stage Indicator */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}>
                {[
                  { stage: 'Uploading', min: 0, max: 10, icon: '📤' },
                  { stage: 'Processing', min: 10, max: 30, icon: '⚙️' },
                  { stage: 'Generating', min: 30, max: 80, icon: '🎬' },
                  { stage: 'Rendering', min: 80, max: 95, icon: '🎨' },
                  { stage: 'Finalizing', min: 95, max: 100, icon: '✅' },
                ].map((s, idx) => {
                  const isActive = generationProgress >= s.min && generationProgress < s.max;
                  const isComplete = generationProgress >= s.max;
                  return (
                    <div 
                      key={s.stage}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(255,0,110,0.2) 0%, rgba(138,43,226,0.2) 100%)'
                          : isComplete 
                            ? 'rgba(0,212,180,0.15)'
                            : 'rgba(255,255,255,0.05)',
                        border: isActive ? '1px solid rgba(255,107,157,0.5)' : '1px solid transparent',
                      }}
                    >
                      <span style={{ fontSize: '14px' }}>{isComplete ? '✓' : s.icon}</span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: isActive ? '#FF6B9D' : isComplete ? '#00D4B4' : '#666',
                        fontWeight: isActive ? 600 : 400,
                      }}>
                        {s.stage}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Multi-line team messaging (cinematic) */}
              {cinematicSettings.mode === 'cinematic' && (
                <p style={{ color: '#C77DFF', marginBottom: '12px', fontSize: '14px', fontWeight: 500 }}>
                  Your multi-line team is on it — Director and DP are setting the look.
                </p>
              )}
              {/* Time Estimate */}
              <p style={{ color: '#888', marginBottom: '24px', fontSize: '14px' }}>
                {cinematicSettings.mode === 'cinematic' 
                  ? 'Cinematic videos take 2-5 minutes for best quality'
                  : 'Standard videos usually take 30-60 seconds'}
              </p>
              
              <div style={{ width: '100%', maxWidth: '400px', marginBottom: '16px' }}>
                <div style={{ height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{
                      height: '100%',
                      background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                      transition: 'width 0.3s',
                      width: `${generationProgress}%`,
                    }}
                  />
                </div>
              </div>
              <p style={{ color: '#666', fontSize: '16px', fontWeight: 600 }}>{generationProgress}% complete</p>

              {statusMessage && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 20px',
                  background: 'rgba(199,125,255,0.1)',
                  border: '1px solid rgba(199,125,255,0.3)',
                  borderRadius: '8px',
                }}>
                  <p style={{ color: '#C77DFF', fontSize: '14px' }}>{statusMessage}</p>
                </div>
              )}

              {/* Job ID for reference */}
              {activeJob?.jobId && (
                <p style={{ 
                  color: '#555', 
                  fontSize: '11px', 
                  marginTop: '16px',
                  fontFamily: 'monospace',
                }}>
                  Job ID: {activeJob.jobId.slice(0, 8)}...
                </p>
              )}

              {/* Safe to close notice with Dashboard link */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                maxWidth: '400px',
              }}>
                <p style={{ color: '#3B82F6', fontSize: '13px', marginBottom: '12px' }}>
                  💡 Your video will continue processing even if you leave this page.
                </p>
                <Link 
                  href="/spacebaddie/dashboard"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(59,130,246,0.2)',
                    border: '1px solid rgba(59,130,246,0.4)',
                    borderRadius: '8px',
                    color: '#3B82F6',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'background 0.2s',
                  }}
                >
                  📂 View Dashboard for completed videos
                </Link>
              </div>

              {longRunning && (
                <button
                  onClick={handleStartOver}
                  style={{
                    marginTop: '32px',
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontWeight: 600,
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Start Over
                </button>
              )}
              <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`}</style>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Video Editor Overlay */}
              {showEditor && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.9)',
                  backdropFilter: 'blur(10px)',
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                }}>
                  <div style={{ width: '100%', maxWidth: '1200px' }}>
                    <VideoEditor
                      clips={clipGallery}
                      audioUrl={uploadedAudio}
                      onClose={() => setShowEditor(false)}
                      onExport={(blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'music-video-final.mp4';
                        a.click();
                      }}
                    />
                  </div>
                </div>
              )}

              <h1 style={{
                fontSize: '40px',
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #C77DFF 0%, #FF6B9D 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {generationError ? 'Generation Issue' : 'Your Video is Ready!'}
              </h1>
              <p style={{ color: '#888', textAlign: 'center', marginBottom: generationError ? '24px' : '48px' }}>
                {generationError ? generationError : 'Download or share directly to social media'}
              </p>

              {/* Try Again / Back to Customize buttons when error */}
              {generationError && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '32px' }}>
                  <button
                    onClick={() => {
                      setGenerationError(null);
                      setStep('customize');
                    }}
                    style={{
                      padding: '12px 28px',
                      background: 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '15px',
                    }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleStartOver}
                    style={{
                      padding: '12px 28px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '10px',
                      color: '#ccc',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '15px',
                    }}
                  >
                    Start Over
                  </button>
                </div>
              )}

              <div style={{ width: '100%', maxWidth: '360px' }}>
                {/* Editor Button */}
                {clipGallery.length > 0 && (
                  <button
                    onClick={() => setShowEditor(true)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      marginBottom: '24px',
                      background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
                      borderRadius: '16px',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 24px rgba(255,107,157,0.25)',
                    }}
                  >
                    <span>✂️</span> Open Video Editor ({clipGallery.length} clips)
                  </button>
                )}

                <div style={{
                  aspectRatio: '9/16',
                  background: 'linear-gradient(135deg, rgba(138,43,226,0.3) 0%, rgba(255,107,157,0.3) 100%)',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {generatedVideo ? (
                    <video 
                      src={generatedVideo} 
                      controls 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '64px', marginBottom: '16px' }}>▶</div>
                      <p style={{ color: '#888' }}>Video preview</p>
                    </div>
                  )}
                </div>

                {generatedVideo && (
                  <>
                    <a 
                      href={generatedVideo} 
                      download="spacebaddie-video.mp4"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                        borderRadius: '12px',
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                        color: '#fff',
                      }}
                    >
                      Download Video
                    </a>
                    <button
                      onClick={() => addTimelineClip(generatedVideo, `Generated Clip ${timelineClips.length + 1}`)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '16px',
                        marginTop: '12px',
                        background: 'rgba(199,125,255,0.15)',
                        border: '1px solid rgba(199,125,255,0.4)',
                        borderRadius: '12px',
                        fontWeight: 600,
                        textAlign: 'center',
                        color: '#C77DFF',
                        cursor: 'pointer',
                      }}
                    >
                      ➕ Add to Timeline
                    </button>
                    <Link
                      href="/spacebaddie/automation"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '16px',
                        marginTop: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        fontWeight: 600,
                        textAlign: 'center',
                        textDecoration: 'none',
                        color: '#fff',
                      }}
                    >
                      Post to Social Media →
                    </Link>
                  </>
                )}

                {/* In-house Timeline Builder */}
                <div style={{
                  width: '100%',
                  marginTop: '24px',
                  padding: '24px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>🎞️ In-House Timeline</h3>
                    <span style={{ fontSize: '12px', color: '#888' }}>{timelineClips.length} clips</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                    Stack your generated clips, add a music track, and export a single video without external editors.
                  </p>

                  {/* Manual clip add */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    <input
                      type="text"
                      value={manualClipUrl}
                      onChange={(e) => setManualClipUrl(e.target.value)}
                      placeholder="Paste a clip URL to add (optional)"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <button
                      onClick={() => {
                        if (manualClipUrl.trim()) {
                          addTimelineClip(manualClipUrl.trim(), `Manual Clip ${timelineClips.length + 1}`);
                          setManualClipUrl('');
                        }
                      }}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(199,125,255,0.2)',
                        border: '1px solid rgba(199,125,255,0.4)',
                        borderRadius: '8px',
                        color: '#C77DFF',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Add Clip
                    </button>
                  </div>

                  {/* Clip list */}
                  <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                    {timelineClips.length === 0 ? (
                      <div style={{
                        padding: '16px',
                        border: '1px dashed rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#666',
                        fontSize: '12px',
                        textAlign: 'center',
                      }}>
                        No clips yet. Generate a video and click "Add to Timeline".
                      </div>
                    ) : (
                      timelineClips.map((clip, index) => (
                        <div
                          key={clip.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#C77DFF', fontWeight: 600 }}>
                            {index + 1}
                          </span>
                          <span style={{ fontSize: '12px', color: '#fff', flex: 1 }}>
                            {clip.label}
                          </span>
                          <button
                            onClick={() => moveTimelineClip(index, 'up')}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(255,255,255,0.08)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ccc',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveTimelineClip(index, 'down')}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(255,255,255,0.08)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#ccc',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeTimelineClip(clip.id)}
                            style={{
                              padding: '4px 8px',
                              background: 'rgba(255,107,107,0.2)',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#FF6B6B',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Audio track */}
                  <div style={{ marginBottom: '16px' }}>
                    <input
                      ref={timelineAudioInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleTimelineAudioUpload}
                      style={{ display: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <button
                        onClick={() => timelineAudioInputRef.current?.click()}
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(59,130,246,0.15)',
                          border: '1px dashed rgba(59,130,246,0.4)',
                          borderRadius: '8px',
                          color: '#3B82F6',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🎵 Upload Music Track
                      </button>
                      {timelineAudioName && (
                        <span style={{ fontSize: '12px', color: '#ccc' }}>
                          {timelineAudioName}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#666' }}>
                      This replaces clip audio on export (ideal for music videos).
                    </p>
                  </div>

                  {/* Export action */}
                  <button
                    onClick={exportTimeline}
                    disabled={timelineExporting || timelineClips.length === 0}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: timelineExporting
                        ? 'rgba(255,255,255,0.1)'
                        : 'linear-gradient(135deg, #C77DFF 0%, #3B82F6 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: timelineExporting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {timelineExporting ? 'Exporting Timeline...' : '🎬 Export Timeline Video'}
                  </button>

                  {timelineStatus?.status === 'completed' && timelineStatus.outputUrl && (
                    <a
                      href={timelineStatus.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        marginTop: '12px',
                        padding: '12px',
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.4)',
                        borderRadius: '10px',
                        textAlign: 'center',
                        color: '#22c55e',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      ✅ Download Final Video
                    </a>
                  )}

                  {timelineStatus?.status === 'failed' && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(255,107,107,0.15)',
                      border: '1px solid rgba(255,107,107,0.4)',
                      borderRadius: '10px',
                      color: '#FF6B6B',
                      fontSize: '12px',
                    }}>
                      Timeline export failed: {timelineStatus.error || 'Unknown error'}
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleStartOver}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    color: '#888',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Create Another Video
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom banner for non-logged-in users only */}
        {!user && !authLoading && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(138,43,226,0.95) 0%, rgba(255,107,157,0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '16px 24px',
          }}>
            <div style={{
              maxWidth: '900px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div>
                <p style={{ fontWeight: 600 }}>Sign up to save your videos</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>Get 3 free videos when you create an account</p>
              </div>
              <Link 
                href="/spacebaddie/login"
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#8A2BE2',
                  borderRadius: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
