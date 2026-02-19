# 🜂 XOM3 Geometry Guidelines

**Sacred geometry layer for the XOM3 cockpit design system.**

This document defines how to use geometry tokens across the cockpit: dashboard, workflow engine, client portal, status surface, and all other surfaces.

---

## Overview

Geometry in XOM3 is **ambient intelligence** — it whispers, never shouts. It creates a mythic, ceremonial presence that signals sophistication without visual clutter.

The geometry layer sits **behind** content, creating depth and context without competing for attention.

---

## Token Structure

All geometry tokens are defined in `tokens.json` and consumed through `theme.ts`.

### Access Pattern

```typescript
import { theme } from '@/lib/design-system/theme';

// Use geometry tokens
const opacity = theme.geometry.opacity.low;
const blur = theme.geometry.blur.soft;
const spiralBg = theme.geometry.background.spiral;
```

---

## Opacity Tokens

Geometry must be **barely visible** — ambient, not prominent.

| Token | Value | Use Case |
|-------|-------|----------|
| `low` | `0.03` | Default ambient presence |
| `medium` | `0.05` | Subtle emphasis areas |
| `high` | `0.07` | Ceremonial focus (rare) |

**Rule:** Start with `low`. Only escalate to `medium` or `high` when you need to signal importance.

---

## Blur Tokens

Softens geometry so it feels like **ambient intelligence**, not UI clutter.

| Token | Value | Use Case |
|-------|-------|----------|
| `soft` | `2px` | Default background geometry |
| `medium` | `4px` | Medium-depth layers |
| `deep` | `6px` | Deep background layers |

**Rule:** Apply blur to geometry backgrounds to create depth without distraction.

---

## Stroke Tokens

Thin, elegant, precise — the AKV signature.

| Token | Value | Use Case |
|-------|-------|----------|
| `thin` | `1px` | Default geometry strokes |
| `regular` | `1.5px` | Emphasized geometry lines |

**Rule:** Use `thin` by default. Use `regular` only for ceremonial emphasis.

---

## Color Tokens

Uses the luxury-tech palette:

### Light Mode
- `primary`: Ivory Mist (`rgba(255, 255, 245, 0.05)`)
- `accentAmber`: Amber Pulse (`rgba(255, 191, 0, 0.02)`)
- `accentCyan`: Royal Cyan (`rgba(0, 255, 255, 0.02)`)

### Dark Mode
- `primary`: Graphite Slate (`rgba(200, 200, 200, 0.04)`)
- `accentAmber`: Amber Pulse (`rgba(255, 191, 0, 0.02)`)
- `accentCyan`: Royal Cyan (`rgba(0, 255, 255, 0.02)`)

**Rule:** Use `primary` for default geometry. Use accent colors sparingly for ceremonial moments.

---

## Asset Tokens

Four sacred geometry archetypes:

| Token | Asset | Meaning | Use Case |
|-------|-------|---------|----------|
| `goldenSpiral` | `/geometry/golden-spiral.svg` | Initiation | Onboarding flows, first-time experiences |
| `fibonacciCircles` | `/geometry/fibonacci-circles.svg` | Expansion | Growth surfaces, scaling workflows |
| `metatronGrid` | `/geometry/metatron-grid.svg` | Structure | System views, architecture surfaces |
| `orbitalRings` | `/geometry/orbital-rings.svg` | Automation | Workflow engines, automation surfaces |

**Rule:** Match geometry archetype to surface purpose. Don't mix archetypes on the same surface.

---

## Placement Tokens

Defines where geometry sits in the cockpit.

| Token | Value | Use Case |
|-------|-------|----------|
| `offsetTopRight` | `top right` | Dashboard headers, status surfaces |
| `offsetBottomLeft` | `bottom left` | Footer areas, completion surfaces |
| `behindSidebar` | `left center` | Navigation areas, sidebar backgrounds |
| `behindHeader` | `top center` | Header backgrounds, top navigation |

**Rule:** Place geometry in corners or edges. Never center it — it should feel like ambient context, not focal point.

---

## Implementation Patterns

### Pattern 1: Background Geometry Layer

