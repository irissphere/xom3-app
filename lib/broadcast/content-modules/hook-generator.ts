// Broadcast Engine - Hook Generator Module
// Generates 3-second hooks, 1-sentence hooks, and various hook types

import { ClassifiedTrend } from "../trend-engine";

export type HookType = 
  | "curiosity"      // Makes you curious
  | "problem"        // Problem-solution
  | "emotional"      // Emotional trigger
  | "authority"      // Authority/credibility
  | "shocking"       // Shocking statement
  | "question"       // Question hook
  | "story"          // Story hook
  | "trend"          // Trend-aligned

export interface Hook {
  text: string;
  type: HookType;
  length: "3_second" | "1_sentence" | "micro";
  score: number; // 0-100, based on trend relevance, performance, etc.
}

export interface HookContext {
  topic: string;
  trend?: ClassifiedTrend;
  performanceData?: {
    bestPerformingHook?: HookType;
    hookPerformance?: Record<HookType, number>; // Engagement rates
  };
  platform?: string;
}

/**
 * Generate curiosity hook
 */
export function generateCuriosityHook(topic: string, trend?: ClassifiedTrend): Hook {
  let text = "";
  
  if (trend) {
    text = `POV: You just discovered ${topic} is trending...`;
  } else {
    text = `You won't believe what I learned about ${topic}...`;
  }
  
  return {
    text,
    type: "curiosity",
    length: "3_second",
    score: trend ? 85 : 70
  };
}

/**
 * Generate problem-solution hook
 */
export function generateProblemHook(topic: string): Hook {
  const text = `Struggling with ${topic}? Here's the solution:`;
  
  return {
    text,
    type: "problem",
    length: "3_second",
    score: 75
  };
}

/**
 * Generate emotional hook
 */
export function generateEmotionalHook(topic: string): Hook {
  const text = `This ${topic} story will change how you think about everything.`;
  
  return {
    text,
    type: "emotional",
    length: "3_second",
    score: 80
  };
}

/**
 * Generate authority hook
 */
export function generateAuthorityHook(topic: string): Hook {
  const text = `As someone who's worked with ${topic} for years, here's what I learned:`;
  
  return {
    text,
    type: "authority",
    length: "3_second",
    score: 75
  };
}

/**
 * Generate shocking hook
 */
export function generateShockingHook(topic: string): Hook {
  const text = `Everything you think you know about ${topic} is wrong.`;
  
  return {
    text,
    type: "shocking",
    length: "3_second",
    score: 90
  };
}

/**
 * Generate question hook
 */
export function generateQuestionHook(topic: string): Hook {
  const text = `Did you know that ${topic}? Most people don't.`;
  
  return {
    text,
    type: "question",
    length: "3_second",
    score: 70
  };
}

/**
 * Generate story hook
 */
export function generateStoryHook(topic: string): Hook {
  const text = `Let me tell you about the time I discovered ${topic}...`;
  
  return {
    text,
    type: "story",
    length: "3_second",
    score: 75
  };
}

/**
 * Generate trend-aligned hook
 */
export function generateTrendHook(topic: string, trend: ClassifiedTrend): Hook {
  let text = "";
  
  if (trend.category === "breakout") {
    text = `${topic} is exploding right now. Here's why:`;
  } else if (trend.category === "sustained") {
    text = `${topic} is growing fast. Here's everything you need to know:`;
  } else if (trend.category === "seasonal") {
    text = `${topic} season is here. Don't miss this:`;
  } else {
    text = `${topic} is trending. Here's the deep dive:`;
  }
  
  return {
    text,
    type: "trend",
    length: "3_second",
    score: trend.opportunity
  };
}

/**
 * Generate 1-sentence hook
 */
export function generateOneSentenceHook(topic: string, type: HookType): Hook {
  const generators: Record<HookType, (topic: string) => string> = {
    curiosity: (t) => `You need to know about ${t}.`,
    problem: (t) => `${t} is easier than you think.`,
    emotional: (t) => `This ${t} story changed everything.`,
    authority: (t) => `After years of ${t}, here's what I learned.`,
    shocking: (t) => `${t} is not what you think.`,
    question: (t) => `What if ${t} could change your life?`,
    story: (t) => `I discovered ${t} by accident.`,
    trend: (t) => `${t} is trending for a reason.`
  };
  
  return {
    text: generators[type](topic),
    type,
    length: "1_sentence",
    score: 65
  };
}

/**
 * Generate micro hook (ultra-short)
 */
export function generateMicroHook(topic: string): Hook {
  const text = `${topic} in 10 seconds:`;
  
  return {
    text,
    type: "curiosity",
    length: "micro",
    score: 60
  };
}

/**
 * Generate multiple hook variations
 */
export function generateHookVariations(context: HookContext): Hook[] {
  const { topic, trend, performanceData } = context;
  
  const hooks: Hook[] = [];
  
  // Generate all hook types
  hooks.push(generateCuriosityHook(topic, trend));
  hooks.push(generateProblemHook(topic));
  hooks.push(generateEmotionalHook(topic));
  hooks.push(generateAuthorityHook(topic));
  hooks.push(generateShockingHook(topic));
  hooks.push(generateQuestionHook(topic));
  hooks.push(generateStoryHook(topic));
  
  // Add trend hook if trend exists
  if (trend) {
    hooks.push(generateTrendHook(topic, trend));
  }
  
  // Boost scores based on performance data
  if (performanceData?.hookPerformance) {
    for (const hook of hooks) {
      const performance = performanceData.hookPerformance[hook.type];
      if (performance) {
        hook.score = Math.min(100, hook.score + (performance * 20)); // Boost by performance
      }
    }
  }
  
  // Sort by score (highest first)
  hooks.sort((a, b) => b.score - a.score);
  
  return hooks;
}

/**
 * Get best hook for context
 */
export function getBestHook(context: HookContext): Hook {
  const hooks = generateHookVariations(context);
  return hooks[0]; // Highest scoring hook
}
