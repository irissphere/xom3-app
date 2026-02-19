/**
 * SpaceBaddie Voice Library
 * 
 * Famous-style voices that users can unlock based on their subscription tier.
 * These are AI-generated voices inspired by different speaking styles.
 */

export type VoiceTier = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';

export interface FamousVoice {
  id: string;
  name: string;
  description: string;
  category: 'narrator' | 'celebrity' | 'character' | 'professional' | 'custom';
  previewText: string;
  style: string; // Maps to OpenAI voice style
  requiredTier: VoiceTier;
  isNew?: boolean;
  isPremium?: boolean;
  gender: 'male' | 'female' | 'neutral';
  tags: string[];
  // For voice synthesis
  openaiVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  speed: number; // 0.25 to 4.0
  pitch?: 'low' | 'normal' | 'high';
}

export const FAMOUS_VOICES: FamousVoice[] = [
  // FREE TIER VOICES
  {
    id: 'sb_natural',
    name: 'Natural',
    description: 'Balanced, everyday conversational tone',
    category: 'professional',
    previewText: 'Hey everyone! Welcome to my channel.',
    style: 'natural',
    requiredTier: 'free',
    gender: 'neutral',
    tags: ['conversational', 'friendly', 'everyday'],
    openaiVoice: 'alloy',
    speed: 1.0,
  },
  {
    id: 'sb_energetic',
    name: 'Energetic',
    description: 'Upbeat and exciting for dynamic content',
    category: 'professional',
    previewText: "Let's GO! This is going to be amazing!",
    style: 'energetic',
    requiredTier: 'free',
    gender: 'female',
    tags: ['upbeat', 'exciting', 'dynamic'],
    openaiVoice: 'nova',
    speed: 1.1,
  },
  {
    id: 'sb_professional',
    name: 'Professional',
    description: 'Corporate and polished presentation style',
    category: 'professional',
    previewText: 'Today we will be discussing the quarterly results.',
    style: 'professional',
    requiredTier: 'free',
    gender: 'male',
    tags: ['corporate', 'polished', 'business'],
    openaiVoice: 'onyx',
    speed: 0.95,
  },

  // STARTER TIER VOICES
  {
    id: 'sb_movie_trailer',
    name: 'Epic Narrator',
    description: 'Deep, dramatic movie trailer voice',
    category: 'narrator',
    previewText: 'In a world where dreams become reality...',
    style: 'narrator',
    requiredTier: 'starter',
    gender: 'male',
    tags: ['dramatic', 'cinematic', 'trailer'],
    openaiVoice: 'onyx',
    speed: 0.85,
    pitch: 'low',
  },
  {
    id: 'sb_podcast_host',
    name: 'Podcast Pro',
    description: 'Warm, engaging podcast host style',
    category: 'professional',
    previewText: 'Welcome back to another episode! Today we have something special.',
    style: 'podcast',
    requiredTier: 'starter',
    gender: 'neutral',
    tags: ['podcast', 'warm', 'engaging'],
    openaiVoice: 'fable',
    speed: 1.0,
  },
  {
    id: 'sb_storyteller',
    name: 'Storyteller',
    description: 'Captivating narrative voice for stories',
    category: 'narrator',
    previewText: 'Once upon a time, in a land far, far away...',
    style: 'storyteller',
    requiredTier: 'starter',
    gender: 'neutral',
    tags: ['narrative', 'captivating', 'story'],
    openaiVoice: 'fable',
    speed: 0.9,
  },

  // GROWTH TIER VOICES
  {
    id: 'sb_motivational',
    name: 'Motivational Coach',
    description: 'Inspiring, powerful motivational speaker',
    category: 'celebrity',
    previewText: "You have the power within you to achieve anything. Let's make it happen!",
    style: 'motivational',
    requiredTier: 'growth',
    isPremium: true,
    gender: 'male',
    tags: ['inspiring', 'powerful', 'coach'],
    openaiVoice: 'onyx',
    speed: 1.05,
  },
  {
    id: 'sb_tech_guru',
    name: 'Tech Visionary',
    description: 'Calm, thoughtful tech presentation style',
    category: 'celebrity',
    previewText: "Today we're introducing something that will change everything.",
    style: 'tech',
    requiredTier: 'growth',
    isPremium: true,
    gender: 'male',
    tags: ['tech', 'visionary', 'calm'],
    openaiVoice: 'echo',
    speed: 0.9,
  },
  {
    id: 'sb_influencer',
    name: 'Social Star',
    description: 'Trendy, relatable social media voice',
    category: 'celebrity',
    previewText: 'OMG you guys! You are NOT going to believe this!',
    style: 'influencer',
    requiredTier: 'growth',
    isNew: true,
    gender: 'female',
    tags: ['trendy', 'relatable', 'social'],
    openaiVoice: 'nova',
    speed: 1.15,
  },
  {
    id: 'sb_asmr',
    name: 'ASMR Whisper',
    description: 'Soft, soothing whisper for relaxation content',
    category: 'character',
    previewText: 'Close your eyes and relax. Let the stress melt away.',
    style: 'asmr',
    requiredTier: 'growth',
    isNew: true,
    gender: 'female',
    tags: ['relaxing', 'soft', 'whisper'],
    openaiVoice: 'shimmer',
    speed: 0.75,
  },

  // PRO TIER VOICES
  {
    id: 'sb_action_hero',
    name: 'Action Hero',
    description: 'Bold, commanding action movie star voice',
    category: 'celebrity',
    previewText: "I'll be back. And when I return, things will be different.",
    style: 'action',
    requiredTier: 'pro',
    isPremium: true,
    gender: 'male',
    tags: ['bold', 'commanding', 'action'],
    openaiVoice: 'onyx',
    speed: 0.9,
    pitch: 'low',
  },
  {
    id: 'sb_wizard_mentor',
    name: 'Wise Mentor',
    description: 'Elderly, wise mentor with gravitas',
    category: 'character',
    previewText: 'With great power comes great responsibility. Remember this always.',
    style: 'mentor',
    requiredTier: 'pro',
    isPremium: true,
    gender: 'male',
    tags: ['wise', 'gravitas', 'mentor'],
    openaiVoice: 'echo',
    speed: 0.8,
  },
  {
    id: 'sb_gaming',
    name: 'Gaming Legend',
    description: 'Excited, fast-paced gaming commentary',
    category: 'celebrity',
    previewText: "And he's going for the play! Unbelievable! That's incredible!",
    style: 'gaming',
    requiredTier: 'pro',
    isNew: true,
    gender: 'male',
    tags: ['gaming', 'excited', 'commentary'],
    openaiVoice: 'echo',
    speed: 1.2,
  },
  {
    id: 'sb_meditation',
    name: 'Zen Guide',
    description: 'Calming meditation and mindfulness voice',
    category: 'professional',
    previewText: 'Breathe in deeply. Hold. And slowly release. Find your center.',
    style: 'meditation',
    requiredTier: 'pro',
    gender: 'female',
    tags: ['calming', 'meditation', 'mindful'],
    openaiVoice: 'shimmer',
    speed: 0.7,
  },
  {
    id: 'sb_comedy',
    name: 'Stand-Up Star',
    description: 'Witty, comedic timing for humor content',
    category: 'celebrity',
    previewText: "So I said to my wife... and this is where it gets good...",
    style: 'comedy',
    requiredTier: 'pro',
    isNew: true,
    gender: 'neutral',
    tags: ['witty', 'humor', 'comedy'],
    openaiVoice: 'fable',
    speed: 1.05,
  },

  // ENTERPRISE TIER VOICES
  {
    id: 'sb_hollywood_narrator',
    name: 'Hollywood Legend',
    description: 'Iconic, legendary film narrator',
    category: 'celebrity',
    previewText: 'Life is like a box of chocolates. You never know what you gonna get.',
    style: 'hollywood',
    requiredTier: 'enterprise',
    isPremium: true,
    gender: 'male',
    tags: ['iconic', 'legendary', 'film'],
    openaiVoice: 'fable',
    speed: 0.9,
  },
  {
    id: 'sb_custom_clone',
    name: 'Your Voice Clone',
    description: 'Clone your own voice for personalized content',
    category: 'custom',
    previewText: 'Upload a sample and create videos with your own voice.',
    style: 'clone',
    requiredTier: 'enterprise',
    isPremium: true,
    gender: 'neutral',
    tags: ['custom', 'clone', 'personal'],
    openaiVoice: 'alloy',
    speed: 1.0,
  },
];

