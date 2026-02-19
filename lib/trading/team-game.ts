/**
 * XOM3 Team Prediction Game
 * Collaborative trading prediction with leaderboards
 */

import { randomUUID } from 'crypto';
import type {
  TeamMember,
  TeamMemberStats,
  TeamPrediction,
  PredictionVote,
  TeamLeaderboard,
  LeaderboardEntry,
  TradeDirection,
  TimeFrame,
} from './types';

// ============================================================
// IN-MEMORY STORE (Replace with Supabase in production)
// ============================================================

interface TeamGameStore {
  members: Map<string, TeamMember>;
  predictions: Map<string, TeamPrediction>;
  history: TeamPrediction[];
}

const store: TeamGameStore = {
  members: new Map(),
  predictions: new Map(),
  history: [],
};

// ============================================================
// TEAM MEMBER MANAGEMENT
// ============================================================

export function createTeamMember(
  userId: string,
  name: string,
  avatar?: string
): TeamMember {
  const member: TeamMember = {
    id: userId,
    name,
    avatar,
    joinedAt: Date.now(),
    stats: {
      totalPredictions: 0,
      correctPredictions: 0,
      winRate: 0,
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      rank: 0,
      badges: [],
    },
  };
  
  store.members.set(userId, member);
  return member;
}

export function getTeamMember(userId: string): TeamMember | null {
  return store.members.get(userId) || null;
}

export function updateMemberStats(
  userId: string,
  correct: boolean
): TeamMemberStats | null {
  const member = store.members.get(userId);
  if (!member) return null;
  
  const stats = member.stats;
  stats.totalPredictions++;
  
  if (correct) {
    stats.correctPredictions++;
    stats.currentStreak++;
    stats.points += calculatePoints(stats.currentStreak);
    
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
    
    // Award badges
    if (stats.currentStreak === 5 && !stats.badges.includes('hot_streak_5')) {
      stats.badges.push('hot_streak_5');
    }
    if (stats.currentStreak === 10 && !stats.badges.includes('hot_streak_10')) {
      stats.badges.push('hot_streak_10');
    }
    if (stats.correctPredictions === 100 && !stats.badges.includes('century')) {
      stats.badges.push('century');
    }
  } else {
    stats.currentStreak = 0;
  }
  
  stats.winRate = Math.round((stats.correctPredictions / stats.totalPredictions) * 100);
  
  // Update rank
  updateAllRanks();
  
  return stats;
}

function calculatePoints(streak: number): number {
  // Base points + streak bonus
  const basePoints = 10;
  const streakBonus = Math.min(streak * 2, 20); // Max 20 bonus points
  return basePoints + streakBonus;
}

function updateAllRanks(): void {
  const members = Array.from(store.members.values())
    .sort((a, b) => b.stats.points - a.stats.points);
  
  members.forEach((member, index) => {
    member.stats.rank = index + 1;
  });
}

// ============================================================
// PREDICTION CREATION & VOTING
// ============================================================

export interface CreatePredictionOptions {
  symbol: string;
  timeframe: TimeFrame;
  expiryMinutes: number;
  votingDurationMinutes?: number;
}

export function createPrediction(options: CreatePredictionOptions): TeamPrediction {
  const now = Date.now();
  const votingDuration = (options.votingDurationMinutes || 2) * 60 * 1000;
  
  const prediction: TeamPrediction = {
    id: randomUUID(),
    symbol: options.symbol,
    direction: 'CALL', // Initial, will be determined by consensus
    timeframe: options.timeframe,
    expiryMinutes: options.expiryMinutes,
    
    votes: [],
    consensusDirection: null,
    consensusConfidence: 0,
    
    status: 'voting',
    createdAt: now,
    votingEndsAt: now + votingDuration,
    expiresAt: now + votingDuration + (options.expiryMinutes * 60 * 1000),
  };
  
  store.predictions.set(prediction.id, prediction);
  return prediction;
}

export function castVote(
  predictionId: string,
  userId: string,
  direction: TradeDirection,
  confidence: number,
  reasoning?: string
): TeamPrediction | null {
  const prediction = store.predictions.get(predictionId);
  if (!prediction || prediction.status !== 'voting') return null;
  
  // Check if already voted
  const existingVote = prediction.votes.find(v => v.odelsUserId === userId);
  if (existingVote) {
    // Update existing vote
    existingVote.direction = direction;
    existingVote.confidence = confidence;
    existingVote.reasoning = reasoning;
    existingVote.votedAt = Date.now();
  } else {
    // Add new vote
    prediction.votes.push({
      odelsUserId: userId,
      direction,
      confidence,
      reasoning,
      votedAt: Date.now(),
    });
  }
  
  // Recalculate consensus
  calculateConsensus(prediction);
  
  return prediction;
}

