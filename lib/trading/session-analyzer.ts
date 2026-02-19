/**
 * XOM3 Market Session Analyzer
 * Optimal trading windows for binary options
 */

import type {
  TradingSession,
  MarketSession,
  SessionAnalysis,
  EconomicEvent,
  TimeFrame,
} from './types';

// ============================================================
// SESSION DEFINITIONS
// ============================================================

export const MARKET_SESSIONS: Record<TradingSession, MarketSession> = {
  sydney: {
    id: 'sydney',
    name: 'Sydney Session',
    startHourUTC: 21, // 9 PM UTC (previous day)
    endHourUTC: 6,    // 6 AM UTC
    volatility: 'low',
    bestPairs: ['AUD/USD', 'AUD/JPY', 'NZD/USD'],
    quality: 'poor',
  },
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo Session',
    startHourUTC: 0,  // Midnight UTC
    endHourUTC: 9,    // 9 AM UTC
    volatility: 'medium',
    bestPairs: ['USD/JPY', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY'],
    quality: 'good',
  },
  london: {
    id: 'london',
    name: 'London Session',
    startHourUTC: 8,  // 8 AM UTC
    endHourUTC: 17,   // 5 PM UTC
    volatility: 'high',
    bestPairs: ['EUR/USD', 'GBP/USD', 'EUR/GBP', 'USD/CHF'],
    quality: 'optimal',
  },
  newyork: {
    id: 'newyork',
    name: 'New York Session',
    startHourUTC: 13, // 1 PM UTC
    endHourUTC: 22,   // 10 PM UTC
    volatility: 'high',
    bestPairs: ['EUR/USD', 'GBP/USD', 'USD/CAD', 'USD/JPY'],
    quality: 'optimal',
  },
  overlap_london_ny: {
    id: 'overlap_london_ny',
    name: 'London-NY Overlap',
    startHourUTC: 13, // 1 PM UTC
    endHourUTC: 17,   // 5 PM UTC
    volatility: 'high',
    bestPairs: ['EUR/USD', 'GBP/USD', 'USD/CHF', 'USD/JPY'],
    quality: 'optimal',
  },
};

// ============================================================
// SESSION DETECTION
// ============================================================

export function getCurrentSession(): TradingSession {
  const now = new Date();
  const hourUTC = now.getUTCHours();
  
  // Check for London-NY overlap first (highest priority)
  if (hourUTC >= 13 && hourUTC < 17) {
    return 'overlap_london_ny';
  }
  
  // London session
  if (hourUTC >= 8 && hourUTC < 17) {
    return 'london';
  }
  
  // New York session
  if (hourUTC >= 13 && hourUTC < 22) {
    return 'newyork';
  }
  
  // Tokyo session
  if (hourUTC >= 0 && hourUTC < 9) {
    return 'tokyo';
  }
  
  // Sydney session (spans midnight UTC)
  if (hourUTC >= 21 || hourUTC < 6) {
    return 'sydney';
  }
  
  // Default to nearest session
  return 'london';
}

export function isSessionActive(session: TradingSession): boolean {
  const now = new Date();
  const hourUTC = now.getUTCHours();
  const sessionInfo = MARKET_SESSIONS[session];
  
  // Handle sessions that span midnight
  if (sessionInfo.startHourUTC > sessionInfo.endHourUTC) {
    return hourUTC >= sessionInfo.startHourUTC || hourUTC < sessionInfo.endHourUTC;
  }
  
  return hourUTC >= sessionInfo.startHourUTC && hourUTC < sessionInfo.endHourUTC;
}

// ============================================================
// TIME CALCULATIONS
// ============================================================

export function getHoursUntilSession(session: TradingSession): number {
  const now = new Date();
  const hourUTC = now.getUTCHours();
  const minuteUTC = now.getUTCMinutes();
  
  const sessionInfo = MARKET_SESSIONS[session];
  const targetHour = sessionInfo.startHourUTC;
  
  let hoursUntil = targetHour - hourUTC;
  if (hoursUntil <= 0) {
    hoursUntil += 24;
  }
  
  // Subtract partial hour
  return hoursUntil - (minuteUTC / 60);
}

export function getNextOptimalSession(): { session: TradingSession; hoursUntil: number } {
  const optimalSessions: TradingSession[] = ['overlap_london_ny', 'london', 'newyork'];
  
  let nearestSession = optimalSessions[0];
  let nearestHours = Infinity;
  
  for (const session of optimalSessions) {
    if (isSessionActive(session)) {
      return { session, hoursUntil: 0 };
    }
    
    const hours = getHoursUntilSession(session);
    if (hours < nearestHours) {
      nearestHours = hours;
      nearestSession = session;
    }
  }
  
  return { session: nearestSession, hoursUntil: nearestHours };
}

