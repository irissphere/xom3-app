/**
 * HI5 Cost Optimization Agent API Route
 * POST /api/hi5/agents/cost-optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleCostOptimization } from '@/modules/hi5/agents/handlers';

export async function POST(request: NextRequest) {
  return handleCostOptimization(request);
}


