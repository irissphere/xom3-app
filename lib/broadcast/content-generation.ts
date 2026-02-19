// Broadcast Engine - Layer 1: Content Generation Engine
// Generates scripts, captions, hooks, CTAs, hashtags, thumbnails, titles, descriptions

import { Platform } from "./types";
import { getRecommendedTopics } from "./adaptive-strategy";
import { getBestPerformingPatterns } from "./learning-engine";
import { generateScriptVariants, ScriptContext } from "./content-modules/script-generator";
import { generateHookVariations, getBestHook, HookContext } from "./content-modules/hook-generator";
import { generateCTAVariations, getBestCTA, CTAContext } from "./content-modules/cta-generator";
import { generateHashtagCluster, generateHashtagClusters, HashtagContext } from "./content-modules/hashtag-generator";
import { generateThumbnailVariations, getBestThumbnail, ThumbnailContext } from "./content-modules/thumbnail-generator";
import { ClassifiedTrend } from "./trend-engine";

export interface GeneratedContent {
  id: string;
  topic: string;
  trend_id?: string;
  script: {
    long: string;
    medium: string;
    short: string;
    micro: string;
    carousel: string[];
  };
  hooks: Array<{
    text: string;
    type: string;
    length: string;
    score: number;
  }>;
  captions: {
    tiktok: string;
    instagram: string;
    youtube: string;
    linkedin: string;
    x: string;
  };
  ctas: Array<{
    text: string;
    style: string;
    platform: Platform;
    score: number;
  }>;
  hashtags: {
    tiktok: string[];
    instagram: string[];
    youtube: string[];
    linkedin: string[];
  };
  thumbnail_text: Array<{
    text: string;
    style: string;
    color?: string;
    position?: string;
    score: number;
  }>;
  title: string;
  description: string;
  thumbnailPrompt?: string;
  platforms: Platform[];
  variants: PlatformVariant[];
  shortFormCuts?: ShortFormCut[];
  metadata: {
    topics: string[];
    format: string;
    duration?: number;
    generatedAt: string;
    performanceData?: any;
  };
}

export interface PlatformVariant {
  platform: Platform;
  caption: string;
  hashtags: string[];
  title?: string;
  description?: string;
  cta: string;
  optimized: boolean;
}

export interface ShortFormCut {
  startTime: number; // seconds
  endTime: number; // seconds
  hook: string;
  caption: string;
  platforms: Platform[];
}

/**
 * Generate script from topic
 */
export function generateScript(
  topic: string,
  context?: {
    length?: "short" | "medium" | "long"; // 30s, 2min, 5min
    style?: "educational" | "story" | "hook" | "cta";
    targetAudience?: string;
  }
): string {
  const length = context?.length || "medium";
  const style = context?.style || "educational";
  
  // Template-based generation (in production, use AI/LLM)
  const templates = {
    short: {
      educational: `Quick tip: ${topic}. Here's what you need to know...`,
      story: `I remember when I first learned about ${topic}. Here's what happened...`,
      hook: `Did you know that ${topic}? Most people don't. Here's why...`,
      cta: `${topic} is changing everything. Want to learn more?`
    },
    medium: {
      educational: `Today we're diving deep into ${topic}. This is important because... First, let's understand... Second, here's how it works... Finally, here's what you should do...`,
      story: `Let me tell you about ${topic}. It started when... Then I realized... Now I want to share...`,
      hook: `You've probably heard about ${topic}, but here's what they're not telling you... The truth is... Here's what you need to know...`,
      cta: `${topic} could change your life. Here's why it matters... Here's how to get started...`
    },
    long: {
      educational: `Welcome to this comprehensive guide on ${topic}. We'll cover: 1) What it is, 2) Why it matters, 3) How it works, 4) What you need to know, 5) Next steps. Let's begin...`,
      story: `This is the story of ${topic}. It began... Over time... I learned... Now I want to share...`,
      hook: `Everything you think you know about ${topic} is wrong. Here's the real story...`,
      cta: `${topic} is the future. Here's everything you need to know to get started...`
    }
  };
  
  return templates[length][style] || templates.medium.educational;
}

