# ✅ X.O.M3 Visual Identity Map

*The physics and geometry of the interface.*

## Core Philosophy
**"The Machine in the Void"**
The interface is dark, deep, and precise. It feels like looking into the engine room of a starship. It is not "flat design" — it has depth, glow, and motion.

---

## 1. The Beam
The central visual anchor is the **Vertical Beam**.
- **Placement:** Right side of viewport on desktop. Hidden or horizontal on mobile.
- **Gradient:** Cyan-300 (top) → Sky-400 (mid) → Indigo-500 (bottom).
- **Behavior:**
  - Pulses slowly (4s cycle) to indicate "System Alive".
  - Flares brighter on user interaction (hover/click).
  - Acts as the scroll progress indicator.

## 2. Orbital Geometry
Elements do not just "sit" on the page; they orbit the user's focus.
- **The Rings:** Subtle, 1px borders with low opacity (10-15%).
- **Motion:**
  - Background rings rotate slowly (60s+ per revolution).
  - Hover states trigger a "lock-on" effect (scale up 1.02x, border brightens).
- **Z-Index:**
  - Layer 0: Deep Space (Slate-950)
  - Layer 1: The Grid (Slate-900/50)
  - Layer 2: Orbital Rings (Slate-800)
  - Layer 3: Content Cards (Glassmorphism, Blur-md)
  - Layer 4: Text & UI Controls

## 3. Typography & Spacing
- **Font Family:** Inter (or system-ui) for UI. Mono for data/code.
- **Headlines:** Tracking-tight (-0.02em). Leading-tight (1.1).
- **Body:** Relaxed leading (1.6) for readability.
- **Whitespace:** "Premium Spacing" — use double the standard margin. If it feels empty, leave it. Space is luxury.

## 4. Color Palette (Tailwind Mapped)

| Role | Color | Tailwind Class |
| :--- | :--- | :--- |
| **Void** | Deepest Slate | `bg-slate-950` |
| **Surface** | Glass Slate | `bg-slate-900/60` |
| **Border** | Subtle Edge | `border-slate-800` |
| **Primary** | Cyan Light | `text-cyan-400` |
| **Accent** | Indigo Glow | `shadow-indigo-500/20` |
| **Text** | Starlight | `text-slate-200` |
| **Muted** | Moon Dust | `text-slate-400` |

## 5. Interaction States
- **Hover:** Do not just change color. Lift. Glow.
- **Click:** Instant feedback. Ripple or sharp scale-down.
- **Loading:** Never a spinner. Use a "scanning" bar or pulsing skeleton.

## 6. Mobile Fallback
- The Beam vanishes.
- The Grid simplifies.
- Content stacks vertically with generous padding.
- The "Orbital" feel is preserved through border radius (xl) and glow effects.
