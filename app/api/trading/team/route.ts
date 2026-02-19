/**
 * Team Prediction Game API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPrediction,
  castVote,
  endVoting,
  resolvePrediction,
  getActivePredictions,
  getVotingPredictions,
  getPredictionHistory,
  getPrediction,
  getLeaderboard,
  getTeamStats,
  createTeamMember,
  getTeamMember,
  type CreatePredictionOptions,
  type TeamVoteRequest,
} from '@/lib/trading';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'active';
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'allTime' || 'weekly';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    switch (action) {
      case 'active':
        return NextResponse.json({
          predictions: getActivePredictions(),
        });
        
      case 'voting':
        return NextResponse.json({
          predictions: getVotingPredictions(),
        });
        
      case 'history':
        return NextResponse.json({
          predictions: getPredictionHistory(limit),
        });
        
      case 'leaderboard':
        return NextResponse.json({
          leaderboard: getLeaderboard(period),
        });
        
      case 'stats':
        return NextResponse.json({
          stats: getTeamStats(),
        });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Team game error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'create_prediction': {
        const options: CreatePredictionOptions = {
          symbol: body.symbol,
          timeframe: body.timeframe,
          expiryMinutes: body.expiryMinutes,
          votingDurationMinutes: body.votingDurationMinutes,
        };
        
        const prediction = createPrediction(options);
        return NextResponse.json({ prediction });
      }
      
      case 'vote': {
        const { predictionId, userId, direction, confidence, reasoning } = body;
        
        // Ensure user exists
        if (!getTeamMember(userId)) {
          createTeamMember(userId, body.userName || `User ${userId.slice(0, 6)}`);
        }
        
        const prediction = castVote(predictionId, userId, direction, confidence, reasoning);
        
        if (!prediction) {
          return NextResponse.json(
            { error: 'Prediction not found or voting has ended' },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ prediction });
      }
      
      case 'end_voting': {
        const { predictionId } = body;
        const prediction = endVoting(predictionId);
        
        if (!prediction) {
          return NextResponse.json(
            { error: 'Prediction not found or not in voting state' },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ prediction });
      }
      
      case 'resolve': {
        const { predictionId, entryPrice, exitPrice } = body;
        const prediction = resolvePrediction(predictionId, entryPrice, exitPrice);
        
        if (!prediction) {
          return NextResponse.json(
            { error: 'Prediction not found or not active' },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ prediction });
      }
      
      case 'join': {
        const { userId, userName, avatar } = body;
        
        const existing = getTeamMember(userId);
        if (existing) {
          return NextResponse.json({ member: existing });
        }
        
        const member = createTeamMember(userId, userName, avatar);
        return NextResponse.json({ member });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Team game error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
