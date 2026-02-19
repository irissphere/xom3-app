/**
 * HI5 Agent Handlers
 * HTTP API handlers for HI5 agent operations
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Hi5CostOptimizationAgent,
  Hi5UsageAnalyticsAgent,
  Hi5IntelligentCachingAgent,
  Hi5PerformanceMonitorAgent
} from './index';

// Cost Optimization Agent Handler
export async function handleCostOptimization(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = new Hi5CostOptimizationAgent();

    const result = await agent.execute(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Usage Analytics Agent Handler
export async function handleUsageAnalytics(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = new Hi5UsageAnalyticsAgent();

    const result = await agent.execute(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Caching Agent Handler
export async function handleCaching(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = new Hi5IntelligentCachingAgent();

    const result = await agent.execute(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Performance Monitor Agent Handler
export async function handlePerformanceMonitor(request: NextRequest) {
  try {
    const body = await request.json();
    const agent = new Hi5PerformanceMonitorAgent();

    const result = await agent.execute(body);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


