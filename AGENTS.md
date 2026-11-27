# VibeOGram backend (`audio-social-backend`)

Before changing APIs, Prisma, or OpenAPI in this repo:

1. Read **`docs/project-context.md`** (product + cross-repo map).
2. Read the relevant feature guide under **`docs/features/`** (if any).
3. Follow **`.agents/skills/audio-backend-api-patterns/SKILL.md`** (this repo's API coding SSOT).
4. Use supporting skills only as secondary: `route-handlers`, `prisma-cli`, `prisma-client-api`.
5. Trust **`prisma/schema.prisma`** - do not invent models.

### Admin portal UI (same Next.js repo)

When changing **`/admin` pages** or **`src/admin/**`** (not `/api/admin`):

1. Read **`DESIGN.md`** (admin web design tokens + layout; same colors as mobile, web structure).
2. Read **`docs/features/admin-panel.md`** (portal screens + admin users/metrics APIs) and **`docs/features/admin.md`** (auth foundation).
3. Follow **`.agents/skills/nextjs-admin-design-system/SKILL.md`** for layout/UI patterns.
4. Follow **`.agents/skills/nextjs-admin-api-patterns/SKILL.md`** for client data layer (React Query, registries, session).
5. Do **not** apply Expo app skills or invent admin Prisma models from the UI layer.
6. Follow **Project rules & craftsmanship** below on every admin UI turn.

Sibling app: `../audio-social-app` (Expo). Skills live under **`.agents/skills/`** only.

---

## Project rules & craftsmanship

These rules apply to agents in this repository. Prefer them for **admin UI** and any Next.js pages in this repo. API modules still follow `audio-backend-api-patterns`.

### 1. Zero tolerance for AI slop

1. **No glowing blur blobs** (`blur-[80px]` / `blur-[120px]` gradient discs behind cards or forms).
2. **No fake telemetry** (ungrounded charts, fake streaks, pulsing "LIVE" dots, filler quotes).
3. **No box-inside-a-box**: do not wrap every label or metric in its own card. Use whitespace and type scale.
4. **No gratuitous eyebrow badges** ("PRIVILEGED ACCESS", "SECURE GATEWAY") unless it is a real system status pill.
5. **No generic placeholder copy** (e.g. "Welcome back! Enter your details below to continue."). Use direct, functional copy.
6. **No pastel icon squares** used only as decoration.
7. **No emojis** in code, UI copy, comments, documentation, or skill files.
8. **No em dashes** (U+2014) in UI copy, page titles, comments, or documentation. Use `|` in titles (e.g. `Users | VibeOGram Admin`) and `:`, `-`, commas, or parentheses elsewhere.

### 2. Craftsmanship (admin / Next UI)

Aim for calm B2B density (Linear / Supabase / Vercel / Stripe), with VibeOGram purple as the single accent.

**Surfaces**
- Borders over heavy shadows: crisp 1px `border border-border`.
- Canvas `bg-background`, card `bg-card`, hover `hover:bg-muted/40`, focus `ring-1 ring-primary`.

**Type & space**
- Prefer whitespace over clutter.
- Page title: `text-xl` / `text-2xl`, semibold, `tracking-tight`.
- Section: `text-base` / `text-lg`, semibold.
- Body: `text-sm`, line-height ~1.5.
- Helper: `text-xs`, muted.
- Counts / dates / IDs: `font-mono tabular-nums`.

**Color**
- ~95% neutral UI.
- Primary accent (`#A078FF` / `#D0BCFF` family) only for primary CTAs, active nav, and focus rings.

**Utility honesty**
- Every screen serves one job. Auth pages: brand, inputs, clear primary action. No marketing chrome.

### 3. Composites over raw primitives

- Do not assemble low-level menu/dialog pieces in every page.
- Prefer shared wrappers under `src/admin/components/shared/` (`AppDropdown`, `ConfirmDialog`, table shells, etc.).
- New multi-part patterns: build the shared wrapper first, then use it in features.

### 4. Engineering rules (admin client)

- Forms: React Hook Form + Zod, clear field errors.
- Data: TanStack Query with `QUERY_REGISTRY` / `MUTATION_REGISTRY` (see `nextjs-admin-api-patterns`).
- Loading: skeleton shapes that match the loaded UI. No full-screen blocking spinners for lists.
- Git: never run git commands unless the user explicitly asks.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