// ============================================================
// RECOMMENDED TIMEFRAMES BY SESSION
// ============================================================

export function getRecommendedTimeframes(session: TradingSession): TimeFrame[] {
  const sessionInfo = MARKET_SESSIONS[session];
  
  switch (sessionInfo.volatility) {
    case 'high':
      // High volatility = faster timeframes work well
      return ['1m', '5m', '15m', '30m'];
    case 'medium':
      // Medium volatility = moderate timeframes
      return ['5m', '15m', '30m', '1h'];
    case 'low':
      // Low volatility = longer timeframes needed
      return ['15m', '30m', '1h', '4h'];
    default:
      return ['5m', '15m'];
  }
}

// ============================================================
// ECONOMIC CALENDAR (Simplified)
// ============================================================

// In production, this would fetch from an API like ForexFactory
export function getUpcomingNews(hoursAhead: number = 4): EconomicEvent[] {
  // Placeholder - in production, fetch from economic calendar API
  const now = Date.now();
  
  // Example events (would be fetched from API)
  const mockEvents: EconomicEvent[] = [
    {
      id: 'fed-rate',
      name: 'Fed Interest Rate Decision',
      currency: 'USD',
      impact: 'high',
      timestamp: now + 3600000 * 2, // 2 hours from now
    },
    {
      id: 'eu-gdp',
      name: 'EU GDP Release',
      currency: 'EUR',
      impact: 'high',
      timestamp: now + 3600000 * 5, // 5 hours from now
    },
    {
      id: 'uk-cpi',
      name: 'UK CPI Data',
      currency: 'GBP',
      impact: 'medium',
      timestamp: now + 3600000 * 1, // 1 hour from now
    },
  ];
  
  // Filter to events within hoursAhead
  const cutoff = now + (hoursAhead * 3600000);
  return mockEvents.filter(e => e.timestamp <= cutoff && e.timestamp > now);
}

export function isNearHighImpactNews(minutesBefore: number = 30): boolean {
  const now = Date.now();
  const upcomingNews = getUpcomingNews(1);
  
  for (const event of upcomingNews) {
    if (event.impact === 'high') {
      const timeDiff = event.timestamp - now;
      const minutesUntil = timeDiff / 60000;
      
      if (minutesUntil <= minutesBefore) {
        return true;
      }
    }
  }
  
  return false;
}

// ============================================================
// VOLATILITY EXPECTATIONS
// ============================================================

export interface VolatilityExpectation {
  level: 'low' | 'medium' | 'high';
  factors: string[];
}

export function getVolatilityExpectation(): VolatilityExpectation {
  const session = getCurrentSession();
  const sessionInfo = MARKET_SESSIONS[session];
  const factors: string[] = [];
  let level = sessionInfo.volatility;
  
  factors.push(`${sessionInfo.name}: typically ${sessionInfo.volatility} volatility`);
  
  // Adjust for news
  const upcomingNews = getUpcomingNews(2);
  const highImpactNews = upcomingNews.filter(n => n.impact === 'high');
  
  if (highImpactNews.length > 0) {
    level = 'high';
    factors.push(`High-impact news upcoming: ${highImpactNews.map(n => n.name).join(', ')}`);
  }
  
  // Day of week adjustments
  const dayOfWeek = new Date().getUTCDay();
  if (dayOfWeek === 5) {
    factors.push('Friday: potential for weekend positioning');
  } else if (dayOfWeek === 1) {
    factors.push('Monday: potential gaps from weekend');
  }
  
  // First/last hour of session
  const hourUTC = new Date().getUTCHours();
  if (hourUTC === sessionInfo.startHourUTC || hourUTC === sessionInfo.endHourUTC - 1) {
    factors.push('Session open/close: increased activity expected');
    if (level === 'low') level = 'medium';
  }
  
  return { level, factors };
}

// ============================================================
// FULL SESSION ANALYSIS
// ============================================================

