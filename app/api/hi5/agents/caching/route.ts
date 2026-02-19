/**
 * HI5 Caching Agent API Route
 * POST /api/hi5/agents/caching
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleCaching } from '@/modules/hi5/agents/handlers';

export async function POST(request: NextRequest) {
  return handleCaching(request);
}


