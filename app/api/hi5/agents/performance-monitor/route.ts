/**
 * HI5 Performance Monitor Agent API Route
 * POST /api/hi5/agents/performance-monitor
 */

import { NextRequest, NextResponse } from 'next/server';
import { handlePerformanceMonitor } from '@/modules/hi5/agents/handlers';

export async function POST(request: NextRequest) {
  return handlePerformanceMonitor(request);
}


