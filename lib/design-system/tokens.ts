/**
 * XOM3 Design System Tokens
 * Source of truth for colors, spacing, typography, etc.
 * AKV: Maximum clarity, zero drift
 */

export const colors = {
  // Primary palette
  primary: 'rgb(6, 182, 212)',          // cyan
  secondary: 'rgb(168, 85, 247)',       // violet
  accent: 'rgb(16, 185, 129)',          // emerald
  
  // Status colors
  success: 'rgb(34, 197, 94)',
  warning: 'rgb(245, 158, 11)',
  danger: 'rgb(239, 68, 68)',
  info: 'rgb(59, 130, 246)',
  
  // Backgrounds
  bg0: 'rgb(5, 8, 16)',                 // deepest bg
  bg1: 'rgb(15, 23, 42)',               // page bg
  surface0: 'rgba(10, 14, 26, 0.88)',   // panel bg dark
  surface1: 'rgba(12, 18, 34, 0.72)',   // panel bg light
  surface2: 'rgba(30, 41, 59, 0.6)',    // card bg
  surface3: 'rgba(255, 255, 255, 0.04)',// subtle surface
  
  // Text
  text0: 'rgb(241, 245, 249)',          // primary text
  text1: 'rgb(203, 213, 225)',          // secondary text
  text2: 'rgb(148, 163, 184)',          // muted text
  text3: 'rgba(148, 163, 184, 0.58)',   // subtle text
  
  // Borders
  border0: 'rgba(255, 255, 255, 0.10)',
  border1: 'rgba(255, 255, 255, 0.16)',
  border2: 'rgba(255, 255, 255, 0.06)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const radius = {
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  fontSize: {
    xs: 11,
    sm: 12,
    base: 13,
    md: 14,
    lg: 15,
    xl: 17,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

export const effects = {
  shadow: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 10px 30px rgba(0, 0, 0, 0.35)',
    lg: '0 18px 60px rgba(0, 0, 0, 0.55)',
  },
  glow: {
    primary: '0 0 20px rgba(6, 182, 212, 0.4)',
    secondary: '0 0 20px rgba(168, 85, 247, 0.4)',
    accent: '0 0 20px rgba(16, 185, 129, 0.4)',
    success: '0 0 20px rgba(34, 197, 94, 0.4)',
    warning: '0 0 20px rgba(245, 158, 11, 0.4)',
    danger: '0 0 20px rgba(239, 68, 68, 0.4)',
  },
  ease: {
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    orbital: 'cubic-bezier(0.37, 0, 0.63, 1)',
  },
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  toast: 500,
} as const;































