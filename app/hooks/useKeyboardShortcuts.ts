"use client";

import { useEffect } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Common shortcuts for cockpit
export const COCKPIT_SHORTCUTS = {
  SYNC: { key: "s", ctrl: true, description: "Trigger sync" },
  SEARCH: { key: "k", ctrl: true, description: "Open search" },
  GLOBAL_FILTER: { key: "f", ctrl: true, description: "Toggle global filter" },
  ACTIVITY_PANE: { key: "a", ctrl: true, description: "Toggle activity pane" },
  PIPELINE_VIEW: { key: "p", ctrl: true, description: "Go to pipeline view" },
  COMPLIANCE_VIEW: { key: "c", ctrl: true, description: "Go to compliance view" },
  BILLING_VIEW: { key: "b", ctrl: true, description: "Go to billing view" },
  HSE_VIEW: { key: "h", ctrl: true, description: "Go to HSE view" },
  UOI_VIEW: { key: "u", ctrl: true, description: "Go to UOI view" }
};
