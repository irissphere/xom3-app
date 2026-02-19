// Broadcast Engine - Script Generator Module
// Generates long-form, short-form, micro, and carousel scripts

import { Platform } from "../types";
import { ClassifiedTrend } from "../trend-engine";

export interface ScriptVariants {
  long: string; // 5+ minutes (YouTube, LinkedIn)
  medium: string; // 2-5 minutes (YouTube, Facebook)
  short: string; // 30-60 seconds (TikTok, IG Reels, Shorts)
  micro: string; // 10-30 seconds (X, LinkedIn posts)
  carousel: string[]; // Carousel slides (Instagram, LinkedIn)
}

export interface ScriptContext {
  topic: string;
  trend?: ClassifiedTrend;
  targetAudience?: string;
  funnelStage?: string;
  performanceData?: {
    bestPerformingStyle?: string;
    bestPerformingLength?: string;
    bestPerformingHook?: string;
  };
  seasonalContext?: string; // "open_enrollment", "tax_season", etc.
}

/**
 * Generate long-form script (5+ minutes)
 */
export function generateLongFormScript(context: ScriptContext): string {
  const { topic, trend, seasonalContext } = context;
  
  let script = "";
  
  // Hook (first 30 seconds)
  script += `Welcome to this comprehensive guide on ${topic}. `;
  if (trend) {
    script += `${topic} is trending right now, and here's everything you need to know. `;
  }
  if (seasonalContext === "open_enrollment") {
    script += `Open enrollment is here, and this is the perfect time to understand ${topic}. `;
  }
  script += `\n\n`;
  
  // Introduction
  script += `In this video, we'll cover:\n`;
  script += `1. What ${topic} is and why it matters\n`;
  script += `2. How it works in practice\n`;
  script += `3. What you need to know\n`;
  script += `4. Common mistakes to avoid\n`;
  script += `5. Next steps you should take\n`;
  script += `\n\n`;
  
  // Main content
  script += `Let's start with the basics. ${topic} is...\n\n`;
  script += `Here's why this matters: ...\n\n`;
  script += `Now let's talk about how it works: ...\n\n`;
  script += `One thing many people get wrong is...\n\n`;
  script += `Here's what you should do instead: ...\n\n`;
  
  // Conclusion
  script += `To recap: ${topic} is important because...\n\n`;
  script += `If you found this helpful, make sure to...\n\n`;
  
  return script;
}

/**
 * Generate medium-form script (2-5 minutes)
 */
export function generateMediumFormScript(context: ScriptContext): string {
  const { topic, trend, performanceData } = context;
  
  let script = "";
  
  // Hook (first 15 seconds)
  const hookStyle = performanceData?.bestPerformingHook || "question";
  if (hookStyle === "question") {
    script += `Did you know that ${topic}? Most people don't. Here's what you need to know.\n\n`;
  } else if (hookStyle === "shocking") {
    script += `Everything you think you know about ${topic} is wrong. Here's the truth.\n\n`;
  } else {
    script += `${topic} is changing everything. Here's why it matters.\n\n`;
  }
  
  // Main content (3 key points)
  script += `First, let's understand what ${topic} is: ...\n\n`;
  script += `Second, here's how it works: ...\n\n`;
  script += `Finally, here's what you should do: ...\n\n`;
  
  // CTA
  script += `Want to learn more? Check the link below.\n\n`;
  
  return script;
}

/**
 * Generate short-form script (30-60 seconds)
 */
export function generateShortFormScript(context: ScriptContext): string {
  const { topic, trend, performanceData } = context;
  
  let script = "";
  
  // Hook (first 3 seconds)
  const hookStyle = performanceData?.bestPerformingHook || "curiosity";
  if (hookStyle === "curiosity") {
    script += `POV: You just learned about ${topic}...\n\n`;
  } else if (hookStyle === "problem") {
    script += `Struggling with ${topic}? Here's the solution:\n\n`;
  } else {
    script += `${topic} in 60 seconds:\n\n`;
  }
  
  // Main content (1-2 key points)
  script += `${topic} is...\n\n`;
  script += `Here's what you need to know: ...\n\n`;
  
  // Quick CTA
  script += `Save this for later! 👆\n\n`;
  
  return script;
}

/**
 * Generate micro script (10-30 seconds)
 */
export function generateMicroScript(context: ScriptContext): string {
  const { topic, trend } = context;
  
  let script = "";
  
  // Single hook + one point
  if (trend) {
    script += `${topic} is trending. Here's why: ...\n\n`;
  } else {
    script += `Quick tip: ${topic}. Here's what you need to know: ...\n\n`;
  }
  
  return script;
}

/**
 * Generate carousel script (multiple slides)
 */
export function generateCarouselScript(context: ScriptContext): string[] {
  const { topic } = context;
  
  const slides = [
    `Slide 1: ${topic} - What is it?\n\n${topic} is...`,
    `Slide 2: Why it matters\n\nHere's why ${topic} is important: ...`,
    `Slide 3: How it works\n\nHere's how ${topic} works: ...`,
    `Slide 4: Common mistakes\n\nDon't make these mistakes with ${topic}: ...`,
    `Slide 5: Next steps\n\nHere's what you should do: ...`
  ];
  
  return slides;
}

/**
 * Generate all script variants
 */
export function generateScriptVariants(context: ScriptContext): ScriptVariants {
  return {
    long: generateLongFormScript(context),
    medium: generateMediumFormScript(context),
    short: generateShortFormScript(context),
    micro: generateMicroScript(context),
    carousel: generateCarouselScript(context)
  };
}
