"use client";

import React, { useMemo, useRef, useState } from "react";

export type RovingTabIndexOptions = {
  count: number;
  initialIndex?: number;
  loop?: boolean;
};

export function useRovingTabIndex(options: RovingTabIndexOptions) {
  const { count, initialIndex = 0, loop = true } = options;
  const [activeIndex, setActiveIndex] = useState(() => clamp(initialIndex, count));
  const refs = useRef<Array<HTMLElement | null>>([]);

  const getTabIndex = useMemo(() => {
    return (idx: number) => (idx === activeIndex ? 0 : -1);
  }, [activeIndex]);

  function setRef(idx: number) {
    return (el: HTMLElement | null) => {
      refs.current[idx] = el;
    };
  }

  function focusIndex(idx: number) {
    if (count <= 0) return;
    const next = loop ? wrap(idx, count) : clamp(idx, count);
    setActiveIndex(next);
    queueMicrotask(() => refs.current[next]?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent, currentIndex: number, keys?: { prev?: string; next?: string }): number | null {
    if (count <= 0) return null;
    const prevKey = keys?.prev ?? "ArrowLeft";
    const nextKey = keys?.next ?? "ArrowRight";
    if (e.key !== prevKey && e.key !== nextKey && e.key !== "Home" && e.key !== "End") return null;
    e.preventDefault();

    if (e.key === "Home") {
      focusIndex(0);
      return 0;
    }
    if (e.key === "End") {
      const next = count - 1;
      focusIndex(next);
      return next;
    }
    if (e.key === prevKey) {
      const next = currentIndex - 1;
      focusIndex(next);
      return loop ? wrap(next, count) : clamp(next, count);
    }
    if (e.key === nextKey) {
      const next = currentIndex + 1;
      focusIndex(next);
      return loop ? wrap(next, count) : clamp(next, count);
    }
    return null;
  }

  return {
    activeIndex,
    setActiveIndex: (idx: number) => focusIndex(idx),
    getTabIndex,
    setRef,
    focusIndex,
    onKeyDown,
  };
}

function clamp(idx: number, count: number) {
  if (count <= 0) return 0;
  if (!Number.isFinite(idx)) return 0;
  return Math.max(0, Math.min(count - 1, idx));
}

function wrap(idx: number, count: number) {
  if (count <= 0) return 0;
  const mod = idx % count;
  return mod < 0 ? mod + count : mod;
}
