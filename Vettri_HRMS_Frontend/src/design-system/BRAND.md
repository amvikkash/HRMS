# Vettri HRMS Brand Identity

Quick reference for the public-facing brand. The in-app product design system
lives in `tokens.css`; this file documents how those same tokens extend into
marketing surfaces (landing page, careers pages, favicon).

## Logo

`src/components/brand/Logo.jsx` is the single source of truth - never hardcode
an ad-hoc badge again. The mark combines a blue V, orange growth sweep, and
people motif from the official Vettri HRMS identity.

- `<Logo />` - full lockup (mark + wordmark), color, for light backgrounds.
- `<Logo tone="onDark" />` - for the indigo gradient hero / login panel.
- `<Logo variant="mark" size={32} />` - icon-only, e.g. sidebar, favicon.
- `<Logo tagline="Careers" />` - wordmark with a small suffix label.

Static exports for places that can't render React: `public/favicon.svg`,
`public/logo-mark-white.svg`.

## Color

Brand colors are defined once in `tokens.css` and reused everywhere:

| Role | Token | Hex |
|---|---|---|
| Primary blue | `--hz-primary-500` | `#087FE8` |
| Deep navy | `--hz-primary-700` | `#0B3B91` |
| Accent orange | `--hz-accent-500` | `#FF8A00` |
| Golden accent | static mark accent | `#FFB000` |
| Ink | `--hz-text-primary` | `#172033` |
| Canvas | `--hz-gray-50` | `#F5F8FC` |

The signature gradient (`--hz-primary-500` → `--hz-primary-700` →
`--hz-accent-600`) is used sparingly, for high-impact surfaces only: the hero
section, the login brand panel, and the logo mark itself. Everywhere else
stays on the quiet neutral palette so the gradient keeps its impact.

## Typography

- **Display** (`--hz-font-display`, defined in `landing.css`): *Space
  Grotesk* - used only for large marketing headlines (hero, section titles).
  Chosen for a technical, structured character that fits a workforce
  platform without tipping into a generic "startup" look.
- **Body / UI** (`--hz-font-sans`): *Inter* - every paragraph, label, nav
  item, and the entire authenticated product.

Both are loaded via the `@import` at the top of `landing.css`. If the app
later adds a build-time font pipeline, swap that `@import` for self-hosted
files - nothing else needs to change.

## Iconography

Lucide icons only (`lucide-react`), 1.5-2px stroke, no filled icons. This
keeps the marketing site visually identical to the authenticated product
instead of importing a second icon set just for marketing pages.

## Voice

Direct, specific, no hype adjectives ("revolutionary", "game-changing").
Describe what the product does for the person using it, the same register
already established on the login screen's brand panel.
