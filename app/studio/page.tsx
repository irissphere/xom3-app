'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { supabase, getCurrentUser } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type StudioStep = 'upload' | 'customize' | 'generate' | 'preview';

interface AuthState {
  user: User | null;
  loading: boolean;
  tier: 'free' | 'pro' | 'enterprise';
  videosRemaining: number;
}

interface VideoSettings {
  duration: number;
  voice: string;
  style: string;
  music: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
}

const ACTIVE_JOB_KEY = 'spacebaddie_active_job';
const VISITOR_ID_KEY = 'spacebaddie_visitor_id';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a1f 50%, #0a0a0f 100%)',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  header: {
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(20px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 50,
  } as React.CSSProperties,
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  logo: {
    fontSize: '24px',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #FF6B9D 0%, #C77DFF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textDecoration: 'none',
  } as React.CSSProperties,
  logoStudio: {
    color: '#666',
    marginLeft: '12px',
    fontWeight: 400,
  } as React.CSSProperties,
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '48px 24px 120px',
  } as React.CSSProperties,
  title: {
    fontSize: '42px',
    fontWeight: 800,
    textAlign: 'center' as const,
    marginBottom: '16px',
    background: 'linear-gradient(135deg, #fff 0%, #C77DFF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as React.CSSProperties,
  subtitle: {
    color: '#888',
    fontSize: '18px',
    textAlign: 'center' as const,
    marginBottom: '48px',
  } as React.CSSProperties,
  uploadZone: {
    border: '2px dashed rgba(200, 125, 255, 0.3)',
    borderRadius: '24px',
    padding: '64px 32px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    background: 'rgba(200, 125, 255, 0.05)',
    transition: 'all 0.3s ease',
    marginBottom: '32px',
  } as React.CSSProperties,
  uploadIcon: {
    fontSize: '72px',
    marginBottom: '24px',
    display: 'block',
  } as React.CSSProperties,
  uploadTitle: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '12px',
  } as React.CSSProperties,
  uploadSubtitle: {
    color: '#888',
    marginBottom: '24px',
  } as React.CSSProperties,
  uploadHint: {
    fontSize: '14px',
    color: '#666',
  } as React.CSSProperties,
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
  optionCard: {
    padding: '24px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  optionIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    display: 'block',
  } as React.CSSProperties,
  optionTitle: {
    fontWeight: 700,
    marginBottom: '4px',
  } as React.CSSProperties,
  optionDesc: {
    fontSize: '14px',
    color: '#888',
  } as React.CSSProperties,
  customizeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
  } as React.CSSProperties,
  previewContainer: {
    aspectRatio: '9/16',
    maxHeight: '500px',
    background: 'linear-gradient(135deg, #1a0a1f 0%, #0a0a0f 100%)',
    borderRadius: '24px',
    overflow: 'hidden',
    position: 'relative' as const,
    margin: '0 auto',
  } as React.CSSProperties,
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  } as React.CSSProperties,
  scriptOverlay: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '16px',
    right: '16px',
    background: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    padding: '12px',
  } as React.CSSProperties,
  scriptText: {
    fontSize: '14px',
    color: '#ccc',
    lineClamp: 2,
  } as React.CSSProperties,
  changeImageBtn: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    marginTop: '16px',
  } as React.CSSProperties,
  settingsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#ccc',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    height: '120px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '16px',
    color: '#fff',
    resize: 'none' as const,
    fontSize: '16px',
    outline: 'none',
  } as React.CSSProperties,
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
  } as React.CSSProperties,
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  } as React.CSSProperties,
  optionButton: (isActive: boolean) => ({
    padding: '14px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    background: isActive 
      ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
      : 'rgba(255,255,255,0.05)',
    color: isActive ? '#fff' : '#aaa',
  } as React.CSSProperties),
  select: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '14px',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  slider: {
    width: '100%',
    accentColor: '#C77DFF',
  } as React.CSSProperties,
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    marginTop: '8px',
  } as React.CSSProperties,
  generateButton: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 32px rgba(200, 125, 255, 0.3)',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  generatingContainer: {
    textAlign: 'center' as const,
    padding: '80px 0',
  } as React.CSSProperties,
  generatingIcon: {
    fontSize: '96px',
    marginBottom: '24px',
    display: 'block',
    animation: 'bounce 1s infinite',
  } as React.CSSProperties,
  progressBar: {
    maxWidth: '400px',
    margin: '32px auto',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '999px',
    height: '12px',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressFill: (progress: number) => ({
    width: `${progress}%`,
    height: '100%',
    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
    transition: 'width 0.3s ease',
  } as React.CSSProperties),
  progressText: {
    fontSize: '14px',
    color: '#888',
    marginTop: '12px',
  } as React.CSSProperties,
  statusText: {
    fontSize: '14px',
    color: '#666',
    marginTop: '24px',
  } as React.CSSProperties,
  previewVideoContainer: {
    maxWidth: '400px',
    margin: '0 auto',
  } as React.CSSProperties,
  videoPreview: {
    aspectRatio: '9/16',
    background: 'linear-gradient(135deg, rgba(200, 125, 255, 0.2) 0%, rgba(255, 0, 110, 0.2) 100%)',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  } as React.CSSProperties,
  playButton: {
    textAlign: 'center' as const,
  } as React.CSSProperties,
  playIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  } as React.CSSProperties,
  downloadButton: {
    width: '100%',
    padding: '18px',
    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '12px',
  } as React.CSSProperties,
  socialGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,
  socialButton: {
    padding: '14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  createAnotherBtn: {
    width: '100%',
    padding: '14px',
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
  } as React.CSSProperties,
  upgradeBanner: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(135deg, rgba(139, 43, 226, 0.95) 0%, rgba(255, 0, 110, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '16px 24px',
  } as React.CSSProperties,
  upgradeBannerInner: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,
  upgradeText: {
    fontWeight: 600,
  } as React.CSSProperties,
  upgradeSubtext: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  } as React.CSSProperties,
  upgradeButton: {
    padding: '12px 24px',
    background: '#fff',
    color: '#1a0a1f',
    fontWeight: 700,
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  stepDot: (isActive: boolean, isComplete: boolean) => ({
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    background: isActive 
      ? 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)'
      : isComplete 
        ? '#22c55e'
        : 'rgba(255,255,255,0.1)',
    color: (isActive || isComplete) ? '#fff' : '#666',
  } as React.CSSProperties),
  stepLine: (isComplete: boolean) => ({
    width: '48px',
    height: '2px',
    background: isComplete ? '#22c55e' : 'rgba(255,255,255,0.1)',
  } as React.CSSProperties),
  navButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  } as React.CSSProperties,
  helpButton: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: '14px',
  } as React.CSSProperties,
  signInButton: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
};

