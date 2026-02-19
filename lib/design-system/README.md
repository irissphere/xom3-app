# XOM3 Design System

Centralized design tokens and theme configuration for the XOM3 cockpit.

## Structure

- **`tokens.json`** - Source of truth for all design tokens (geometry, colors, spacing, etc.)
- **`theme.ts`** - TypeScript theme configuration that references tokens
- **`GEOMETRY_GUIDELINES.md`** - Complete guide for using geometry tokens
- **`index.ts`** - Public API for importing design system

## Usage

### Import Theme

```typescript
import { theme } from '@/lib/design-system';

// Use geometry tokens
const opacity = theme.geometry.opacity.low;
const blur = theme.geometry.blur.soft;
const spiralBg = theme.geometry.background.spiral;
```

### Import Tokens Directly

```typescript
import { tokens } from '@/lib/design-system';

// Access raw token values
const spiralAsset = tokens.geometry.assets.goldenSpiral;
```

## Philosophy

- **Centralized** - Single source of truth in `tokens.json`
- **Scalable** - Easy to extend with new token categories
- **Type-Safe** - Full TypeScript support
- **Lineage-Safe** - Changes flow through `theme.ts` automatically

## Adding New Tokens

1. Add tokens to `tokens.json`
2. Update TypeScript interfaces in `theme.ts` if needed
3. Reference tokens through `theme.ts` (don't import `tokens.json` directly in components)

## Geometry Tokens

See `GEOMETRY_GUIDELINES.md` for complete geometry token usage guide.

---

**Maintained by:** XOM3 Design System  
**Last Updated:** 2024
