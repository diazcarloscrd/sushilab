---
name: Kuro & Aka Omakase
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#e5bdbe'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#ac8889'
  outline-variant: '#5c3f40'
  surface-tint: '#ffb3b6'
  primary: '#ffb3b6'
  on-primary: '#68001a'
  primary-container: '#e11d48'
  on-primary-container: '#fffaf9'
  inverse-primary: '#be0037'
  secondary: '#ffb2b7'
  on-secondary: '#67001b'
  secondary-container: '#b50036'
  on-secondary-container: '#ffc2c4'
  tertiary: '#c8c6c3'
  on-tertiary: '#30312e'
  tertiary-container: '#747471'
  on-tertiary-container: '#fdfbf7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b6'
  on-primary-fixed: '#40000c'
  on-primary-fixed-variant: '#920028'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b7'
  on-secondary-fixed: '#40000d'
  on-secondary-fixed-variant: '#92002a'
  tertiary-fixed: '#e4e2de'
  tertiary-fixed-dim: '#c8c6c3'
  on-tertiary-fixed: '#1b1c1a'
  on-tertiary-fixed-variant: '#474744'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  display-lg:
    fontFamily: Noto Serif
    fontSize: 56px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '400'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.06em
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: Manrope
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system translates the quiet precision of an artisanal omakase counter into a digital experience. Drawing inspiration from modern Japanese minimalism and high-end editorial dining publications, it balances profound dark voids with vibrant culinary accents. The aesthetic is tactile yet restrained, honoring the contrast between charred nori, polished binchotan charcoal, and the visceral strike of fresh maguro.

The target audience comprises discerning culinary enthusiasts, omakase patrons, and boutique delivery clients who value craftsmanship, ingredient provenance, and seamless ordering. Interactions evoke calm authority, luxury, and meticulous attention to detail.

## Colors

The palette establishes an intimate, low-lit counter dining environment:

- **Primary (`#E11D48`)**: A vivid crimson red reflecting akami tuna, lacquerware, and traditional Japanese seal stamps (*hanko*). Reserved for focal actions, selected states, and pivotal calls-to-action.
- **Secondary (`#F43F5E`)**: A luminous rose-crimson utilized for hover interactions, active badges, and subtle glows.
- **Tertiary (`#FFFDF9`)**: Warm ivory/silk cream, providing soft, high-legibility typographic contrast without the harsh glare of stark white.
- **Neutral Palette**: 
  - `Base Canvas`: Deep Sumi Charcoal (`#090D12`).
  - `Surface 1 (Card/Sheet)`: Polished Slate (`#111822`).
  - `Surface 2 (Elevated Tier)`: Smoked Charcoal (`#1A2230`).
  - `Border / Hairline`: Translucent Silver/Charcoal (`rgba(255, 253, 249, 0.08)`).
  - `Text Muted`: Steamed Ash (`#94A3B8`).

Avoid saturating surfaces with red; color must function like a focused brushstroke—sparing, intentional, and striking.

## Typography

The typography pairing contrasts deliberate traditional craftsmanship with pristine functional clarity.

- **Headlines (`Noto Serif`)**: Brings the dignity of classic Japanese print typography and editorial menu bookmaking. Titles should be typeset in sentence case or delicate title case, allowing serifs to breathe with relaxed vertical spacing.
- **Body & Controls (`Manrope`)**: A clean, balanced sans-serif optimized for reading ingredient origins, flavor profiles, and technical ordering parameters. 
- **Labels & Micro-copy**: Employs uppercase tracking on labels (`0.06em` to `0.1em`) to mimic minimalist culinary labels, wine vintages, and course numbers.

## Layout & Spacing

The layout philosophy embodies *ma* (negative space)—allowing each dish, course, or interaction to exist without visual crowding.

- **Grid Architecture**: Built upon a 12-column responsive grid on desktop with max-width constrained to `1280px` for intimacy. Mobile reflows to a single-column sequence with a `4-column` sub-grid for fast item selection.
- **Breakpoints**: Mobile (`< 640px`), Tablet (`641px - 1024px`), Desktop (`> 1025px`).
- **Rhythm**: Margins expand on larger displays (`margin-desktop: 3rem`) to frame menus like an unrolled scroll. Micro-elements like price tags and badges maintain strict `space-xs` and `space-sm` attachments to parent titles.

## Elevation & Depth

Depth is established through subtle tonal stacking and tactile dark-field boundaries, mimicking lacquered trays resting upon slate counters:

- **Canvas Base**: `#090D12` (Infinite deep void).
- **Surface Elevation 1 (Cards, Menu Items)**: `#111822` backed by a 1px border of `rgba(255, 253, 249, 0.07)`.
- **Surface Elevation 2 (Floating Trays, Modals, Drawers)**: `#1A2230` paired with an ambient tinted shadow: `0 16px 36px -8px rgba(0, 0, 0, 0.65), 0 0 1px 1px rgba(225, 29, 72, 0.15)`.
- **Specialty Focus (Omakase Hero Cards)**: Subtle crimson back-glow achieved via directional radial lighting (`radial-gradient(ellipse at top, rgba(225, 29, 72, 0.08), transparent 70%)`).
- **No Heavy Drop Shadows**: Standard shadows remain ultra-soft and deep black to prevent visual muddiness.

## Shapes

The geometry adheres to level `1` (Soft), reflecting the clean knife-edge lines of sashimi preparation:

- **Base Radius (`0.25rem` / `4px`)**: Buttons, tags, inputs, and small badges. Keeps edges defined, crisp, and surgical.
- **Card & Dialog Radius (`0.5rem` / `8px`)**: Menu item panels, imagery frames, and order summaries.
- **Exceptions**: Round circular buttons (`rounded-full`) are strictly restricted to utility icons (e.g., quantity selectors `+` / `-`, floating WhatsApp trigger).

## Components

### Buttons
- **Primary**: Solid crimson `#E11D48` background, `#FFFDF9` text, `0.25rem` radius. Subtle hover shift to `#F43F5E` with `0 4px 16px rgba(225, 29, 72, 0.3)`.
- **Secondary / Ghost**: Transparent fill, 1px border of `rgba(255, 253, 249, 0.15)`, `#FFFDF9` text. Hover shifts to `#111822` with border illumination to `#E11D48`.
- **Delivery Action (WhatsApp)**: Deep forest tint (`#0F291E`) with subtle emerald border (`#10B981`) and ivory typography, reserved exclusively for the instant direct-order trigger.

### Cards (Nigiri & Set Menus)
- Deep slate surface (`#111822`) with an ultra-thin perimeter hairline.
- Dish imagery is presented with high contrast, edge-to-edge top alignment, and no inner border radius.
- Omakase sets feature a small crimson origin tag in the top corner (e.g., "TOYOSU DIRECT").

### Chips & Course Selectors
- Pill-shaped or soft-rect chips. Inactive: `#111822` background with `#94A3B8` text. Active: `#FFFDF9` background with dark Sumi `#090D12` typography for crisp, confident state clarity.

### Inputs & Quantity Selectors
- Inset slate boxes (`#0D1117`) with hairline borders. Active focus brings a 1px `#E11D48` glow without thick outline rings.
- Counter controls (`+` / `-`) utilize minimalist circular nodes with delicate SVG glyphs.

### Order Summary & Delivery Status Drawer
- Bottom-docked sticky sheet for mobile; right-rail panel for desktop. Features real-time price tallies, time-slot selection with minimalist segmented controls, and a persistent crimson checkout trigger.