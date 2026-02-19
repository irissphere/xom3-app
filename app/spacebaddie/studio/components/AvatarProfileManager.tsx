'use client';

import React, { useState, useEffect } from 'react';

export interface AvatarProfile {
  id: string;
  name: string;
  avatar_image_urls: string[];
  voice_id?: string | null;
  personality_prompt?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function AvatarProfileManager() {
  const [profiles, setProfiles] = useState<AvatarProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', imageUrls: '', voice_id: '', personality_prompt: '', is_active: false });
  const [saving, setSaving] = useState(false);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/spacebaddie/profiles');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const urls = form.imageUrls.split(/\n/).map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/spacebaddie/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          avatar_image_urls: urls,
          voice_id: form.voice_id.trim() || null,
          personality_prompt: form.personality_prompt.trim() || null,
          is_active: form.is_active,
        }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfiles(prev => [data.profile, ...prev]);
        setForm({ name: '', imageUrls: '', voice_id: '', personality_prompt: '', is_active: false });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string) => {
    try {
      await fetch('/api/spacebaddie/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: true }),
      });
      setProfiles(prev => prev.map(p => ({ ...p, is_active: p.id === id })));
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">Avatar Profiles</h4>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
        >
          {showForm ? 'Cancel' : 'New profile'}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-2 text-sm">
          <input
            type="text"
            placeholder="Profile name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500"
            required
          />
          <textarea
            placeholder="Image URLs (one per line)"
            value={form.imageUrls}
            onChange={e => setForm(f => ({ ...f, imageUrls: e.target.value }))}
            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500 resize-none"
            rows={2}
          />
          <input
            type="text"
            placeholder="HeyGen voice ID (optional)"
            value={form.voice_id}
            onChange={e => setForm(f => ({ ...f, voice_id: e.target.value }))}
            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Personality / script context (optional)"
            value={form.personality_prompt}
            onChange={e => setForm(f => ({ ...f, personality_prompt: e.target.value }))}
            className="w-full px-2 py-1 rounded bg-gray-900 border border-gray-600 text-white placeholder-gray-500"
          />
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="rounded"
            />
            Use for daily automation
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-3 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      )}
      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : profiles.length === 0 ? (
        <p className="text-xs text-gray-500">No profiles. Create one for daily automation.</p>
      ) : (
        <ul className="space-y-1">
          {profiles.map(p => (
            <li key={p.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-200 truncate">{p.name}</span>
              <span className="flex items-center gap-1">
                {p.is_active && <span className="text-green-400">Active</span>}
                {!p.is_active && (
                  <button
                    type="button"
                    onClick={() => setActive(p.id)}
                    className="text-purple-400 hover:underline"
                  >
                    Set active
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
