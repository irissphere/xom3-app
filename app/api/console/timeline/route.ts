import { NextResponse } from 'next/server';
import { getTimeline, logEvent } from '@/lib/uoi/store';

type TimelineEventType =
  | 'seal'
  | 'activation'
  | 'ritual'
  | 'decision'
  | 'insight'
  | 'error'
  | 'broadcast';

export async function GET() {
  const timeline = getTimeline();
  return NextResponse.json(timeline);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const type = (body?.type ?? 'insight') as TimelineEventType;
  const source = (body?.source ?? 'system') as 'operator' | 'system' | 'agent';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';

  if (!description) {
    return NextResponse.json(
      { error: 'Missing required field: description' },
      { status: 400 }
    );
  }

  const event = logEvent({
    type,
    source,
    description,
    agentId: typeof body?.agentId === 'string' ? body.agentId : undefined,
    metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
    artifacts: Array.isArray(body?.artifacts) ? body.artifacts : undefined,
    context: typeof body?.context === 'string' ? body.context : undefined,
  });

  return NextResponse.json(event, { status: 201 });
}
