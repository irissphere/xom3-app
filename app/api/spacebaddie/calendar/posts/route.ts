/**
 * SpaceBaddie Calendar Posts API
 * GET /api/spacebaddie/calendar/posts - list scheduled/draft posts for date range
 * PATCH - update post (e.g. scheduled_at for drag-drop)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ posts: [] });
  }
  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end query params required (ISO date)' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('broadcast_posts')
    .select('id, platform, title, caption, status, scheduled_at, posted_at, video_url, created_at')
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', start)
    .lte('scheduled_at', end)
    .order('scheduled_at', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const posts = (data || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    platform: p.platform,
    title: p.title,
    caption: p.caption,
    status: p.status,
    scheduled_at: p.scheduled_at,
    posted_at: p.posted_at,
    video_url: p.video_url,
    created_at: p.created_at,
  }));
  return NextResponse.json({ posts });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
  const body = await req.json();
  const { id, scheduled_at } = body;
  if (!id || !scheduled_at) {
    return NextResponse.json({ error: 'id and scheduled_at required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('broadcast_posts')
    .update({ scheduled_at: new Date(scheduled_at).toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, post: data });
}