/**
 * Generate hook from script
 */
export function generateHook(script: string, style?: "question" | "statement" | "shocking" | "story"): string {
  const firstSentence = script.split(/[.!?]/)[0].trim();
  
  if (style === "question") {
    return `Did you know ${firstSentence.toLowerCase()}?`;
  }
  
  if (style === "shocking") {
    return `You won't believe this: ${firstSentence}`;
  }
  
  if (style === "story") {
    return `Let me tell you about ${firstSentence.toLowerCase()}...`;
  }
  
  // Default: use first sentence as hook
  return firstSentence;
}

/**
 * Generate caption from script
 */
function generateCaption(
  script: string,
  platform: Platform,
  options?: {
    includeHook?: boolean;
    includeCTA?: boolean;
    maxLength?: number;
  }
): string {
  const includeHook = options?.includeHook !== false;
  const includeCTA = options?.includeCTA !== false;
  const maxLength = options?.maxLength || (platform === "twitter" ? 280 : 2200);
  
  let caption = "";
  
  if (includeHook) {
    caption += generateHook(script) + "\n\n";
  }
  
  // Extract key points from script (first 2-3 sentences)
  const sentences = script.split(/[.!?]/).filter(s => s.trim().length > 0).slice(0, 3);
  caption += sentences.join(". ") + ".";
  
  if (includeCTA) {
    caption += "\n\n" + generateCTA(platform);
  }
  
  // Truncate if needed
  if (caption.length > maxLength) {
    caption = caption.substring(0, maxLength - 3) + "...";
  }
  
  return caption;
}

/**
 * Generate CTA
 */
function generateCTA(platform: Platform, style?: "direct" | "soft" | "question"): string {
  const ctas = {
    direct: [
      "Learn more at xom3.io",
      "Get started today → xom3.io",
      "Schedule a consultation",
      "Visit xom3.io to learn more"
    ],
    soft: [
      "Want to learn more?",
      "Curious? Check out xom3.io",
      "Interested? Link in bio",
      "Learn more in the link below"
    ],
    question: [
      "Ready to get started?",
      "Want to know more?",
      "Have questions? DM me",
      "Interested? Let's talk"
    ]
  };
  
  const styleToUse = style || (platform === "linkedin" ? "soft" : "direct");
  const platformCTAs = ctas[styleToUse];
  
  if (platform === "instagram" || platform === "tiktok") {
    return "Link in bio 👆";
  }
  
  return platformCTAs[Math.floor(Math.random() * platformCTAs.length)];
}

/**
 * Generate hashtags
 */
export function generateHashtags(
  topic: string,
  platform: Platform,
  count: number = 5,
  strategy?: "trending" | "niche" | "mixed"
): string[] {
  // Extract keywords from topic
  const keywords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !["the", "and", "for", "are", "but", "not", "you", "all", "can"].includes(word));
  
  // Add platform-specific hashtags
  const platformTags: Record<Platform, string[]> = {
    youtube: ["youtube", "video", "tutorial"],
    tiktok: ["tiktok", "fyp", "viral"],
    instagram: ["instagram", "reels", "viral"],
    facebook: ["facebook", "video"],
    linkedin: ["linkedin", "professional", "business"],
    twitter: ["twitter", "thread"],
    shorts: ["shorts", "youtube"],
    reels: ["reels", "instagram"]
  };
  
  const tags = [...keywords, ...(platformTags[platform] || [])];
  
  // Remove duplicates and format
  const unique = Array.from(new Set(tags))
    .map(tag => tag.replace(/[^a-z0-9]/g, ""))
    .filter(tag => tag.length > 0)
    .slice(0, count);
  
  return unique;
}

/**
 * Generate title
 */
