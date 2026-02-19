/**
 * XOM3 Design System Theme
 * 
 * Centralized theme configuration that references design tokens.
 * This is the single source of truth for how geometry and other design
 * tokens are consumed across the cockpit.
 */

import tokens from './tokens.json';

export interface GeometryTheme {
  background: {
    spiral: string;
    circles: string;
    grid: string;
    rings: string;
  };
  opacity: {
    low: string;
    medium: string;
    high: string;
  };
  blur: {
    soft: string;
    medium: string;
    deep: string;
  };
  stroke: {
    thin: string;
    regular: string;
  };
  color: {
    lightMode: {
      primary: string;
      accentAmber: string;
      accentCyan: string;
    };
    darkMode: {
      primary: string;
      accentAmber: string;
      accentCyan: string;
    };
  };
  placement: {
    offsetTopRight: string;
    offsetBottomLeft: string;
    behindSidebar: string;
    behindHeader: string;
  };
}

export interface XOM3Theme {
  geometry: GeometryTheme;
}

/**
 * Theme configuration that references tokens.json
 * 
 * This keeps everything centralized, scalable, and lineage-safe.
 * All geometry references flow through this single entry point.
 */
export const theme: XOM3Theme = {
  geometry: {
    background: {
      spiral: `url(${tokens.geometry.assets.goldenSpiral})`,
      circles: `url(${tokens.geometry.assets.fibonacciCircles})`,
      grid: `url(${tokens.geometry.assets.metatronGrid})`,
      rings: `url(${tokens.geometry.assets.orbitalRings})`
    },
    opacity: tokens.geometry.opacity,
    blur: tokens.geometry.blur,
    stroke: tokens.geometry.stroke,
    color: tokens.geometry.color,
    placement: tokens.geometry.placement
  }
};

export default theme;
