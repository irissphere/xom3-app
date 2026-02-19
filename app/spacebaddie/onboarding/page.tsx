'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getCurrentUser } from '@/lib/supabase/client';

type OnboardingStep = 'profile' | 'style' | 'platforms' | 'complete';

const styleOptions = [
  { id: 'energetic', icon: '&#9889;', label: 'Energetic', desc: 'High energy, upbeat content' },
  { id: 'calm', icon: '&#127754;', label: 'Calm', desc: 'Relaxed, soothing vibes' },
  { id: 'professional', icon: '&#128188;', label: 'Professional', desc: 'Business-focused content' },
  { id: 'playful', icon: '&#127881;', label: 'Playful', desc: 'Fun and entertaining' },
];

const platformOptions = [
  { id: 'tiktok', label: 'TikTok', icon: '&#127909;' },
  { id: 'instagram', label: 'Instagram', icon: '&#128247;' },
  { id: 'youtube', label: 'YouTube', icon: '&#9658;' },
  { id: 'twitter', label: 'Twitter', icon: '&#128038;' },
  { id: 'facebook', label: 'Facebook', icon: '&#128077;' },
  { id: 'linkedin', label: 'LinkedIn', icon: '&#128188;' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('profile');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    displayName: '',
    niche: '',
    style: '' as string,
    platforms: [] as string[],
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await getCurrentUser();
    if (!userData) {
      router.push('/spacebaddie/login');
      return;
    }
    setUser(userData);
    if (userData.profile?.display_name) {
      setProfile(p => ({ ...p, displayName: userData.profile.display_name }));
    }
  };

  const steps: { id: OnboardingStep; title: string; subtitle: string }[] = [
    { id: 'profile', title: 'Your Profile', subtitle: 'Tell us about yourself' },
    { id: 'style', title: 'Content Style', subtitle: 'How should your videos feel?' },
    { id: 'platforms', title: 'Platforms', subtitle: 'Where will you post?' },
    { id: 'complete', title: 'All Set!', subtitle: 'Your cosmic journey begins' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const handleNext = async () => {
    if (step === 'profile') setStep('style');
    else if (step === 'style') setStep('platforms');
    else if (step === 'platforms') setStep('complete');
    else {
      setLoading(true);
      try {
        // Update user profile
        if (user) {
          await supabase.from('user_profiles').update({
            display_name: profile.displayName,
            onboarding_complete: true,
            onboarding_step: 4,
            onboarding_state: 'complete',
          }).eq('id', user.id);
        }
        router.push('/spacebaddie/studio');
      } catch (error) {
        console.error('Failed to save profile:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 'style') setStep('profile');
    else if (step === 'platforms') setStep('style');
    else if (step === 'complete') setStep('platforms');
  };

  const togglePlatform = (platform: string) => {
    setProfile(p => ({
      ...p,
      platforms: p.platforms.includes(platform)
        ? p.platforms.filter(pl => pl !== platform)
        : [...p.platforms, platform],
    }));
  };

  return (
    <div className="min-h-screen bg-[#030308] text-white">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0f0520_0%,_#030308_70%)]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-cyan-600/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : i === currentStepIndex
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]'
                    : 'bg-white/10 text-gray-500'
                }`}
              >
                {i < currentStepIndex ? <span>&#10003;</span> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-12 h-1 mx-2 rounded ${i < currentStepIndex ? 'bg-green-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-xl">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {steps[currentStepIndex].title}
          </h1>
          <p className="text-gray-400 text-center mb-8">{steps[currentStepIndex].subtitle}</p>

          {/* Profile Step */}
          {step === 'profile' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  placeholder="Your creator name"
                  value={profile.displayName}
                  onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Your Niche</label>
                <input
                  type="text"
                  placeholder="e.g., Fitness, Tech Reviews, Comedy, Education"
                  value={profile.niche}
                  onChange={e => setProfile(p => ({ ...p, niche: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Style Step */}
          {step === 'style' && (
            <div className="grid grid-cols-2 gap-4">
              {styleOptions.map(style => (
                <button
                  key={style.id}
                  onClick={() => setProfile(p => ({ ...p, style: style.id }))}
                  className={`p-6 rounded-xl border transition-all text-left ${
                    profile.style === style.id
                      ? 'border-purple-500 bg-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <div className="text-3xl mb-2" dangerouslySetInnerHTML={{ __html: style.icon }} />
                  <div className="font-bold mb-1">{style.label}</div>
                  <div className="text-sm text-gray-400">{style.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Platforms Step */}
          {step === 'platforms' && (
            <div className="grid grid-cols-2 gap-4">
              {platformOptions.map(platform => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                    profile.platforms.includes(platform.id)
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'border-white/10 hover:border-white/30 bg-white/5'
                  }`}
                >
                  <span className="text-2xl" dangerouslySetInnerHTML={{ __html: platform.icon }} />
                  <span className="font-medium">{platform.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="py-8 text-center">
              <div className="text-7xl mb-6">&#128640;</div>
              <p className="text-xl text-gray-300 mb-2">
                Welcome, <span className="text-purple-400 font-bold">{profile.displayName || 'Creator'}</span>!
              </p>
              <p className="text-gray-400">
                Your SpaceBaddie studio is ready. Let's create some amazing videos!
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-4 justify-center">
            {currentStepIndex > 0 && step !== 'complete' && (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : step === 'complete' ? 'Enter Studio' : 'Continue'}
            </button>
          </div>
        </div>

        {/* Skip option */}
        {step !== 'complete' && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/spacebaddie/studio')}
              className="text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
