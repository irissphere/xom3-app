/**
 * HI5 Usage Analytics Agent API Route
 * POST /api/hi5/agents/usage-analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleUsageAnalytics } from '@/modules/hi5/agents/handlers';

export async function POST(request: NextRequest) {
  return handleUsageAnalytics(request);
}


