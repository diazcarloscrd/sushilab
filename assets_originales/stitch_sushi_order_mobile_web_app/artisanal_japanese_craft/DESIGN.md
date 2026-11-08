---
name: Artisanal Japanese Craft
colors:
  surface: '#fff8f6'
  surface-dim: '#e2d8d6'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf1ef'
  surface-container: '#f6ecea'
  surface-container-high: '#f0e6e4'
  surface-container-highest: '#eae0de'
  on-surface: '#1f1b1a'
  on-surface-variant: '#5a413d'
  inverse-surface: '#352f2e'
  inverse-on-surface: '#f9eeec'
  outline: '#8e706b'
  outline-variant: '#e2beb9'
  surface-tint: '#b22a1d'
  primary: '#a62216'
  on-primary: '#ffffff'
  primary-container: '#c93b2b'
  on-primary-container: '#ffefed'
  inverse-primary: '#ffb4a8'
  secondary: '#755a2a'
  on-secondary: '#ffffff'
  secondary-container: '#fdd79c'
  on-secondary-container: '#785c2c'
  tertiary: '#3d5d43'
  on-tertiary: '#ffffff'
  tertiary-container: '#55765a'
  on-tertiary-container: '#d6fcd9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a8'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#900e07'
  secondary-fixed: '#ffdeaa'
  secondary-fixed-dim: '#e5c187'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5b4314'
  tertiary-fixed: '#c7ecca'
  tertiary-fixed-dim: '#abd0af'
  on-tertiary-fixed: '#02210c'
  on-tertiary-fixed-variant: '#2e4e35'
  background: '#fff8f6'
  on-background: '#1f1b1a'
  surface-variant: '#eae0de'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system channels the warmth, mastery, and intimate hospitality of traditional Japanese gastronomy, translated into a modern mobile e-commerce ordering experience. Inspired by traditional woodblock illustrations, lantern-lit sushi counters, and paper parchment textures, the aesthetic evokes the quiet pride of master shokunin chefs. 

The design combines tactile minimalism with refined, warm materiality:
- **Atmospheric Warmth**: Soft washi-paper backgrounds replace stark digital whites, creating a welcoming, lantern-lit dining mood.
- **Craft & Contrast**: Vermilion red accents (`#C93B2B`) evoke lacquered bento boxes, temple torii, and fresh akami tuna, serving as focused focal points for critical conversion actions.
- **Approachable Modernity**: Clean geometric sans-serif typography pairs with rounded card surfaces and pill-form tags to keep digital interactions fluid, fast, and tactile on handheld screens.

## Colors

The palette balances traditional Japanese natural pigments with clean UI contrast requirements:

- **Primary (`#C93B2B`)**: Shushoku vermilion. Used strictly for core conversion buttons, promotional price accents, order status highlights, and interactive callouts.
- **Secondary (`#8A6D3B`)**: Toasted cedar and aged bamboo. Used for category navigation indicators, chef notes, star ratings, and artisanal badging.
- **Tertiary (`#3A5A40`)**: Muted wasabi and nori pine. Used for vegetarian/dietary indicators, freshness guarantees, and success states.
- **Neutral Surface & Text (`#2B2625`)**: Sumi ink charcoal. Replaces harsh `#000000` to deliver soft, legible reading on cream parchment.
  - Background Base: `#FBF8F2` (Unbleached Mulberry Washi)
  - Surface Card: `#FFFFFF` (Clean porcelain dish surface)
  - Surface Muted: `#F3EDE2` (Aged Hinoki wood tint)
  - Border Subdued: `#E8DEC8` (Thin bamboo reed dividing lines)

## Typography

The type scale marries the geometric warmth of **Plus Jakarta Sans** for headlines and interactive elements with the understated legibility of **DM Sans** for descriptive copy and ingredients lists.

- Headings preserve tight, commanding letter tracking (`-0.02em`) to highlight Japanese dish titles and tasting notes cleanly on compact phone viewports.
- Body copy uses generous line heights to ensure multi-line ingredient disclosures, preparation notes, and allergen notices remain effortless to read.
- Labels leverage uppercase tracking (`+0.05em`) in compact sizes (`label-sm`) for dietary tags like "GF", "OMAKASE", and "WILD-CAUGHT".

