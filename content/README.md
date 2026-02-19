# XOM3 Content System

Developer-ready content files for all XOM3 pages and components.

## Structure

```
content/
├── types.ts          # TypeScript interfaces
├── index.ts          # Central exports
├── homepage.json     # Homepage content blocks
├── auth.json         # Auth pages (login, signup, demo, etc.)
├── lanes.json        # Lane landing pages
├── gui.json          # In-app GUI text
└── README.md         # This file
```

## Usage

### Import Content

```tsx
import { homepageContent, loginContent, getLane } from "@/content";

// Use in components
<h1>{homepageContent.hero.title}</h1>
<p>{loginContent.subtitle}</p>

// Get specific lane
const healthcareLane = getLane("healthcare");
```

### Type Safety

All content is fully typed:

```tsx
import type { HeroContent, LaneLanding, LaneId } from "@/content/types";

const renderHero = (content: HeroContent) => {
  // TypeScript knows content.title, content.subtitle, etc.
};
```

## Content Blocks

### Homepage (`homepage.json`)

| Section | Key | Description |
|---------|-----|-------------|
| Hero | `hero` | Main landing hero with title, subtitle, CTAs |
| Why XOM3 | `whyXom3` | Four feature blocks |
| Lane Overview | `laneOverview` | Six lane cards |
| Universal Appeal | `universalAppeal` | Industry appeal with bullets |
| Demo CTA | `demoCTA` | Final call-to-action |

### Auth Pages (`auth.json`)

| Page | Key | Description |
|------|-----|-------------|
| Login | `login` | Sign-in form |
| Sign Up | `signUp` | Account creation with lane selection |
| Demo | `demo` | 14-month free trial start |
| Intake | `intake` | Custom intake form |
| One-Time Code | `oneTimeCode` | OTP verification |
| Lane Routing | `laneRouting` | Post-routing confirmation |
| Trial Onboarding | `trialOnboarding` | Step-by-step onboarding |

### Lanes (`lanes.json`)

Six lane definitions with:
- `id`: Lane identifier (healthcare, benefits, broadcast, command, custom, ecommerce)
- `title`: Display name
- `subtitle`: Short description
- `features`: Array of feature strings
- `ctaPrimary`: Primary button text
- `ctaSecondary`: Secondary button text
- `accentColor`: Lane accent color
- `glowColor`: Lane glow effect color

### GUI Text (`gui.json`)

In-app interface text:
- `buttons.primary`: Primary action buttons
- `buttons.secondary`: Secondary actions
- `statuses`: Status labels
- `tooltips`: Tooltip text

## Adding New Content

1. Add type to `types.ts`
2. Create or update JSON file
3. Export from `index.ts`
4. Use in components

## File Routes

| Route | Page |
|-------|------|
| `/` | Marketing homepage |
| `/login` | Login page |
| `/signup` | Sign up page |
| `/demo` | Demo start page |
| `/intake` | Intake form |
| `/one-time-code` | OTP verification |
| `/lane-routing?lane=X` | Lane routing confirmation |
| `/onboarding` | Trial onboarding flow |
| `/lanes` | Lanes index |
| `/lanes/[laneId]` | Individual lane page |

---

*XOM3 Content System — Sovereign automation copy.*
