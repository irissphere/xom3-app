/**
 * SpaceBaddie Avatar Profiles API
 * GET /api/spacebaddie/profiles - list profiles (optional ?active=true for daily automation)
 * POST /api/spacebaddie/profiles - create profile
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
  if (!supabase) return NextResponse.json({ profiles: [] });
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') === 'true';
  let q = supabase
    .from('spacebaddie_avatar_profiles')
    .select('id, user_id, name, avatar_image_urls, voice_id, personality_prompt, is_active, created_at, updated_at')
    .eq('tenant_id', 'spacebaddie')
    .order('updated_at', { ascending: false });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data || [] });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const body = await req.json();
  const { name, avatar_image_urls, voice_id, personality_prompt, is_active, user_id } = body;
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const urls = Array.isArray(avatar_image_urls) ? avatar_image_urls : [];
  if (is_active) {
    await supabase.from('spacebaddie_avatar_profiles').update({ is_active: false }).eq('tenant_id', 'spacebaddie');
  }
  const { data, error } = await supabase
    .from('spacebaddie_avatar_profiles')
    .insert({
      user_id: user_id || null,
      tenant_id: 'spacebaddie',
      name,
      avatar_image_urls: urls,
      voice_id: voice_id || null,
      personality_prompt: personality_prompt || null,
      is_active: Boolean(is_active),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profile: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  const body = await req.json();
  const { id, name, avatar_image_urls, voice_id, personality_prompt, is_active } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof name === 'string') updates.name = name;
  if (Array.isArray(avatar_image_urls)) updates.avatar_image_urls = avatar_image_urls;
  if (voice_id !== undefined) updates.voice_id = voice_id || null;
  if (personality_prompt !== undefined) updates.personality_prompt = personality_prompt || null;
  if (typeof is_active === 'boolean') {
    updates.is_active = is_active;
    if (is_active) {
      await supabase.from('spacebaddie_avatar_profiles').update({ is_active: false }).eq('tenant_id', 'spacebaddie').neq('id', id);
    }
  }
  const { data, error } = await supabase.from('spacebaddie_avatar_profiles').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, profile: data });
}
