'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface CalendarPost {
  id: string;
  platform?: string;
  title?: string | null;
  caption?: string | null;
  status: string;
  scheduled_at: string | null;
  posted_at?: string | null;
  video_url?: string | null;
  created_at?: string | null;
}

interface ContentCalendarProps {
  onPostClick?: (post: CalendarPost) => void;
  onDateSelect?: (date: Date) => void;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string | null, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
}

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = new Date(first);
  start.setDate(start.getDate() - first.getDay());
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= last || d.getMonth() === month || days.length < 42) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
    if (days.length >= 42) break;
  }
  return days;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600',
  scheduled: 'bg-blue-600',
  posted: 'bg-green-600',
  failed: 'bg-red-600',
};

export function ContentCalendar({ onPostClick, onDateSelect }: ContentCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const fetchPosts = useCallback(async () => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const start = first.toISOString().slice(0, 10);
    const end = last.toISOString().slice(0, 10);
    try {
      const res = await fetch(`/api/spacebaddie/calendar/posts?start=${start}T00:00:00.000Z&end=${end}T23:59:59.999Z`, { credentials: 'include' });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  const days = getMonthDays(year, month);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Content Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="text-white font-medium min-w-[180px] text-center">{monthLabel}</span>
          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-sm">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-gray-400 font-medium">
            {day}
          </div>
        ))}
        {days.map(day => {
          const isCurrentMonth = day.getMonth() === month;
          const dayPosts = posts.filter(p => isSameDay(p.scheduled_at, day));
          const dateKey = formatDateKey(day);
          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect?.(day)}
              className={`min-h-[100px] rounded-lg p-2 border border-gray-700/50 cursor-pointer hover:border-gray-600 ${
                isCurrentMonth ? 'bg-gray-800/80' : 'bg-gray-900/50'
              } ${!isCurrentMonth ? 'opacity-60' : ''}`}
            >
              <span className={`text-sm ${isCurrentMonth ? 'text-gray-300' : 'text-gray-500'}`}>
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {loading ? (
                  <div className="h-6 animate-pulse bg-gray-700 rounded" />
                ) : (
                  dayPosts.slice(0, 3).map(post => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onPostClick?.(post);
                      }}
                      className={`w-full text-left truncate px-2 py-1 rounded text-xs text-white ${STATUS_COLORS[post.status] || 'bg-gray-600'}`}
                      title={`${post.title || post.caption || post.id} (${post.status})`}
                    >
                      {post.title || post.caption?.slice(0, 20) || post.platform || 'Post'}
                    </button>
                  ))
                )}
                {!loading && dayPosts.length > 3 && (
                  <span className="text-xs text-gray-500">+{dayPosts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
        <span><span className="inline-block w-3 h-3 rounded bg-gray-600 mr-1" /> Draft</span>
        <span><span className="inline-block w-3 h-3 rounded bg-blue-600 mr-1" /> Scheduled</span>
        <span><span className="inline-block w-3 h-3 rounded bg-green-600 mr-1" /> Posted</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-600 mr-1" /> Failed</span>
      </div>
    </div>
  );
}