export function generateTitle(script: string, platform: Platform): string {
  const firstSentence = script.split(/[.!?]/)[0].trim();
  
  // Platform-specific title styles
  if (platform === "youtube") {
    // YouTube titles are often longer and keyword-rich
    return `${firstSentence} | Complete Guide`;
  }
  
  if (platform === "linkedin") {
    // LinkedIn titles are professional
    return firstSentence;
  }
  
  // Default: use first sentence
  return firstSentence;
}

/**
 * Generate description
 */
export function generateDescription(script: string, maxLength: number = 200): string {
  const sentences = script.split(/[.!?]/).filter(s => s.trim().length > 0);
  let description = sentences.slice(0, 3).join(". ") + ".";
  
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 3) + "...";
  }
  
  return description;
}

/**
 * Generate thumbnail prompt
 */
export function generateThumbnailPrompt(topic: string, style?: "professional" | "bold" | "minimal"): string {
  const styles = {
    professional: `Professional thumbnail for ${topic}, clean design, text overlay`,
    bold: `Bold, eye-catching thumbnail for ${topic}, bright colors, large text`,
    minimal: `Minimal thumbnail for ${topic}, simple design, elegant typography`
  };
  
  return styles[style || "professional"];
}

/**
 * Generate platform variants
 */
export function generatePlatformVariants(
  script: string,
  platforms: Platform[],
  options?: {
    includeTrending?: boolean;
    ctaStyle?: "direct" | "soft" | "question";
  }
): PlatformVariant[] {
  const variants: PlatformVariant[] = [];
  
  for (const platform of platforms) {
    const caption = generateCaption(script, platform, {
      includeHook: true,
      includeCTA: true
    });
    
    const hashtags = generateHashtags(script, platform, platform === "instagram" ? 10 : 5);
    const cta = generateCTA(platform, options?.ctaStyle);
    const title = platform === "youtube" ? generateTitle(script, platform) : undefined;
    const description = platform === "youtube" ? generateDescription(script) : undefined;
    
    variants.push({
      platform,
      caption,
      hashtags,
      title,
      description,
      cta,
      optimized: options?.includeTrending === true
    });
  }
  
  return variants;
}

/**
 * Generate short-form cuts from long-form script
 */
export function generateShortFormCuts(
  script: string,
  duration: number, // total duration in seconds
  platforms: Platform[]
): ShortFormCut[] {
  const cuts: ShortFormCut[] = [];
  
  // Divide script into segments (assuming 1 sentence = ~3 seconds)
  const sentences = script.split(/[.!?]/).filter(s => s.trim().length > 0);
  const sentencesPerCut = Math.ceil(sentences.length / 3); // 3 cuts from long-form
  
  for (let i = 0; i < sentences.length; i += sentencesPerCut) {
    const segment = sentences.slice(i, i + sentencesPerCut).join(". ") + ".";
    const startTime = (i / sentences.length) * duration;
    const endTime = ((i + sentencesPerCut) / sentences.length) * duration;
    
    cuts.push({
      startTime: Math.floor(startTime),
      endTime: Math.floor(endTime),
      hook: generateHook(segment),
      caption: generateCaption(segment, "tiktok", { maxLength: 150 }),
      platforms: platforms.filter(p => p === "tiktok" || p === "shorts" || p === "reels")
    });
  }
  
  return cuts;
}

/**
 * Generate complete content package (enhanced with all 6 modules)
 */
