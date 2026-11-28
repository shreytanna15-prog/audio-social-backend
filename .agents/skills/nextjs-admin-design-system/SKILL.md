---
name: nextjs-admin-design-system
description: >-
  Design system, visual polish, anti-AI-slop rules, layout blueprints, shared
  composites, and data-table UX for the VibeOGram Next.js admin portal in
  audio-social-backend (Tailwind + shadcn-style primitives).
---

# VibeOGram Admin Portal: Design System & UI Standards

Use this skill whenever building or changing **admin UI** in `audio-social-backend` (`src/app/admin/**`, `src/admin/**`).

**Not for:** mobile Expo app, public marketing pages, or `/api/**` route handlers.

**Design SSOT:** repo-root **`DESIGN.md`** (Studio Noir colors shared with mobile; web admin layout, type, and components). Read it before inventing spacing, type, or chrome.

**Related:** `nextjs-admin-api-patterns` (data layer), `docs/features/admin.md` (auth APIs), `docs/project-context.md`, `AGENTS.md` craftsmanship rules.

---

## 1. Zero tolerance for AI slop

1. **No glowing blur blobs** behind cards (`blur-[80px]` / `blur-[120px]` gradient orbs).
2. **No fake telemetry** (ungrounded charts, fake “LIVE” pulses, filler quotes).
3. **No box-inside-a-box** nesting. Prefer whitespace and type hierarchy.
4. **No decorative eyebrow badges** (“SECURE GATEWAY”, “PRIVILEGED ACCESS”).
5. **No generic boilerplate copy.** Keep labels short and operational.
6. **No pastel icon squares** used only as decoration.
7. **No emojis** in UI copy, code, or admin docs.
8. **UI copy:** avoid em dashes. Use `|` in document titles (e.g. `Users | VibeOGram Admin`), and `:`, `-`, commas, or parentheses in sentences.

---

## 2. Visual tokens (VibeOGram)

Align with product brand in **`DESIGN.md`** (Studio Noir / purple). Do not invent a second admin palette (no generic blue).

### Primary
- Use tokens from `DESIGN.md` (`#A078FF`, `#D0BCFF`, `#8B5CF6`) for CTAs / active nav / focus.
- Prefer **one** admin color mode for v1 (dark Studio Noir) and stick to it.
- Primary is for **CTAs, active sidebar, focus rings** only. Do not paint every chip primary.

### Surfaces & borders
- Prefer **1px borders** (`border border-border`) over heavy shadows.
- Canvas: `bg-background`
- Cards / panels: `bg-card`
- Hover / muted: `bg-muted/40`, `hover:bg-muted/50`
- Focus: `focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none`

### Status badges
- **Success / active:** `bg-emerald-500/10 text-emerald-600 border-emerald-500/20`
- **Pending / warning:** `bg-amber-500/10 text-amber-600 border-amber-500/20`
- **Neutral / archived:** `bg-muted text-muted-foreground border-border`
- **Destructive:** `bg-destructive/10 text-destructive border-destructive/20`

Map contest / coin / user states to these four families. Do not invent one-off badge palettes per page.

---

## 3. Page layout blueprints

### A. Auth utility (`/admin/login`)
- Centered column, max width ~360px (`w-full max-w-[360px] mx-auto`).
- Brand mark + “VibeOGram Admin”.
- Title “Sign in” + one short supporting line.
- Email + password (visibility toggle) + full-width primary submit.
- Optional local-only quick-fill for dev. No fake stats, no blur.

### B. App shell (all authenticated admin pages)

```text
+------------------+------------------------------------------+
| Sidebar (fixed)  | Top bar (admin menu)                     |
| Logo             +------------------------------------------+
| Nav groups       | Page title                               |
|                  +------------------------------------------+
|                  | Content (tables / forms)                 |
+------------------+------------------------------------------+
```

**v1 nav (enable as APIs exist):**
- Dashboard
- Users
- Coins (placeholder until coins APIs)
- Contests (placeholder until contest APIs)
- Subscriptions (disabled / coming soon)

---

## 4. Shadcn primitives + shared composites

Admin UI uses a **shadcn-style** stack with Studio Noir tokens from `DESIGN.md`.

### Rule
1. Prefer an existing **shared composite** under `src/admin/components/shared/`.
2. Shared composites sit on **ui primitives** under `src/admin/components/ui/`.
3. Feature pages import **shared + ui**. Do not assemble Radix pieces or native `<select>` / `datetime-local` ad hoc in feature forms.
4. **Missing control?** Install the dependency, add the `ui` primitive, add a shared wrapper when the API is multi-part or reused, then use it. Do not invent a parallel one-off control.
5. When touching older screens that still use native/ad-hoc controls, migrate them to the shared composite.

### Current / expected ui primitives
- `Button`, `Input`, `Textarea`, `Label`, `Select`, `Popover`, `Calendar`, `DropdownMenu`

### Current / expected shared composites
- `AppSelect` - enum / option lists (Placement, Payout, filters)
- `AppDateTimePicker` - schedule fields
- `AppDropdown` - table row / account menus (items config + trigger)
- `ConfirmDialog` - cancel / confirm / pending
- Table wrappers / filter bars when reused twice

### Forms
- Readable max width (`max-w-5xl`), card surface, section headings.
- Full width for long text / chips; 2-col for short paired fields.
- Clickable chips: `cursor-pointer` + `disabled:cursor-not-allowed`.

---

## 5. Data tables

1. Sticky header: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
2. Row hover: `hover:bg-muted/30 transition-colors`; pointer when row is navigable
3. Actions column (right): `MoreHorizontal` via `AppDropdown` (View / Edit / destructive actions as product allows)
4. Counts, dates, IDs: `font-mono tabular-nums`
5. **Skeleton-first loading:** never a centered full-page spinner for lists. Use `TableSkeleton` matching column layout.

---

## 6. Accessibility & feedback

1. Visible focus rings on controls.
2. Mutations: toast via Sonner (`toast.success` / `toast.error`).
3. Short transitions: `transition-colors duration-150` (avoid noisy `transition-all` everywhere).

---

## 7. Folder ownership (UI)

```text
src/app/admin/                 # Next.js routes (login + shell pages)
src/admin/components/ui/       # Primitives
src/admin/components/shared/   # Composites
src/admin/components/layout/   # Sidebar, top bar, page header
```

Do not put admin UI under `src/server/` or Expo `audio-social-app`.
