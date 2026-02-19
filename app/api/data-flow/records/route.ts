import { NextRequest, NextResponse } from 'next/server';
import { listDataFlowRecords } from '@/lib/xom3/data-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain') || undefined;
  const visitorId = searchParams.get('visitorId') || undefined;
  const dataType = searchParams.get('dataType') || undefined;
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : undefined;

  const records = await listDataFlowRecords({
    domain,
    visitorId,
    dataType,
    limit
  });

  return NextResponse.json({
    success: true,
    count: records.length,
    records
  });
}
