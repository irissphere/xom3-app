import { NextRequest, NextResponse } from 'next/server';
import { processDataFlow, RawDataInput } from '../../../lib/xom3/data-flow-processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      domain,
      visitorId,
      dataType,
      payload,
      source = 'website'
    } = body;

    // Validate required fields
    if (!domain || !visitorId || !dataType || !payload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: domain, visitorId, dataType, payload'
        },
        { status: 400 }
      );
    }

    // Validate domain - accept both legacy domain names and 'xom3' for main cockpit
    const validDomains = ['benefitscrm', 'healthcrm', 'broadcast', 'commerce', 'xom3'];
    if (!validDomains.includes(domain)) {
      return NextResponse.json(
        { success: false, error: `Invalid domain: ${domain}. Valid domains: ${validDomains.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate data type
    const validDataTypes = ['intent', 'behavior', 'conversion', 'enrichment'];
    if (!validDataTypes.includes(dataType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data type' },
        { status: 400 }
      );
    }

    // Create raw data input
    const rawInput: RawDataInput = {
      source,
      domain,
      visitorId,
      dataType,
      payload,
      timestamp: new Date()
    };

    // Process through data flow pipeline
    const result = await processDataFlow(rawInput);

    if (!result) {
      // Data was rejected (likely due to consent issues)
      return NextResponse.json({
        success: false,
        error: 'Data rejected - consent validation failed',
        code: 'CONSENT_DENIED'
      });
    }

    return NextResponse.json({
      success: true,
      dataId: result.id,
      lane: result.lane,
      processed: true,
      anonymized: result.anonymized
    });
  } catch (error) {
    console.error('Data capture error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to capture data' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    status: 'operational',
    message: 'XOM3 data capture endpoint active'
  });
}