// Helper functions
export function getVoicesByTier(tier: VoiceTier): FamousVoice[] {
  const tierOrder: VoiceTier[] = ['free', 'starter', 'growth', 'pro', 'enterprise'];
  const tierIndex = tierOrder.indexOf(tier);
  
  return FAMOUS_VOICES.filter(voice => {
    const voiceTierIndex = tierOrder.indexOf(voice.requiredTier);
    return voiceTierIndex <= tierIndex;
  });
}

export function getLockedVoices(tier: VoiceTier): FamousVoice[] {
  const tierOrder: VoiceTier[] = ['free', 'starter', 'growth', 'pro', 'enterprise'];
  const tierIndex = tierOrder.indexOf(tier);
  
  return FAMOUS_VOICES.filter(voice => {
    const voiceTierIndex = tierOrder.indexOf(voice.requiredTier);
    return voiceTierIndex > tierIndex;
  });
}

export function isVoiceUnlocked(voiceId: string, tier: VoiceTier): boolean {
  const voice = FAMOUS_VOICES.find(v => v.id === voiceId);
  if (!voice) return false;
  
  const tierOrder: VoiceTier[] = ['free', 'starter', 'growth', 'pro', 'enterprise'];
  const userTierIndex = tierOrder.indexOf(tier);
  const voiceTierIndex = tierOrder.indexOf(voice.requiredTier);
  
  return voiceTierIndex <= userTierIndex;
}

