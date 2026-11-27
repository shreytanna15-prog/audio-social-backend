---
name: Studio Noir Atmosphere (Admin Web)
colors:
  surface: '#131319'
  surface-dim: '#131319'
  surface-bright: '#39383f'
  surface-container-lowest: '#0e0e14'
  surface-container-low: '#1b1b21'
  surface-container: '#1f1f25'
  surface-container-high: '#2a2930'
  surface-container-highest: '#34343b'
  on-surface: '#e4e1ea'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e4e1ea'
  inverse-on-surface: '#303036'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#ffb0cd'
  on-secondary: '#640039'
  secondary-container: '#aa0266'
  on-secondary-container: '#ffbad3'
  tertiary: '#ccbeff'
  on-tertiary: '#332664'
  tertiary-container: '#9587cc'
  on-tertiary-container: '#2c1f5c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  background: '#131319'
  on-background: '#e4e1ea'
  surface-variant: '#34343b'
typography:
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  section-title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  helper:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  table-header:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  mono-metric:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, monospace
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  full: 9999px
spacing:
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  sidebar-width: 15rem
  content-max: 72rem
---

# VibeOGram Admin - Studio Noir (Web)

Design tokens and layout rules for the **Next.js admin portal** in `audio-social-backend`.

**Colors match the mobile product** (Studio Noir). Layout, type, and components are adapted for **dense web admin** (sidebar, tables, forms), not the Expo listening/studio UI.

**Agents:** Read this file whenever designing or polishing admin UI. Also follow `AGENTS.md` craftsmanship rules and `.agents/skills/nextjs-admin-design-system/SKILL.md`.

Mobile app tokens remain in `../audio-social-app/DESIGN.md`. Do not copy mobile glass docks, waveforms, or mini-player patterns into admin.

---

## Implementation map (admin)

When wiring CSS / Tailwind for admin:

- Prefer CSS variables mapped from the frontmatter colors above
- Shared UI under `src/admin/components/ui/` and `src/admin/components/shared/`
- Pages under `src/app/admin/`

### Brand signal (same as mobile)

| Token | Hex | Admin use |
| --- | --- | --- |
| `brand` / CTA | `#8B5CF6` | Primary buttons, active sidebar, focus |
| `brand-deep` | `#7C3AED` | Pressed / gradient end on primary CTA |
| `lavender` | `#C4B5FD` / `#D0BCFF` | Soft chips, tonal accents |
| `magenta` | `#EC4899` | Rare highlight only (not default chrome) |
| `ink` | `#F8FAFC` / `#E4E1EA` | High-priority text |
| `slate` | `#94A3B8` / `#CBC3D7` | Secondary labels |
| Canvas | `#131319` / `#0E0E14` | Page and deepest ground |

Functional status (tables / contests / coins):

| Token | Hex | Use |
| --- | --- | --- |
| Success | `#10B981` | Active, granted, confirmed |
| Warning | `#F59E0B` | Pending, draft |
| Danger | `#EF4444` | Destructive, error |

---

## Brand & style (web)

- **Dense, calm, operational.** Admin is a tool, not a marketing or listening surface.
- **Restraint:** No blur orbs, fake telemetry, neon HUD chrome, or nested card stacks (see `AGENTS.md`).
- **Borders over heavy shadows.** Structure with 1px hairlines; soft shadow only on floating overlays (dialogs, popovers).
- **One accent family** (violet). Neutrals carry ~95% of the UI.

---

## Colors

Same Studio Noir palette as mobile. For admin:

- **Canvas:** `#131319` (page), `#0E0E14` (sidebar / deepest).
- **Panels:** `#1F1F25` / `#2A2930` for table shells and section surfaces.
- **Borders:** `rgba(255,255,255,0.08)` or `#494454` outline-variant.
- **Primary CTA:** solid or short gradient `#A078FF` → `#D0BCFF` (match tonal Button gradient used in product). Label: dark on-primary (`#3C0091`) or ink on solid brand (`#8B5CF6`) - pick one pattern and keep it consistent in the admin shell.
- **Do not** invent a second admin brand color (no Royal Blue).

---

## Typography (web)

Prefer **Inter** for almost all admin UI (tables, forms, nav). Reserve **Space Grotesk** only for rare brand moments on the login screen if needed - not for data tables.

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Page title | 20-24px | 600 | `tracking-tight` |
| Section title | 16-18px | 600 | |
| Body / controls | 14px | 400-500 | line-height 1.5 |
| Table header | 12px | 500 | uppercase, muted, wider tracking |
| Helper | 12px | 400 | muted |
| IDs / counts / dates | 12-13px | 500 | `font-mono tabular-nums` |

---

## Layout & spacing

Built on a **4px** base unit.

- **Shell:** Fixed sidebar (~240px) + main column. Top bar for admin account menu.
- **Content width:** Prefer readable max (~1152-1280px) for forms; tables may use full main width.
- **Page padding:** 24px (`space-xl`) desktop; 16px on narrow.
- **Stack rhythm:** 8px related fields; 16px inside cards; 24-32px between page sections.
- **Auth page:** Centered column `max-w-[360px]`, generous vertical whitespace.

Breakpoints (admin):

- Compact: collapse sidebar to icon rail or drawer below ~1024px.
- Default admin work happens at desktop widths; do not design mobile-first listening layouts here.

---

## Elevation & depth

| Level | Use | Treatment |
| --- | --- | --- |
| 0 | Page canvas | Solid `#131319` |
| 1 | Sidebar, table region | `#1B1B21` / `#1F1F25`, 1px border, no shadow |
| 2 | Dropdowns, popovers | `#2A2930`, light border, soft shadow |
| 3 | Modal / confirm | Centered dialog, dimmed backdrop, stronger shadow |

No glass mini-player docks. No ambient violet glow behind every card.

---

## Shapes

- Inputs, buttons, small controls: `rounded-md` / `rounded-lg` (8-12px).
- Cards / table wrappers: `rounded-lg`.
- Pills / status badges: `rounded-full`.
- Prefer `border-curve` continuous only if the stack supports it consistently on web.

---

## Components (admin)

### Buttons
- **Primary:** Brand / tonal gradient CTA, full or auto width as needed. Clear hover/disabled.
- **Secondary:** Quiet border or muted fill.
- **Destructive:** Error tokens; confirm via `ConfirmDialog`.

### Inputs
- Dark inset field, visible label, helper/error under field.
- Focus: primary border + thin ring (not a large glow blob).

### Tables
- Sticky header, muted uppercase labels.
- Row hover `muted/30`.
- Actions via shared `AppDropdown` (not ad-hoc icon clusters).
- Loading: `TableSkeleton` matching columns.

### Sidebar nav
- Quiet idle links; primary accent bar or text for active route.
- Group labels muted uppercase micro type.
- Disabled / coming-soon items visually muted (Coins, Contests, Subscriptions until wired).

### Dialogs
- Use shared `ConfirmDialog`. Short title, one sentence body, Cancel + Confirm.

### Toasts
- Sonner; success/error only for real outcomes. No decorative toasts.

---

## Copy

- Direct and operational (`Users`, `Grant coins`, `Confirm winners`).
- Page titles: `Section | VibeOGram Admin`.
- No emojis. No em dashes. No marketing filler on auth or empty states.