function calculateConsensus(prediction: TeamPrediction): void {
  if (prediction.votes.length === 0) {
    prediction.consensusDirection = null;
    prediction.consensusConfidence = 0;
    return;
  }
  
  // Weight votes by confidence
  let callWeight = 0;
  let putWeight = 0;
  let callCount = 0;
  let putCount = 0;
  
  for (const vote of prediction.votes) {
    const weight = vote.confidence; // 1-5 stars
    
    if (vote.direction === 'CALL') {
      callWeight += weight;
      callCount++;
    } else {
      putWeight += weight;
      putCount++;
    }
  }
  
  const totalWeight = callWeight + putWeight;
  const totalVotes = prediction.votes.length;
  
  if (callWeight > putWeight) {
    prediction.consensusDirection = 'CALL';
    prediction.consensusConfidence = Math.round((callWeight / totalWeight) * 100);
  } else if (putWeight > callWeight) {
    prediction.consensusDirection = 'PUT';
    prediction.consensusConfidence = Math.round((putWeight / totalWeight) * 100);
  } else {
    // Tie - no clear consensus
    prediction.consensusDirection = null;
    prediction.consensusConfidence = 50;
  }
}

// ============================================================
// PREDICTION LIFECYCLE
// ============================================================

export function endVoting(predictionId: string): TeamPrediction | null {
  const prediction = store.predictions.get(predictionId);
  if (!prediction || prediction.status !== 'voting') return null;
  
  prediction.status = 'active';
  calculateConsensus(prediction);
  
  return prediction;
}

export function resolvePrediction(
  predictionId: string,
  entryPrice: number,
  exitPrice: number
): TeamPrediction | null {
  const prediction = store.predictions.get(predictionId);
  if (!prediction || prediction.status !== 'active') return null;
  
  prediction.entryPrice = entryPrice;
  prediction.exitPrice = exitPrice;
  
  // Determine result based on consensus direction
  if (prediction.consensusDirection === 'CALL') {
    prediction.result = exitPrice > entryPrice ? 'win' : 
                        exitPrice < entryPrice ? 'loss' : 'draw';
  } else if (prediction.consensusDirection === 'PUT') {
    prediction.result = exitPrice < entryPrice ? 'win' : 
                        exitPrice > entryPrice ? 'loss' : 'draw';
  } else {
    prediction.result = 'draw'; // No consensus
  }
  
  prediction.status = 'resolved';
  
  // Update member stats
  for (const vote of prediction.votes) {
    if (prediction.result === 'win' && vote.direction === prediction.consensusDirection) {
      updateMemberStats(vote.odelsUserId, true);
    } else if (prediction.result === 'loss' && vote.direction === prediction.consensusDirection) {
      updateMemberStats(vote.odelsUserId, false);
    } else if (vote.direction !== prediction.consensusDirection) {
      // Voted against consensus - inverse result
      updateMemberStats(vote.odelsUserId, prediction.result === 'loss');
    }
  }
  
  // Move to history
  store.history.push(prediction);
  store.predictions.delete(predictionId);
  
  return prediction;
}

// ============================================================
// LEADERBOARD
// ============================================================

export function getLeaderboard(
  period: 'daily' | 'weekly' | 'monthly' | 'allTime'
): TeamLeaderboard {
  const now = Date.now();
  let cutoffTime = 0;
  
  switch (period) {
    case 'daily':
      cutoffTime = now - 24 * 60 * 60 * 1000;
      break;
    case 'weekly':
      cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case 'monthly':
      cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'allTime':
      cutoffTime = 0;
      break;
  }
  
  // For now, use all-time stats (in production, would track per-period)
  const entries: LeaderboardEntry[] = Array.from(store.members.values())
    .map(member => ({
      rank: member.stats.rank,
      userId: member.id,
      userName: member.name,
      avatar: member.avatar,
      winRate: member.stats.winRate,
      totalPredictions: member.stats.totalPredictions,
      points: member.stats.points,
      streak: member.stats.currentStreak,
      change: 0, // Would track position changes
    }))
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  
  return {
    period,
    entries,
    lastUpdated: now,
  };
}

// ============================================================
// QUERIES
// ============================================================

export function getActivePredictions(): TeamPrediction[] {
  return Array.from(store.predictions.values())
    .filter(p => p.status === 'voting' || p.status === 'active');
}