export function getVoiceById(voiceId: string): FamousVoice | undefined {
  return FAMOUS_VOICES.find(v => v.id === voiceId);
}

export function getVoicesByCategory(category: FamousVoice['category']): FamousVoice[] {
  return FAMOUS_VOICES.filter(v => v.category === category);
}

// Map user tier from subscription to voice tier
export function mapSubscriptionToVoiceTier(subscriptionTier: string): VoiceTier {
  const tierMap: Record<string, VoiceTier> = {
    'free': 'free',
    'trial': 'growth', // Trial users get growth tier access
    'starter': 'starter',
    'growth': 'growth',
    'pro': 'pro',
    'enterprise': 'enterprise',
  };
  return tierMap[subscriptionTier.toLowerCase()] || 'free';
}

// Get the tier name for display
export function getTierDisplayName(tier: VoiceTier): string {
  const names: Record<VoiceTier, string> = {
    'free': 'Free',
    'starter': 'Starter',
    'growth': 'Growth',
    'pro': 'Pro',
    'enterprise': 'Enterprise',
  };
  return names[tier];
}

// Get the tier color for UI
export function getTierColor(tier: VoiceTier): string {
  const colors: Record<VoiceTier, string> = {
    'free': 'text-gray-400',
    'starter': 'text-blue-400',
    'growth': 'text-green-400',
    'pro': 'text-purple-400',
    'enterprise': 'text-yellow-400',
  };
  return colors[tier];
}

export function getTierBgColor(tier: VoiceTier): string {
  const colors: Record<VoiceTier, string> = {
    'free': 'bg-gray-500/20',
    'starter': 'bg-blue-500/20',
    'growth': 'bg-green-500/20',
    'pro': 'bg-purple-500/20',
    'enterprise': 'bg-yellow-500/20',
  };
  return colors[tier];
}