export async function generateContent(
  topic: string,
  platforms: Platform[],
  options?: {
    length?: "short" | "medium" | "long";
    style?: "educational" | "story" | "hook" | "cta";
    includeShortForm?: boolean;
    includeTrending?: boolean;
    ctaStyle?: "direct" | "soft" | "question";
    trend?: ClassifiedTrend;
    funnelStage?: string;
    seasonalContext?: string;
    performanceData?: any;
  }
): Promise<GeneratedContent> {
  // Script Context
  const scriptContext: ScriptContext = {
    topic,
    trend: options?.trend,
    seasonalContext: options?.seasonalContext,
    performanceData: options?.performanceData
  };
  
  // Generate all script variants
  const scriptVariants = generateScriptVariants(scriptContext);
  
  // Select script based on length option
  const selectedScript = options?.length === "short" 
    ? scriptVariants.short 
    : options?.length === "long"
    ? scriptVariants.long
    : scriptVariants.medium;
  
  // Hook Context
  const hookContext: HookContext = {
    topic,
    trend: options?.trend,
    performanceData: options?.performanceData
  };
  
  // Generate hook variations
  const hooks = generateHookVariations(hookContext);
  const bestHook = getBestHook(hookContext);
  
  // Generate captions for each platform
  const captions = {
    tiktok: generateCaption(selectedScript, "tiktok", { maxLength: 2200 }),
    instagram: generateCaption(selectedScript, "instagram", { maxLength: 2200 }),
    youtube: generateCaption(selectedScript, "youtube", { maxLength: 5000 }),
    linkedin: generateCaption(selectedScript, "linkedin", { maxLength: 3000 }),
    x: generateCaption(selectedScript, "twitter", { maxLength: 280 })
  };
  
  // Generate CTA variations for each platform
  const ctas: Array<{ text: string; style: string; platform: Platform; score: number }> = [];
  for (const platform of platforms) {
    const ctaContext: CTAContext = {
      platform,
      funnelStage: options?.funnelStage,
      seasonalContext: options?.seasonalContext,
      trend: options?.trend,
      performanceData: options?.performanceData
    };
    
    const platformCTAs = generateCTAVariations(ctaContext);
    ctas.push(...platformCTAs);
  }
  
  // Generate hashtag clusters for each platform
  const hashtags: Record<string, string[]> = {};
  for (const platform of platforms) {
    if (platform === "tiktok" || platform === "instagram" || platform === "reels") {
      const hashtagContext: HashtagContext = {
        topic,
        platform,
        trend: options?.trend,
        strategy: options?.includeTrending ? "trending" : "mixed",
        count: platform === "tiktok" ? 100 : 30,
        performanceData: options?.performanceData
      };
      
      const cluster = generateHashtagCluster(hashtagContext);
      hashtags[platform] = cluster.hashtags;
    }
  }
  
  // Generate thumbnail text variations
  const thumbnailContext: ThumbnailContext = {
    topic,
    trend: options?.trend,
    hook: bestHook.text,
    performanceData: options?.performanceData
  };
  
  const thumbnailTexts = generateThumbnailVariations(thumbnailContext);
  
  // Generate title
  const title = generateTitle(selectedScript, platforms[0] || "youtube");
  
  // Generate description
  const description = generateDescription(selectedScript);
  
  // Generate thumbnail prompt
  const thumbnailPrompt = generateThumbnailPrompt(topic);
  
  // Generate platform variants (legacy support)
  const variants = generatePlatformVariants(selectedScript, platforms, {
    includeTrending: options?.includeTrending,
    ctaStyle: options?.ctaStyle
  });
  
  // Generate short-form cuts if requested
  const shortFormCuts = options?.includeShortForm
    ? generateShortFormCuts(selectedScript, 300, platforms) // Assume 5min = 300s
    : undefined;
  
  return {
    id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    topic,
    trend_id: options?.trend?.id,
    script: scriptVariants,
    hooks: hooks.map(h => ({
      text: h.text,
      type: h.type,
      length: h.length,
      score: h.score
    })),
    captions,
    ctas: ctas.map(c => ({
      text: c.text,
      style: c.style,
      platform: c.platform,
      score: c.score
    })),
    hashtags: hashtags as any,
    thumbnail_text: thumbnailTexts.map(t => ({
      text: t.text,
      style: t.style,
      color: t.color,
      position: t.position,
      score: t.score
    })),
    title,
    description,
    thumbnailPrompt,
    platforms,
    variants,
    shortFormCuts,
    metadata: {
      topics: [topic],
      format: options?.length === "short" ? "short" : "long",
      duration: options?.length === "short" ? 30 : options?.length === "medium" ? 120 : 300,
      generatedAt: new Date().toISOString(),
      performanceData: options?.performanceData
    }
  };
}