## Layout & Spacing

Designed mobile-first with an emphasis on single-thumb ergonomics:

- **Mobile Viewport (360px – 480px)**: 4-column layout with 16px (`1rem`) outer margins and 12px gaps. Touch targets adhere strictly to a 48px minimum height. Menus utilize horizontal chip-rail categories and full-bleed card lists.
- **Tablet / Large Mobile (481px – 768px)**: 8-column layout with 24px margins, reflowing menu cards into a balanced two-column staggered grid.
- **Desktop Adaptation (769px+)**: Fixed central container (max-width 1180px) flanked by parchment borders, with the ordering drawer pinning securely to the right-hand side.
- Spacing rhythm follows an 8pt base grid for structural layout (`space-md`, `space-lg`, `space-xl`) and a 4pt sub-grid for badge insets and micro-alignments (`space-xs`, `space-sm`).

## Elevation & Depth

Visual depth mirrors the tactile layering of Japanese lacquer trays, washi dividers, and stone slate platters:

- **Layer 0 (Canvas)**: Warm textured unbleached washi background (`#FBF8F2`), completely flat.
- **Layer 1 (Cards & Trays)**: Crisp porcelain containers (`#FFFFFF`) framed by an ultra-subtle border (`1px solid #E8DEC8`) paired with an ambient tinted shadow (`0 2px 8px -2px rgba(43, 38, 37, 0.06)`).
- **Layer 2 (Overlays & Active Chips)**: Slight lift (`0 4px 16px -4px rgba(43, 38, 37, 0.10)`) indicating selected filters, quantity steppers, or expanded product modals.
- **Layer 3 (Floating Order Bar)**: High-prominence bottom navigation float (`0 12px 32px -6px rgba(43, 38, 37, 0.18)`), incorporating a subtle frosted parchment backdrop blur (`backdrop-filter: blur(12px)`) to anchor the active cart summary above flowing menu items.

## Shapes

The design system establishes a soft, approachable structural geometry governed by `roundedness: 2`:

- Standard components (buttons, input fields, menu cards) utilize `0.5rem` (8px) corner radii.
- Larger sheet containers and hero feature banners use `1rem` (16px) corner radii.
- Badges, category pill filters, quantity counters, and the floating bottom action bar leverage fully rounded stadium/pill contours (`9999px`) to maintain a friendly, handheld-friendly aesthetic.

## Components

### Buttons
- **Primary**: Solid Vermilion (`#C93B2B`) fill, pure white text, bold `Plus Jakarta Sans` typography. Includes subtle active press micro-scale (`transform: scale(0.98)`).
- **Secondary**: Clear background, Sumi charcoal text, framed with a 1.5px border (`#8A6D3B` or `#E8DEC8`).
- **Floating Cart Button**: Elevated pill bar fixed to viewport bottom (16px bottom margin), vermilion right-hand checkout CTA paired with dark Sumi ink running cart subtotal.

### Chips & Filters
- **Category Nav Rail**: Horizontal scrolling pill tabs. Inactive: `#F3EDE2` background, Sumi ink label. Active: `#2B2625` fill with crisp white text.
- **Dietary Badges**: Small rounded-full badges with subtle tints (e.g., Wasabi green `#3A5A40` with 10% opacity background).

### Cards
- **Menu Item Card**: Clean white canvas, 8px radius, subtle perimeter hairline (`#E8DEC8`). Horizontal arrangement on mobile with a square 88x88px photography frame on the right and title, provenance note, price, and vermilion `+` add button on the left.

### Inputs & Selection Controls
- **Search & Special Instructions**: Washi-tinted fill (`#F3EDE2`), zero border until focused, transitioning to a sharp 1.5px Vermilion outline with no fuzzy glow.
- **Quantity Stepper**: Pill-shaped capsule featuring Sumi ink counters and circular vermilion micro-buttons for immediate touch feedback.