export function getSessionAnalysis(): SessionAnalysis {
  const currentSession = getCurrentSession();
  const sessionInfo = MARKET_SESSIONS[currentSession];
  const volatility = getVolatilityExpectation();
  const { hoursUntil: hoursUntilNextOptimal } = getNextOptimalSession();
  
  const isOverlap = currentSession === 'overlap_london_ny';
  const upcomingNews = getUpcomingNews(4);
  
  // Generate recommendation
  let recommendation = '';
  
  if (sessionInfo.quality === 'optimal') {
    if (isNearHighImpactNews(30)) {
      recommendation = 'Optimal session but high-impact news approaching. Wait for release or reduce position size.';
    } else {
      recommendation = 'Excellent trading conditions. All timeframes viable.';
    }
  } else if (sessionInfo.quality === 'good') {
    recommendation = `Good conditions. Focus on ${sessionInfo.bestPairs.slice(0, 3).join(', ')} pairs.`;
  } else {
    if (hoursUntilNextOptimal <= 2) {
      recommendation = `Suboptimal session. Optimal trading in ${Math.round(hoursUntilNextOptimal * 60)} minutes.`;
    } else {
      recommendation = 'Low volatility session. Consider longer expiry times or wait for better conditions.';
    }
  }
  
  return {
    currentSession,
    isOverlap,
    quality: sessionInfo.quality,
    volatilityExpected: volatility.level,
    recommendedTimeframes: getRecommendedTimeframes(currentSession),
    hoursUntilNextOptimal: Math.round(hoursUntilNextOptimal * 100) / 100,
    upcomingNews,
    recommendation,
  };
}

// ============================================================
// BEST TIME TO TRADE
// ============================================================

export interface OptimalTradingWindow {
  start: Date;
  end: Date;
  session: TradingSession;
  quality: 'optimal' | 'good' | 'poor';
  recommendation: string;
}

export function getOptimalTradingWindows(daysAhead: number = 1): OptimalTradingWindow[] {
  const windows: OptimalTradingWindow[] = [];
  const now = new Date();
  
  for (let day = 0; day < daysAhead; day++) {
    const baseDate = new Date(now);
    baseDate.setUTCDate(baseDate.getUTCDate() + day);
    baseDate.setUTCMinutes(0, 0, 0);
    
    // Skip weekends
    const dayOfWeek = baseDate.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // London-NY Overlap (Best)
    const overlapStart = new Date(baseDate);
    overlapStart.setUTCHours(13);
    const overlapEnd = new Date(baseDate);
    overlapEnd.setUTCHours(17);
    
    windows.push({
      start: overlapStart,
      end: overlapEnd,
      session: 'overlap_london_ny',
      quality: 'optimal',
      recommendation: 'Best time to trade. Maximum liquidity and volatility.',
    });
    
    // London pre-overlap
    const londonStart = new Date(baseDate);
    londonStart.setUTCHours(8);
    const londonEnd = new Date(baseDate);
    londonEnd.setUTCHours(13);
    
    windows.push({
      start: londonStart,
      end: londonEnd,
      session: 'london',
      quality: 'optimal',
      recommendation: 'European session. Great for EUR and GBP pairs.',
    });
    
    // NY post-overlap
    const nyStart = new Date(baseDate);
    nyStart.setUTCHours(17);
    const nyEnd = new Date(baseDate);
    nyEnd.setUTCHours(20);
    
    windows.push({
      start: nyStart,
      end: nyEnd,
      session: 'newyork',
      quality: 'good',
      recommendation: 'US session continues. Good for USD pairs.',
    });
  }
  
  return windows
    .filter(w => w.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

// ============================================================
// FORMAT HELPERS
// ============================================================

export function formatSessionTime(session: TradingSession): string {
  const info = MARKET_SESSIONS[session];
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:00 ${period}`;
  };
  
  return `${formatHour(info.startHourUTC)} - ${formatHour(info.endHourUTC)} UTC`;
}

export function formatSessionSummary(analysis: SessionAnalysis): string {
  const sessionInfo = MARKET_SESSIONS[analysis.currentSession];
  
  const lines = [
    `📊 Current Session: ${sessionInfo.name}`,
    `⏰ Time: ${formatSessionTime(analysis.currentSession)}`,
    `✨ Quality: ${analysis.quality.toUpperCase()}`,
    `📈 Volatility: ${analysis.volatilityExpected.toUpperCase()}`,
    `⏱️ Timeframes: ${analysis.recommendedTimeframes.join(', ')}`,
  ];
  
  if (analysis.upcomingNews.length > 0) {
    lines.push('');
    lines.push('📰 Upcoming News:');
    for (const event of analysis.upcomingNews) {
      const impact = event.impact === 'high' ? '🔴' : event.impact === 'medium' ? '🟡' : '🟢';
      lines.push(`  ${impact} ${event.name} (${event.currency})`);
    }
  }
  
  lines.push('');
  lines.push(`💡 ${analysis.recommendation}`);
  
  return lines.join('\n');
}