export default function StudioPage() {
  const [step, setStep] = useState<StudioStep>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [longRunning, setLongRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<{ jobId: string; itJobId?: string } | null>(null);
  const [workerStatus, setWorkerStatus] = useState<{ available: boolean; mode: string; provider: string } | null>(null);
  const [lastStatus, setLastStatus] = useState<{ status?: string; progress?: number; error?: string } | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    tier: 'free',
    videosRemaining: 4,
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [settings, setSettings] = useState<VideoSettings>({
    duration: 15,
    voice: 'natural',
    style: 'modern',
    music: 'upbeat',
    aspectRatio: '9:16'
  });

  const [script, setScript] = useState('');

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

  const resetGenerationState = () => {
    setGenerationProgress(0);
    setIsGenerating(false);
    setGeneratedVideo(null);
    setIsDemoMode(false);
    setGenerationError(null);
    setLongRunning(false);
    setStatusMessage(null);
    setActiveJob(null);
    setLastStatus(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACTIVE_JOB_KEY);
    }
  };

  const getOrCreateVisitorId = () => {
    const existing = window.localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const created = `sb_visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(VISITOR_ID_KEY, created);
    return created;
  };

  const fetchWorkerStatus = async () => {
    try {
      const response = await fetch('/api/spacebaddie/video?action=status');
      const data = await response.json();
      if (response.ok && data?.worker) {
        setWorkerStatus({
          available: data.worker.available,
          mode: data.worker.mode,
          provider: data.worker.provider
        });
      }
    } catch (error) {
      console.error('Worker status error:', error);
    }
  };

  const pollJobStatus = async (jobId: string, itJobId?: string) => {
    const pollUrl = itJobId
      ? `/api/spacebaddie/video?jobId=${jobId}&itJobId=${itJobId}`
      : `/api/spacebaddie/video?jobId=${jobId}`;
    const statusResponse = await fetch(pollUrl);
    const statusData = await statusResponse.json();
    setLastStatus({
      status: statusData.status,
      progress: statusData.progress,
      error: statusData.error
    });

    if (!statusResponse.ok) {
      setStatusMessage(statusData?.error || 'Status check failed. Retrying...');
      return { status: 'processing' as const };
    }

    if (statusData.progress) {
      setGenerationProgress(Math.min(statusData.progress, 99));
    }

    return statusData;
  };

  const handleGenerate = async () => {
    setStep('generate');
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    setIsDemoMode(false);
    setLongRunning(false);
    setStatusMessage(null);
    setLastStatus(null);
    await fetchWorkerStatus();

    try {
      // Call the real SpaceBaddie video API
      const response = await fetch('/api/spacebaddie/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedImage,
          script: script || undefined,
          voiceStyle: settings.voice,
          aspectRatio: settings.aspectRatio,
          duration: settings.duration,
          music: settings.music,
          visitorId: visitorId || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start video generation');
      }

      // Check if running in demo mode
      if (data.mode === 'demo' || data.status === 'demo') {
        setGenerationError('Video worker is unavailable. Please try again later.');
        setIsGenerating(false);
        setStep('preview');
        return;
      }

      // Real generation - poll for status
      const jobId = data.jobId;
      const itJobId = data.infinitetalkJobId;
      setActiveJob({ jobId, itJobId });
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes max (300 * 2 seconds)
      const startTime = Date.now();
      let lastProgress = 0;
      let lastProgressAt = Date.now();
      
      // Start with initial progress
      setGenerationProgress(5);
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusData = await pollJobStatus(jobId, itJobId);
        
        if (typeof statusData.progress === 'number' && statusData.progress > lastProgress) {
          lastProgress = statusData.progress;
          lastProgressAt = Date.now();
          setStatusMessage(null);
        }

        if (Date.now() - lastProgressAt > 90000) {
          setLongRunning(true);
          setStatusMessage('Still processing. This can take a few more minutes for longer jobs.');
        }
        
        if (statusData.status === 'completed') {
          setGenerationProgress(100);
          setGeneratedVideo(statusData.videoUrl || null);
          setIsGenerating(false);
          setStep('preview');
          return;
        }
        
        if (statusData.status === 'failed') {
          throw new Error(statusData.error || 'Video generation failed');
        }
        
        attempts++;
      }
      
      setLongRunning(true);
      setStatusMessage('Still processing. Use Check Status to continue or Start Over to cancel.');
      setIsGenerating(false);
      return;
      
    } catch (error) {
      console.error('Video generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
      setIsGenerating(false);
      setStep('preview');
      setIsDemoMode(false);
    }
  };

  const handleManualStatusCheck = async () => {
    if (!activeJob) {
      setStatusMessage('No active job. Please restart generation.');
      return;
    }
    setStatusMessage('Checking status...');
    await fetchWorkerStatus();
    const statusData = await pollJobStatus(activeJob.jobId, activeJob.itJobId);
    if (statusData.status === 'completed') {
      setGenerationProgress(100);
      setGeneratedVideo(statusData.videoUrl || null);
      setIsGenerating(false);
      setStep('preview');
      return;
    }
    if (statusData.status === 'failed') {
      setGenerationError(statusData.error || 'Video generation failed');
      setIsGenerating(false);
      setStep('preview');
    }
  };

  const handleStartOver = async () => {
    if (activeJob?.itJobId) {
      await fetch(`/api/spacebaddie/video?action=cancel&jobId=${activeJob.jobId}&itJobId=${activeJob.itJobId}`, {
        method: 'POST'
      });
    }
    resetGenerationState();
    setStep('upload');
  };

  const resumeJob = useCallback(async (job: { jobId: string; itJobId?: string }) => {
    setActiveJob(job);
    setStep('generate');
    setIsGenerating(true);
    setStatusMessage('Resuming job status...');
    setLongRunning(true);
    await fetchWorkerStatus();
    await pollJobStatus(job.jobId, job.itJobId);
    setIsGenerating(false);
  }, []);

  useEffect(() => {
    setVisitorId(getOrCreateVisitorId());
  }, []);

  // Check auth state and subscription on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get current user from Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          setAuthState(prev => ({ ...prev, user: null, loading: false }));
          return;
        }

        // Fetch subscription status
        const response = await fetch('/api/subscription/status');
        const data = await response.json();
        
        setAuthState({
          user,
          loading: false,
          tier: data.effectiveTier || 'free',
          videosRemaining: data.effectiveTier === 'pro' || data.effectiveTier === 'enterprise' 
            ? Infinity 
            : data.tierConfig?.limits?.videosPerMonth ?? 4,
        });
      } catch (error) {
        console.error('[Studio] Auth check error:', error);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Refetch subscription status
        const response = await fetch('/api/subscription/status');
        const data = await response.json();
        
        setAuthState({
          user: session.user,
          loading: false,
          tier: data.effectiveTier || 'free',
          videosRemaining: data.effectiveTier === 'pro' || data.effectiveTier === 'enterprise' 
            ? Infinity 
            : data.tierConfig?.limits?.videosPerMonth ?? 4,
        });
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          loading: false,
          tier: 'free',
          videosRemaining: 4,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setShowUserMenu(false);
    } catch (error) {
      console.error('[Studio] Sign out error:', error);
    }
  };

  useEffect(() => {
    if (activeJob) {
      window.localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(activeJob));
      return;
    }
    if (!visitorId) {
      return;
    }
    const saved = window.localStorage.getItem(ACTIVE_JOB_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.jobId) {
          resumeJob(parsed);
          return;
        }
      } catch (error) {
        window.localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    }
    fetch(`/api/spacebaddie/video?action=resume&visitorId=${visitorId}`)
      .then(res => res.json())
      .then((data) => {
        if (data?.job?.jobId) {
          resumeJob({ jobId: data.job.jobId, itJobId: data.job.infinitetalkJobId });
        }
      })
      .catch(() => null);
  }, [activeJob, visitorId, resumeJob]);

  const steps: StudioStep[] = ['upload', 'customize', 'generate', 'preview'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div style={styles.page}>
      {/* Keyframe animation for bounce */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <span style={styles.logo}>SpaceBaddie</span>
            <span style={styles.logoStudio}>Studio</span>
          </Link>
          
          {/* Step Indicator */}
          <div style={styles.stepIndicator}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={styles.stepDot(step === s, currentStepIndex > i)}>
                  {currentStepIndex > i ? '✓' : i + 1}
                </div>
                {i < 3 && <div style={styles.stepLine(currentStepIndex > i)} />}
              </div>
            ))}
          </div>

          <div style={styles.navButtons}>
            <button style={styles.helpButton}>Help</button>
            {authState.loading ? (
              <span style={{ color: '#888', fontSize: '14px' }}>...</span>
            ) : authState.user ? (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    ...styles.signInButton,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}>
                    {authState.user.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  {authState.tier !== 'free' && (
                    <span style={{ 
                      background: 'linear-gradient(135deg, #FF006E 0%, #8A2BE2 100%)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {authState.tier}
                    </span>
                  )}
                </button>
                {showUserMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'rgba(30, 20, 40, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '8px',
                    minWidth: '180px',
                    zIndex: 100,
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Signed in as</p>
                      <p style={{ fontSize: '14px', margin: '4px 0 0 0', color: '#fff' }}>{authState.user.email}</p>
                    </div>
                    <Link 
                      href="/spacebaddie/projects" 
                      style={{ 
                        display: 'block', 
                        padding: '10px 12px', 
                        color: '#fff', 
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      My Projects
                    </Link>
                    <Link 
                      href="/#pricing" 
                      style={{ 
                        display: 'block', 
                        padding: '10px 12px', 
                        color: '#fff', 
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {authState.tier === 'free' ? 'Upgrade' : 'Billing'}
                    </Link>
                    <button 
                      onClick={handleSignOut}
                      style={{ 
                        width: '100%',
                        padding: '10px 12px', 
                        color: '#ff6b6b', 
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/spacebaddie/login" style={styles.signInButton}>Sign In</Link>
            )}
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Upload Step */}
        {step === 'upload' && (
          <div>
            <h1 style={styles.title}>Create Your Video</h1>
            <p style={styles.subtitle}>Upload a photo to transform into a talking video</p>

            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={styles.uploadZone}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200, 125, 255, 0.6)';
                e.currentTarget.style.background = 'rgba(200, 125, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(200, 125, 255, 0.3)';
                e.currentTarget.style.background = 'rgba(200, 125, 255, 0.05)';
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <span style={styles.uploadIcon}>📸</span>
              <h3 style={styles.uploadTitle}>Drop your image here</h3>
              <p style={styles.uploadSubtitle}>or click to browse files</p>
              <p style={styles.uploadHint}>Supports JPG, PNG, WebP • Max 10MB</p>
            </div>

            {/* Quick Start Options */}
            <div style={styles.optionsGrid}>
              <button 
                style={styles.optionCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(200, 125, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={styles.optionIcon}>🤳</span>
                <h4 style={styles.optionTitle}>Take a Selfie</h4>
                <p style={styles.optionDesc}>Use your camera</p>
              </button>
              <button 
                style={styles.optionCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(200, 125, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={styles.optionIcon}>🎨</span>
                <h4 style={styles.optionTitle}>Use AI Avatar</h4>
                <p style={styles.optionDesc}>Choose from templates</p>
              </button>
              <button 
                style={styles.optionCard}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.borderColor = 'rgba(200, 125, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <span style={styles.optionIcon}>📁</span>
                <h4 style={styles.optionTitle}>Recent Uploads</h4>
                <p style={styles.optionDesc}>Use previous images</p>
              </button>
            </div>
          </div>
        )}

        {/* Customize Step */}
        {step === 'customize' && uploadedImage && (
          <div>
            <h1 style={styles.title}>Customize Your Video</h1>
            <p style={styles.subtitle}>Set up how your video will look and sound</p>

            <div style={styles.customizeGrid}>
              {/* Preview */}
              <div>
                <div style={styles.previewContainer}>
                  <img 
                    src={uploadedImage} 
                    alt="Preview" 
                    style={styles.previewImage}
                  />
                  <div style={styles.scriptOverlay}>
                    <p style={styles.scriptText}>
                      {script || 'Your script will appear here...'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { setUploadedImage(null); setStep('upload'); }}
                  style={styles.changeImageBtn}
                >
                  ← Change image
                </button>
              </div>

              {/* Settings */}
              <div style={styles.settingsSection}>
                {/* Script */}
                <div>
                  <label style={styles.label}>Script / What should they say?</label>
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Enter what you want your avatar to say..."
                    style={styles.textarea}
                  />
                  <p style={styles.hint}>Or leave blank for AI to generate based on context</p>
                </div>

                {/* Voice Selection */}
                <div>
                  <label style={styles.label}>Voice Style</label>
                  <div style={styles.buttonGrid}>
                    {['Natural', 'Energetic', 'Professional'].map((voice) => (
                      <button
                        key={voice}
                        onClick={() => setSettings({ ...settings, voice: voice.toLowerCase() })}
                        style={styles.optionButton(settings.voice === voice.toLowerCase())}
                      >
                        {voice}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label style={styles.label}>Aspect Ratio</label>
                  <div style={styles.buttonGrid}>
                    {[
                      { value: '9:16', label: '📱 Vertical' },
                      { value: '16:9', label: '🖥️ Horizontal' },
                      { value: '1:1', label: '⬜ Square' }
                    ].map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setSettings({ ...settings, aspectRatio: ratio.value as VideoSettings['aspectRatio'] })}
                        style={styles.optionButton(settings.aspectRatio === ratio.value)}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label style={styles.label}>Duration: {settings.duration}s</label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={settings.duration}
                    onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value) })}
                    style={styles.slider}
                  />
                  <div style={styles.sliderLabels}>
                    <span>5s</span>
                    <span>60s</span>
                  </div>
                </div>

                {/* Music */}
                <div>
                  <label style={styles.label}>Background Music</label>
                  <select
                    value={settings.music}
                    onChange={(e) => setSettings({ ...settings, music: e.target.value })}
                    style={styles.select}
                  >
                    <option value="none">No music</option>
                    <option value="upbeat">Upbeat</option>
                    <option value="chill">Chill</option>
                    <option value="dramatic">Dramatic</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  style={styles.generateButton}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(200, 125, 255, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(200, 125, 255, 0.3)';
                  }}
                >
                  Generate Video ✨
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Step */}
        {step === 'generate' && (
          <div style={styles.generatingContainer}>
            <span style={{ ...styles.generatingIcon, animation: 'bounce 1s infinite' }}>🎬</span>
            <h1 style={styles.title}>Creating Your Video</h1>
            <p style={styles.subtitle}>This usually takes 30-60 seconds</p>
            
            <div style={styles.progressBar}>
              <div style={styles.progressFill(generationProgress)} />
            </div>
            <p style={styles.progressText}>{generationProgress}% complete</p>

            <p style={styles.statusText}>
              {generationProgress < 30 && 'Analyzing image...'}
              {generationProgress >= 30 && generationProgress < 60 && 'Generating speech...'}
              {generationProgress >= 60 && generationProgress < 90 && 'Rendering video...'}
              {generationProgress >= 90 && 'Finalizing...'}
            </p>

            {statusMessage && (
              <p style={{ fontSize: '14px', color: '#c7a5ff', marginTop: '12px' }}>{statusMessage}</p>
            )}

            {longRunning && (
              <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={handleManualStatusCheck}
                  style={{ ...styles.downloadButton, width: 'auto', padding: '12px 18px' }}
                >
                  Check Status
                </button>
                <button
                  onClick={handleStartOver}
                  style={{ ...styles.socialButton, width: 'auto', padding: '12px 18px' }}
                >
                  Start Over
                </button>
              </div>
            )}

            {(activeJob || workerStatus) && (
              <div style={{ marginTop: '28px', fontSize: '12px', color: '#9c9c9c' }}>
                {workerStatus && (
                  <div>Worker: {workerStatus.provider} · Mode: {workerStatus.mode} · Available: {workerStatus.available ? 'yes' : 'no'}</div>
                )}
                {activeJob && (
                  <div>Job: {activeJob.jobId} {activeJob.itJobId ? `· RunPod: ${activeJob.itJobId}` : ''}</div>
                )}
                {lastStatus?.status && (
                  <div>Last Status: {lastStatus.status}{typeof lastStatus.progress === 'number' ? ` · ${lastStatus.progress}%` : ''}</div>
                )}
                {lastStatus?.error && <div>Error: {lastStatus.error}</div>}
              </div>
            )}
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div>
            <h1 style={styles.title}>
              {generationError ? 'Generation Issue 😅' : 'Your Video is Ready! 🎉'}
            </h1>
            <p style={styles.subtitle}>
              {generationError 
                ? generationError 
                : isDemoMode 
                  ? 'Demo preview - GPU workers initializing'
                  : 'Download or share directly to social media'}
            </p>

            <div style={styles.previewVideoContainer}>
              {/* Video Preview */}
              <div style={styles.videoPreview}>
                {generatedVideo ? (
                  <video 
                    src={generatedVideo} 
                    controls 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: '24px',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={styles.playButton}>
                    <div style={styles.playIcon}>▶️</div>
                    <p style={{ color: '#aaa' }}>Video preview</p>
                    {isDemoMode && (
                      <p style={{ fontSize: '13px', color: '#666' }}>(Demo mode - workers warming up)</p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div>
                {generatedVideo ? (
                  <a 
                    href={generatedVideo} 
                    download="spacebaddie-video.mp4"
                    style={styles.downloadButton}
                  >
                    <span>⬇️</span> Download Video
                  </a>
                ) : (
                  <button 
                    style={{ ...styles.downloadButton, opacity: 0.5, cursor: 'not-allowed' }}
                    disabled
                  >
                    <span>⬇️</span> {isDemoMode ? 'Demo Mode - No Download' : 'Processing...'}
                  </button>
                )}

                {(activeJob || workerStatus) && (
                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#9c9c9c' }}>
                    {workerStatus && (
                      <div>Worker: {workerStatus.provider} · Mode: {workerStatus.mode} · Available: {workerStatus.available ? 'yes' : 'no'}</div>
                    )}
                    {activeJob && (
                      <div>Job: {activeJob.jobId} {activeJob.itJobId ? `· RunPod: ${activeJob.itJobId}` : ''}</div>
                    )}
                    {lastStatus?.status && (
                      <div>Last Status: {lastStatus.status}{typeof lastStatus.progress === 'number' ? ` · ${lastStatus.progress}%` : ''}</div>
                    )}
                    {lastStatus?.error && <div>Error: {lastStatus.error}</div>}
                  </div>
                )}
                
                <div style={styles.socialGrid}>
                  {[
                    { icon: '📱', name: 'TikTok' },
                    { icon: '📸', name: 'Instagram' },
                    { icon: '🎬', name: 'YouTube' },
                    { icon: '🐦', name: 'Twitter' }
                  ].map((social) => (
                    <button 
                      key={social.name}
                      style={styles.socialButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }}
                    >
                      <span>{social.icon}</span> {social.name}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleStartOver}
                  style={styles.createAnotherBtn}
                >
                  Create Another Video
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Upgrade Banner - only show for free tier users */}
      {authState.tier === 'free' && (
        <div style={styles.upgradeBanner}>
          <div style={styles.upgradeBannerInner}>
            <div>
              <p style={styles.upgradeText}>
                {authState.user 
                  ? `Free plan: ${authState.videosRemaining} videos remaining this month`
                  : 'Sign in to track your usage and save projects'}
              </p>
              <p style={styles.upgradeSubtext}>
                {authState.user 
                  ? 'Upgrade for unlimited videos and no watermarks'
                  : 'Create an account for unlimited videos at $29.99/mo'}
              </p>
            </div>
            <Link 
              href={authState.user ? '/#pricing' : '/spacebaddie/login'}
              style={styles.upgradeButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {authState.user ? 'Upgrade to Pro' : 'Sign In'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