```tsx
import { theme } from '@/lib/design-system/theme';

<div
  style={{
    backgroundImage: theme.geometry.background.spiral,
    backgroundPosition: theme.geometry.placement.offsetTopRight,
    backgroundRepeat: 'no-repeat',
    backgroundSize: '400px 400px',
    opacity: theme.geometry.opacity.low,
    filter: `blur(${theme.geometry.blur.soft})`,
  }}
/>
```

### Pattern 2: CSS Variables (Recommended)

Add to your component's CSS:

```css
.geometry-layer {
  background-image: url('/geometry/golden-spiral.svg');
  background-position: top right;
  background-repeat: no-repeat;
  background-size: 400px 400px;
  opacity: 0.03;
  filter: blur(2px);
  pointer-events: none;
  position: absolute;
  z-index: 0;
}
```

### Pattern 3: Tailwind Classes (If Using Tailwind)

```tsx
<div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.03] blur-[2px] pointer-events-none z-0 bg-[url('/geometry/golden-spiral.svg')] bg-no-repeat bg-top-right" />
```

---

## Surface-Specific Guidelines

### Dashboard
- **Archetype:** `metatronGrid` or `orbitalRings`
- **Placement:** `behindHeader` or `offsetTopRight`
- **Opacity:** `low`
- **Blur:** `soft`

### Workflow Engine
- **Archetype:** `orbitalRings`
- **Placement:** `behindSidebar`
- **Opacity:** `low`
- **Blur:** `medium`

### Client Portal
- **Archetype:** `goldenSpiral` (onboarding) or `fibonacciCircles` (growth)
- **Placement:** `offsetBottomLeft`
- **Opacity:** `low`
- **Blur:** `soft`

### Status Surface
- **Archetype:** `metatronGrid`
- **Placement:** `behindHeader`
- **Opacity:** `medium` (ceremonial emphasis)
- **Blur:** `soft`

---

## Do's and Don'ts

### ✅ Do
- Use geometry as ambient background layers
- Keep opacity low (`0.03` default)
- Apply blur to soften edges
- Match archetype to surface purpose
- Place geometry in corners/edges
- Use `pointer-events: none` to prevent interaction

### ❌ Don't
- Use geometry as focal points
- Mix multiple archetypes on one surface
- Center geometry (feels like decoration)
- Use opacity above `0.07`
- Skip blur (geometry will feel harsh)
- Make geometry interactive

---

## Responsive Considerations

### Mobile
- Reduce geometry size by 50%
- Use `soft` blur only
- Consider hiding geometry on very small screens (< 640px)

### Tablet
- Reduce geometry size by 25%
- Use `soft` or `medium` blur

### Desktop
- Full-size geometry
- All blur levels available

---

## Accessibility

- Geometry is decorative only — it should not convey information
- Use `pointer-events: none` to ensure geometry doesn't interfere with interactions
- Ensure sufficient contrast between geometry and foreground content
- Respect `prefers-reduced-motion` — consider hiding geometry if user prefers reduced motion

---

## Maintenance

- **Source of Truth:** `tokens.json`
- **Consumption:** `theme.ts`
- **Guidelines:** This file (`GEOMETRY_GUIDELINES.md`)

When updating geometry:
1. Update `tokens.json`
2. Changes flow automatically through `theme.ts`
3. Update this guidelines file if patterns change

---

## Sacred Geometry Archetypes Explained

### Golden Spiral → Initiation
The golden spiral represents **growth from a single point** — perfect for onboarding, first-time experiences, and initiation flows.

### Fibonacci Circles → Expansion
Fibonacci circles represent **scaling and expansion** — ideal for growth surfaces, scaling workflows, and expansion moments.

### Metatron Grid → Structure
The Metatron grid represents **sacred structure and order** — perfect for system views, architecture surfaces, and structural clarity.

### Orbital Rings → Automation
Orbital rings represent **cycles and automation** — ideal for workflow engines, automation surfaces, and process visualization.

---

## Summary

Geometry in XOM3 is:
- **Ambient** — barely visible, never prominent
- **Ceremonial** — signals sophistication and depth
- **Purposeful** — archetype matches surface purpose
- **Consistent** — tokens ensure uniformity across cockpit
- **Scalable** — centralized tokens make updates easy

Keep it **whisper-quiet** and **mythic**. That's the AKV signature.