export function getVotingPredictions(): TeamPrediction[] {
  return Array.from(store.predictions.values())
    .filter(p => p.status === 'voting');
}

export function getPredictionHistory(limit: number = 50): TeamPrediction[] {
  return store.history.slice(-limit).reverse();
}

export function getPrediction(id: string): TeamPrediction | null {
  return store.predictions.get(id) || 
         store.history.find(p => p.id === id) || 
         null;
}

export function getMemberHistory(
  userId: string,
  limit: number = 20
): TeamPrediction[] {
  return store.history
    .filter(p => p.votes.some(v => v.odelsUserId === userId))
    .slice(-limit)
    .reverse();
}

// ============================================================
// STATISTICS
// ============================================================

export interface TeamStats {
  totalMembers: number;
  totalPredictions: number;
  overallWinRate: number;
  avgConsensusConfidence: number;
  activePredictions: number;
  todaysPredictions: number;
  todaysWinRate: number;
}

export function getTeamStats(): TeamStats {
  const now = Date.now();
  const todayStart = new Date().setUTCHours(0, 0, 0, 0);
  
  const resolvedPredictions = store.history;
  const todaysPredictions = resolvedPredictions.filter(p => p.createdAt >= todayStart);
  
  const wins = resolvedPredictions.filter(p => p.result === 'win').length;
  const todaysWins = todaysPredictions.filter(p => p.result === 'win').length;
  
  const avgConfidence = resolvedPredictions.length > 0
    ? resolvedPredictions.reduce((sum, p) => sum + p.consensusConfidence, 0) / resolvedPredictions.length
    : 0;
  
  return {
    totalMembers: store.members.size,
    totalPredictions: resolvedPredictions.length,
    overallWinRate: resolvedPredictions.length > 0 
      ? Math.round((wins / resolvedPredictions.length) * 100)
      : 0,
    avgConsensusConfidence: Math.round(avgConfidence),
    activePredictions: store.predictions.size,
    todaysPredictions: todaysPredictions.length,
    todaysWinRate: todaysPredictions.length > 0
      ? Math.round((todaysWins / todaysPredictions.length) * 100)
      : 0,
  };
}

// ============================================================
// BADGES
// ============================================================

export const BADGES = {
  hot_streak_5: {
    id: 'hot_streak_5',
    name: 'Hot Streak',
    description: '5 correct predictions in a row',
    icon: '🔥',
  },
  hot_streak_10: {
    id: 'hot_streak_10',
    name: 'On Fire',
    description: '10 correct predictions in a row',
    icon: '🌟',
  },
  century: {
    id: 'century',
    name: 'Century Club',
    description: '100 correct predictions',
    icon: '💯',
  },
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'First to vote on 10 predictions',
    icon: '🐦',
  },
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    description: 'Won 5 times voting against consensus',
    icon: '🎯',
  },
  analyst: {
    id: 'analyst',
    name: 'Analyst',
    description: '80%+ win rate over 50 predictions',
    icon: '📊',
  },
};

// ============================================================
// FORMAT HELPERS
// ============================================================

export function formatPredictionSummary(prediction: TeamPrediction): string {
  const voteEmoji = prediction.consensusDirection === 'CALL' ? '📈' : 
                    prediction.consensusDirection === 'PUT' ? '📉' : '❓';
  
  const lines = [
    `${voteEmoji} ${prediction.symbol} Prediction`,
    `Status: ${prediction.status.toUpperCase()}`,
    `Timeframe: ${prediction.timeframe} | Expiry: ${prediction.expiryMinutes}m`,
    `Votes: ${prediction.votes.length}`,
    `Consensus: ${prediction.consensusDirection || 'NONE'} (${prediction.consensusConfidence}%)`,
  ];
  
  if (prediction.result) {
    const resultEmoji = prediction.result === 'win' ? '✅' : 
                        prediction.result === 'loss' ? '❌' : '➖';
    lines.push(`Result: ${resultEmoji} ${prediction.result.toUpperCase()}`);
  }
  
  return lines.join('\n');
}

export function formatLeaderboardEntry(entry: LeaderboardEntry): string {
  const medal = entry.rank === 1 ? '🥇' : 
                entry.rank === 2 ? '🥈' : 
                entry.rank === 3 ? '🥉' : `#${entry.rank}`;
  
  return `${medal} ${entry.userName} - ${entry.points} pts (${entry.winRate}% win rate, ${entry.streak} streak)`;
}
